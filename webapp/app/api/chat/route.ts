import { NextRequest, NextResponse } from "next/server";
import { getMcpTools, executeMcpTool, OllamaTool } from "@/lib/mcp-manager";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3:270M";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ??
  "You are PurchAI, an AI-powered shopping assistant. Help users find products, compare prices, and make informed purchasing decisions. Be concise, helpful, and friendly.";

const MAX_TOOL_ROUNDS = 5;

export const runtime = "nodejs";

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  thinking?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface AccumulatedToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface OllamaStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      thinking?: string;
      reasoning?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

function sse(data: object | string): Uint8Array {
  const encoder = new TextEncoder();
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`data: ${payload}\n\n`);
}

export async function POST(request: NextRequest) {
  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  let tools: OllamaTool[] = [];
  try {
    tools = await getMcpTools();
  } catch (err) {
    console.error("[Chat Route] Could not reach MCP tools server:", err);
  }

  const ollamaMessages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as OllamaMessage["role"],
      content: m.content,
    })),
  ];

  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        await agenticLoop(ollamaMessages, tools, controller, encoder, 0);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("[Chat Route] Fatal error:", err);
        controller.enqueue(
          sse({ type: "text", content: `\n\n**Error:** ${msg}` })
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function agenticLoop(
  messages: OllamaMessage[],
  tools: OllamaTool[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  depth: number
): Promise<void> {
  const useTools = tools.length > 0 && depth < MAX_TOOL_ROUNDS;

  const requestBody: Record<string, unknown> = {
    model: OLLAMA_MODEL,
    messages,
    stream: true,
    think: true,
  };
  if (useTools) {
    requestBody.tools = tools;
  }

  // Manual tool calling fallback for models without native tool support
  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.role === "user" && typeof lastUserMsg.content === "string") {
    const toolMatch = lastUserMsg.content.match(/use the (\w+) tool/i);
    if (toolMatch && tools.length > 0) {
      const toolName = toolMatch[1];
      const tool = tools.find((t) => t.function.name === toolName);
      if (tool) {
        // Extract demo arguments based on tool type
        let args: Record<string, unknown> = {};
        if (toolName === "calculator") {
          args = { operation: "add", a: 10, b: 20 };
        } else if (toolName === "random_number") {
          args = { min: 1, max: 100 };
        }

        const tcId = `call_${Date.now()}`;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "tool_call",
              id: tcId,
              name: toolName,
              arguments: args,
            })}\n\n`
          )
        );

        try {
          const result = await executeMcpTool(toolName, args);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "tool_result",
                id: tcId,
                result: result.text,
                isError: result.isError,
              })}\n\n`
            )
          );

          // Stream a response explaining the result
          const responseText = `I used the ${toolName} tool for you. The result is: ${result.text}`;
          for (const char of responseText) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: char })}\n\n`
              )
            );
          }
          return;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Tool execution failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "tool_result",
                id: tcId,
                result: errMsg,
                isError: true,
              })}\n\n`
            )
          );
          return;
        }
      }
    }
  }

  const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!ollamaResponse.ok) {
    const errorText = await ollamaResponse.text();
    throw new Error(`Ollama returned ${ollamaResponse.status}: ${errorText}`);
  }

  const reader = ollamaResponse.body?.getReader();
  if (!reader) {
    throw new Error("Ollama response has no body");
  }

  const decoder = new TextDecoder();
  const pendingToolCalls = new Map<number, AccumulatedToolCall>();
  let accumulatedText = "";
  let accumulatedThinking = "";
  let currentThinkingId = "";
  let finishReason: string | null = null;

  outerRead: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break outerRead;

      let parsed: OllamaStreamChunk;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      const choice = parsed.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;

      // Handle both 'thinking' (standard) and 'reasoning' (qwen3.5) fields
      const thinkingContent = delta?.thinking || delta?.reasoning;
      if (thinkingContent) {
        // Start new thinking block if not already in one
        if (!currentThinkingId) {
          currentThinkingId = `think_${Date.now()}`;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "thinking", id: currentThinkingId, content: thinkingContent, status: "pending" })}\n\n`
            )
          );
        } else {
          // Append to existing thinking block
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "thinking_append", id: currentThinkingId, content: thinkingContent })}\n\n`
            )
          );
        }
        console.log("[Chat Route] Thinking chunk:", thinkingContent);
        accumulatedThinking += thinkingContent;
      }

      if (delta?.content) {
        // End current thinking block when content starts
        if (currentThinkingId) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "thinking_complete", id: currentThinkingId })}\n\n`
            )
          );
          currentThinkingId = "";
        }
        accumulatedText += delta.content;

        // Check for product_id JSON format
        const productMatch = accumulatedText.match(/\{"product_id":\s*"([^"]+)"\}/);
        if (productMatch) {
          const productId = productMatch[1];
          // Remove the JSON from accumulated text so it doesn't display as text
          accumulatedText = accumulatedText.replace(productMatch[0], "");
          
          // Fetch product details from UCP server
          try {
            const productResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/ucp/catalog/search`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: productId }),
            });
            const productData = await productResponse.json();
            const product = productData.results?.find((p: any) => p.id === productId);
            
            if (product) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "product_card",
                    productId: product.id,
                    title: product.title,
                    price: product.price,
                    description: product.description?.plain,
                    imageUrl: product.image_url
                  })}\n\n`
                )
              );
            }
          } catch (error) {
            console.error("[Chat Route] Failed to fetch product details:", error);
            // Fallback: send product card with just ID
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "product_card",
                  productId: productId
                })}\n\n`
              )
            );
          }
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`
            )
          );
        }
      }

      if (delta?.tool_calls) {
        // End current thinking block when tool calls start
        if (currentThinkingId) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "thinking_complete", id: currentThinkingId })}\n\n`
            )
          );
          currentThinkingId = "";
        }
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index;
          const existing = pendingToolCalls.get(idx);
          if (!existing) {
            pendingToolCalls.set(idx, {
              id: tcDelta.id ?? `call_${Date.now()}_${idx}`,
              function: {
                name: tcDelta.function?.name ?? "",
                arguments: tcDelta.function?.arguments ?? "",
              },
            });
          } else {
            if (tcDelta.id) existing.id = tcDelta.id;
            if (tcDelta.function?.name)
              existing.function.name += tcDelta.function.name;
            if (tcDelta.function?.arguments)
              existing.function.arguments += tcDelta.function.arguments;
          }
        }
      }

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
  }

  if (finishReason === "tool_calls" && pendingToolCalls.size > 0) {
    const toolCalls = Array.from(pendingToolCalls.entries())
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc);

    const toolResults: Array<{ id: string; text: string; isError: boolean }> =
      [];

    for (const tc of toolCalls) {
      let parsedArgs: Record<string, unknown>;
      try {
        parsedArgs = JSON.parse(tc.function.arguments);
      } catch {
        parsedArgs = {};
      }

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "tool_call",
            id: tc.id,
            name: tc.function.name,
            arguments: parsedArgs,
          })}\n\n`
        )
      );

      try {
        const result = await executeMcpTool(tc.function.name, parsedArgs);
        toolResults.push({ id: tc.id, text: result.text, isError: result.isError });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "tool_result",
              id: tc.id,
              result: result.text,
              isError: result.isError,
            })}\n\n`
          )
        );
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Tool execution failed";
        toolResults.push({ id: tc.id, text: errMsg, isError: true });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "tool_result",
              id: tc.id,
              result: errMsg,
              isError: true,
            })}\n\n`
          )
        );
      }
    }

    const assistantMsg: OllamaMessage = {
      role: "assistant",
      content: accumulatedText || null,
      thinking: accumulatedThinking || undefined,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };

    const toolResultMsgs: OllamaMessage[] = toolResults.map((tr) => ({
      role: "tool" as const,
      content: tr.text,
      tool_call_id: tr.id,
    }));

    await agenticLoop(
      [...messages, assistantMsg, ...toolResultMsgs],
      tools,
      controller,
      encoder,
      depth + 1
    );
  }
}
