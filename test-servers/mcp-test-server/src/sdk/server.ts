import {
  InitializeRequest,
  InitializeResult,
  Tool,
  ToolCallRequest,
  ToolCallResult,
  Resource,
  ResourceContents,
  ReadResourceRequest,
  Prompt,
  PromptMessage,
  GetPromptRequest,
  PromptResult,
  ListToolsResult,
  ListResourcesResult,
  ListPromptsResult,
  ServerCapabilities,
} from "../types.js";

export class McpServer {
  private name: string;
  private version: string;
  private tools: Map<string, { definition: Tool; handler: ToolHandlerFn }>;
  private resources: Map<string, { definition: Resource; handler: ResourceHandlerFn }>;
  private prompts: Map<string, { definition: Prompt; handler: PromptHandlerFn }>;
  private initialized: boolean = false;

  constructor(config: { name: string; version: string }) {
    this.name = config.name;
    this.version = config.version;
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
  }

  registerTool(
    name: string,
    definition: Tool,
    handler: ToolHandlerFn
  ): void {
    console.error(`[MCP Server] Registering tool: ${name}`);
    this.tools.set(name, { definition, handler });
  }

  registerResource(
    uri: string,
    definition: Resource,
    handler: ResourceHandlerFn
  ): void {
    console.error(`[MCP Server] Registering resource: ${uri}`);
    this.resources.set(uri, { definition, handler });
  }

  registerPrompt(
    name: string,
    definition: Prompt,
    handler: PromptHandlerFn
  ): void {
    console.error(`[MCP Server] Registering prompt: ${name}`);
    this.prompts.set(name, { definition, handler });
  }

  async handleInitialize(request: InitializeRequest): Promise<InitializeResult> {
    console.error("[MCP Server] Handling initialize request");
    this.initialized = true;

    const capabilities: ServerCapabilities = {
      tools: {
        listChanged: false,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
      prompts: {},
    };

    return {
      protocolVersion: "2025-11-25",
      capabilities,
      serverInfo: {
        name: this.name,
        version: this.version,
      },
    };
  }

  async handleListTools(): Promise<ListToolsResult> {
    console.error("[MCP Server] Handling list tools request");
    const tools: Tool[] = [];
    for (const [_, { definition }] of this.tools) {
      tools.push(definition);
    }
    return { tools };
  }

  async handleCallTool(request: ToolCallRequest): Promise<ToolCallResult> {
    console.error(`[MCP Server] Handling call tool: ${request.name}`);
    const tool = this.tools.get(request.name);
    if (!tool) {
      throw new Error(`Tool not found: ${request.name}`);
    }
    return await tool.handler(request.arguments || {});
  }

  async handleListResources(): Promise<ListResourcesResult> {
    console.error("[MCP Server] Handling list resources request");
    const resources: Resource[] = [];
    for (const [_, { definition }] of this.resources) {
      resources.push(definition);
    }
    return { resources };
  }

  async handleReadResource(request: ReadResourceRequest): Promise<ResourceContents> {
    console.error(`[MCP Server] Handling read resource: ${request.uri}`);
    const resource = this.resources.get(request.uri);
    if (!resource) {
      throw new Error(`Resource not found: ${request.uri}`);
    }
    return await resource.handler();
  }

  async handleListPrompts(): Promise<ListPromptsResult> {
    console.error("[MCP Server] Handling list prompts request");
    const prompts: Prompt[] = [];
    for (const [_, { definition }] of this.prompts) {
      prompts.push(definition);
    }
    return { prompts };
  }

  async handleGetPrompt(request: GetPromptRequest): Promise<PromptResult> {
    console.error(`[MCP Server] Handling get prompt: ${request.name}`);
    const prompt = this.prompts.get(request.name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${request.name}`);
    }
    return await prompt.handler(request.arguments || {});
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export type ToolHandlerFn = (args: Record<string, any>) => Promise<ToolCallResult>;
export type ResourceHandlerFn = () => Promise<ResourceContents>;
export type PromptHandlerFn = (args: Record<string, any>) => Promise<PromptResult>;
