import { Prompt, PromptResult, PromptMessage } from "../types.js";

export const systemInstructionPrompt: Prompt = {
  name: "system_instruction",
  description: "A system instruction prompt for the AI assistant",
  arguments: [
    {
      name: "context",
      description: "Additional context for the system instruction",
      required: false,
    },
  ],
};

export async function handleSystemInstruction(
  args: Record<string, any>
): Promise<PromptResult> {
  const { context } = args;

  console.error(`[System Instruction] Context: ${context || "none"}`);

  const baseInstruction =
    "You are a helpful AI assistant with access to tools for calculations and random number generation. You can also access a greeting resource. Use these tools when appropriate to assist the user.";

  const fullInstruction = context
    ? `${baseInstruction}\n\nAdditional context: ${context}`
    : baseInstruction;

  const messages: PromptMessage[] = [
    {
      role: "system",
      content: {
        type: "text",
        text: fullInstruction,
      },
    },
  ];

  return { messages };
}
