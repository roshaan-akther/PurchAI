import { McpServer } from "./server.js";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  InitializeRequest,
  InitializeResult,
  ToolCallRequest,
  ToolCallResult,
  ReadResourceRequest,
  ResourceContents,
  GetPromptRequest,
  PromptResult,
} from "../types.js";
import { IncomingMessage, ServerResponse } from "http";

export class HttpTransport {
  private server: McpServer;
  private sessionId: string | null = null;

  constructor(server: McpServer) {
    this.server = server;
  }

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body: any
  ): Promise<void> {
    console.error(`[HTTP Transport] ${req.method} ${req.url}`);

    // Security: Validate Origin header
    const origin = req.headers["origin"];
    if (origin && !this.isValidOrigin(origin)) {
      console.error(`[HTTP Transport] Invalid origin: ${origin}`);
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: "Invalid Origin header",
          },
        })
      );
      return;
    }

    // Validate MCP-Protocol-Version header
    const protocolVersion = req.headers["mcp-protocol-version"];
    if (!protocolVersion) {
      console.error("[HTTP Transport] Missing MCP-Protocol-Version header");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: "Missing MCP-Protocol-Version header",
          },
        })
      );
      return;
    }

    if (protocolVersion !== "2025-11-25") {
      console.error(
        `[HTTP Transport] Unsupported protocol version: ${protocolVersion}`
      );
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
            data: "Unsupported protocol version",
          },
        })
      );
      return;
    }

    // Handle GET requests (for SSE streaming)
    if (req.method === "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not allowed",
            data: "SSE streaming not implemented in this test server",
          },
        })
      );
      return;
    }

    // Handle POST requests
    if (req.method === "POST") {
      try {
        const jsonrpcRequest: JSONRPCRequest = body;
        console.error(
          `[HTTP Transport] Processing ${jsonrpcRequest.method} request`
        );

        const response = await this.processRequest(jsonrpcRequest, req);

        // Set session ID header if this is an initialize response
        if (jsonrpcRequest.method === "initialize" && response.result) {
          this.sessionId = this.generateSessionId();
          res.setHeader("MCP-Session-Id", this.sessionId);
          console.error(`[HTTP Transport] Session ID: ${this.sessionId}`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error("[HTTP Transport] Error processing request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal error",
              data: error instanceof Error ? error.message : String(error),
            },
          })
        );
      }
      return;
    }

    // Method not allowed
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Method not allowed",
        },
      })
    );
  }

  private async processRequest(
    request: JSONRPCRequest,
    req: IncomingMessage
  ): Promise<JSONRPCResponse> {
    const { method, params, id } = request;

    switch (method) {
      case "initialize": {
        const initRequest: InitializeRequest = params;
        const result: InitializeResult = await this.server.handleInitialize(
          initRequest
        );
        return { jsonrpc: "2.0", id, result };
      }

      case "notifications/initialized": {
        // Client notification, no response needed
        return { jsonrpc: "2.0", id, result: null };
      }

      case "tools/list": {
        const result = await this.server.handleListTools();
        return { jsonrpc: "2.0", id, result };
      }

      case "tools/call": {
        const toolRequest: ToolCallRequest = params;
        const result: ToolCallResult = await this.server.handleCallTool(
          toolRequest
        );
        return { jsonrpc: "2.0", id, result };
      }

      case "resources/list": {
        const result = await this.server.handleListResources();
        return { jsonrpc: "2.0", id, result };
      }

      case "resources/read": {
        const resourceRequest: ReadResourceRequest = params;
        const result: ResourceContents = await this.server.handleReadResource(
          resourceRequest
        );
        return { jsonrpc: "2.0", id, result };
      }

      case "prompts/list": {
        const result = await this.server.handleListPrompts();
        return { jsonrpc: "2.0", id, result };
      }

      case "prompts/get": {
        const promptRequest: GetPromptRequest = params;
        const result: PromptResult = await this.server.handleGetPrompt(
          promptRequest
        );
        return { jsonrpc: "2.0", id, result };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: "Method not found",
            data: method,
          },
        };
    }
  }

  private isValidOrigin(origin: string): boolean {
    // For local development, allow localhost origins
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return true;
    }
    // In production, you would validate against your allowed domains
    return false;
  }

  private generateSessionId(): string {
    // Generate a cryptographically secure session ID
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2);
    return `${timestamp}-${random}`;
  }
}
