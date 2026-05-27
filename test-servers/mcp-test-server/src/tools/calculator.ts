import { Tool, ToolCallResult } from "../types.js";

export const calculatorTool: Tool = {
  name: "calculator",
  description: "Perform basic arithmetic operations (add, subtract, multiply, divide)",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "The arithmetic operation to perform",
      },
      a: {
        type: "number",
        description: "First operand",
      },
      b: {
        type: "number",
        description: "Second operand",
      },
    },
    required: ["operation", "a", "b"],
  },
};

export async function handleCalculator(
  args: Record<string, any>
): Promise<ToolCallResult> {
  const { operation, a, b } = args;

  console.error(`[Calculator] Operation: ${operation}, a: ${a}, b: ${b}`);

  let result: number;
  switch (operation) {
    case "add":
      result = a + b;
      break;
    case "subtract":
      result = a - b;
      break;
    case "multiply":
      result = a * b;
      break;
    case "divide":
      if (b === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Division by zero is not allowed",
            },
          ],
          isError: true,
        };
      }
      result = a / b;
      break;
    default:
      return {
        content: [
          {
            type: "text",
            text: `Error: Unknown operation '${operation}'`,
          },
        ],
        isError: true,
      };
  }

  const formattedResult = result.toFixed(2).replace(/\.00$/, "");

  return {
    content: [
      {
        type: "text",
        text: `${a} ${operation} ${b} = ${formattedResult}`,
      },
    ],
  };
}
