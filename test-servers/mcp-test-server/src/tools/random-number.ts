import { Tool, ToolCallResult } from "../types.js";

export const randomNumberTool: Tool = {
  name: "random_number",
  description: "Generate a random number within a specified range",
  inputSchema: {
    type: "object",
    properties: {
      min: {
        type: "number",
        description: "Minimum value (inclusive)",
      },
      max: {
        type: "number",
        description: "Maximum value (inclusive)",
      },
    },
    required: ["min", "max"],
  },
};

export async function handleRandomNumber(
  args: Record<string, any>
): Promise<ToolCallResult> {
  const { min, max } = args;

  console.error(`[Random Number] Range: ${min} to ${max}`);

  if (min > max) {
    return {
      content: [
        {
          type: "text",
          text: "Error: min must be less than or equal to max",
        },
      ],
      isError: true,
    };
  }

  const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    content: [
      {
        type: "text",
        text: `Random number between ${min} and ${max}: ${randomValue}`,
      },
    ],
  };
}
