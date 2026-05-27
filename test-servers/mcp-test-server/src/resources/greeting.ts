import { Resource, ResourceContents } from "../types.js";

export const greetingResource: Resource = {
  uri: "greeting://welcome",
  name: "welcome",
  description: "A friendly greeting message",
  mimeType: "text/plain",
};

export async function handleGreeting(): Promise<ResourceContents> {
  console.error("[Greeting Resource] Serving greeting content");

  return {
    uri: "greeting://welcome",
    mimeType: "text/plain",
    text: "Welcome to the MCP Test Server! This server demonstrates the Model Context Protocol with HTTP transport. It provides two tools (calculator and random number generator), one resource (this greeting), and one prompt (system instruction). Feel free to explore the capabilities!",
  };
}
