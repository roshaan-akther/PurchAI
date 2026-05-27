import { createServer } from "https";
import { IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { McpServer } from "./sdk/server.js";
import { HttpTransport } from "./sdk/http-transport.js";

// Import tools
import { calculatorTool, handleCalculator } from "./tools/calculator.js";
import { randomNumberTool, handleRandomNumber } from "./tools/random-number.js";

// Import resources
import { greetingResource, handleGreeting } from "./resources/greeting.js";

// Import prompts
import { systemInstructionPrompt, handleSystemInstruction } from "./prompts/system-instruction.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3051;

// Load SSL certificates
const options = {
  key: readFileSync("./key.pem"),
  cert: readFileSync("./cert.pem"),
};

// Create MCP server
const mcpServer = new McpServer({
  name: "mcp-test-server",
  version: "1.0.0",
});

// Register tools
mcpServer.registerTool("calculator", calculatorTool, handleCalculator);
mcpServer.registerTool("random_number", randomNumberTool, handleRandomNumber);

// Register resources
mcpServer.registerResource("greeting://welcome", greetingResource, handleGreeting);

// Register prompts
mcpServer.registerPrompt("system_instruction", systemInstructionPrompt, handleSystemInstruction);

// Create HTTP transport
const httpTransport = new HttpTransport(mcpServer);

// Create HTTPS server
const server = createServer(options, async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "";
  console.log("[HTTP Server] Request:", req.method, url);
  
  // Handle domain verification file requests BEFORE MCP transport
  if (req.method === "GET" && (url.includes("voidnet-site-verification"))) {
    console.log("[HTTP Server] Serving verification file for:", url);
    const fileName = url.split("/").pop();
    const filePath = `./${fileName}`;
    console.log("[HTTP Server] File path:", filePath);
    console.log("[HTTP Server] File exists:", existsSync(filePath));
    
    if (existsSync(filePath)) {
      const fileContent = readFileSync(filePath, "utf-8");
      console.log("[HTTP Server] File content:", fileContent);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fileContent);
      return;
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
  }
  
  // Handle MCP requests
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const jsonBody = JSON.parse(body);
        await httpTransport.handleRequest(req, res, jsonBody);
      } catch (error) {
        console.error("[HTTP Server] Error parsing JSON body:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error",
            },
          })
        );
      }
    });
  } else {
    console.log("[HTTP Server] Passing to MCP transport:", req.method, url);
    await httpTransport.handleRequest(req, res, null);
  }
});

// Start server
server.listen(PORT, "127.0.0.1", () => {
  console.error(`[MCP Test Server] Running on https://127.0.0.1:${PORT}`);
  console.error(`[MCP Test Server] MCP endpoint: https://127.0.0.1:${PORT}/mcp`);
  console.error(`[MCP Test Server] Registered tools: calculator, random_number`);
  console.error(`[MCP Test Server] Registered resources: greeting://welcome`);
  console.error(`[MCP Test Server] Registered prompts: system_instruction`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.error("[MCP Test Server] SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.error("[MCP Test Server] Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.error("[MCP Test Server] SIGINT received, shutting down gracefully");
  server.close(() => {
    console.error("[MCP Test Server] Server closed");
    process.exit(0);
  });
});
