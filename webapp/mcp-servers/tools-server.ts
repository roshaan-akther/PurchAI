import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const UCP_BASE_URL = "http://localhost:8030";
const RECOMMENDATION_API_URL = process.env.RECOMMENDATION_API_URL || "http://localhost:8010";

const server = new McpServer(
  { name: "purchai-tools", version: "1.0.0" },
  {
    instructions:
      "This server provides utility tools for PurchAI. Use 'calculator' for arithmetic operations, 'random_number' to generate random integers, and recommendation tools for product suggestions.",
  }
);

server.registerTool(
  "calculator",
  {
    title: "Calculator",
    description:
      "Perform basic arithmetic operations on two numeric values. Use this tool for any mathematical calculations required during task execution. Supports operations: add, subtract, multiply, divide (also accepts synonyms: addition, subtraction, multiplication, division). Returns the numeric result as a string. Always use this tool for calculations - do not perform math mentally. Division by zero returns an error.",
    inputSchema: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide", "addition", "subtraction", "multiplication", "division"])
        .describe("The arithmetic operation to perform (add/subtract/multiply/divide or synonyms)"),
      a: z.number().describe("The first operand (numeric value)"),
      b: z.number().describe("The second operand (numeric value)"),
    }),
  },
  async ({ operation, a, b }) => {
    // Map operation synonyms to standard values
    const opMap: Record<string, string> = {
      addition: "add",
      subtraction: "subtract",
      multiplication: "multiply",
      division: "divide",
    };
    const normalizedOp = opMap[operation] || operation;

    if (normalizedOp === "divide" && b === 0) {
      return {
        content: [{ type: "text", text: "Error: Division by zero is undefined." }],
        isError: true,
      };
    }

    const result =
      normalizedOp === "add"
        ? a + b
        : normalizedOp === "subtract"
        ? a - b
        : normalizedOp === "multiply"
        ? a * b
        : a / b;

    return {
      content: [{ type: "text", text: String(result) }],
    };
  }
);

server.registerTool(
  "random_number",
  {
    title: "Random Number Generator",
    description: "Generate a random integer within a specified range. Useful for testing, sampling, or when a random value is needed. Returns the generated integer as a string. Both min and max are inclusive. Returns error if min > max.",
    inputSchema: z.object({
      min: z.number().int().describe("Minimum value (inclusive, must be <= max)"),
      max: z.number().int().describe("Maximum value (inclusive, must be >= min)"),
    }),
  },
  async ({ min, max }) => {
    if (min > max) {
      return {
        content: [
          { type: "text", text: "Error: min must be less than or equal to max." },
        ],
        isError: true,
      };
    }
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      content: [{ type: "text", text: String(result) }],
    };
  }
);

// UCP Catalog Search Tool
server.registerTool(
  "ucp_catalog_search",
  {
    title: "UCP Catalog Search",
    description: "Search the UCP product catalog using semantic search. Accepts a natural language query string and returns matching products with pagination metadata. Uses the semantic search backend for intelligent product matching. Returns UCP-compliant response with products array and pagination info. Returns error if query is empty or semantic search service is unhealthy.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query to find products (e.g., 'blue cotton t-shirt', 'winter jacket')"),
    }),
  },
  async ({ query }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/catalog/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Cart Create Tool
server.registerTool(
  "ucp_cart_create",
  {
    title: "UCP Create Cart",
    description: "Create a new UCP-compliant shopping cart with initial line items. Each line item must include item.id, item.title, item.price, and quantity. The server validates products against the catalog and calculates totals (subtotal, tax, shipping, total). Returns cart ID, line items with calculated totals, currency, continue_url, and expires_at timestamp. Returns error if all items are out of stock.",
    inputSchema: z.object({
      line_items: z.array(z.object({
        id: z.string().optional().describe("Line item ID (optional, server generates if not provided)"),
        item: z.object({
          id: z.string().describe("Product ID from catalog"),
          title: z.string().describe("Product title"),
          price: z.number().describe("Product price"),
        }),
        quantity: z.number().describe("Quantity of this item (positive integer)"),
        totals: z.array(z.any()).optional().describe("Optional pre-calculated totals (server will recalculate)"),
      })).describe("List of line items to initialize the cart with"),
    }),
  },
  async ({ line_items }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/carts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_items }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Cart Get Tool
server.registerTool(
  "ucp_cart_get",
  {
    title: "UCP Get Cart",
    description: "Retrieve an existing UCP cart by its ID. Returns the full cart object including line items, calculated totals, currency, continue_url, and expires_at. Returns error if cart_id is not found or cart has been canceled.",
    inputSchema: z.object({
      cart_id: z.string().describe("The cart ID to retrieve (returned from cart creation)"),
    }),
  },
  async ({ cart_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/carts/${cart_id}`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Checkout Create Tool
server.registerTool(
  "ucp_checkout_create",
  {
    title: "UCP Create Checkout",
    description: "Create a new UCP checkout session from line items. Similar to cart creation but for checkout flow. Validates products, calculates totals, sets status to 'incomplete'. Returns checkout ID, line items, status, currency, totals, policy links, and expires_at. Use this when user is ready to proceed to payment. Returns error if all items are out of stock.",
    inputSchema: z.object({
      line_items: z.array(z.object({
        id: z.string().optional().describe("Line item ID (optional, server generates if not provided)"),
        item: z.object({
          id: z.string().describe("Product ID from catalog"),
          title: z.string().describe("Product title"),
          price: z.number().describe("Product price"),
        }),
        quantity: z.number().describe("Quantity of this item (positive integer)"),
        totals: z.array(z.any()).optional().describe("Optional pre-calculated totals (server will recalculate)"),
      })).describe("List of line items for the checkout session"),
    }),
  },
  async ({ line_items }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/checkout-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_items }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Checkout Get Tool
server.registerTool(
  "ucp_checkout_get",
  {
    title: "UCP Get Checkout",
    description: "Retrieve an existing UCP checkout session by its ID. Returns the full checkout object including line items, status (incomplete/completed/canceled), currency, totals, policy links, and expires_at. Returns error if checkout_id is not found.",
    inputSchema: z.object({
      checkout_id: z.string().describe("The checkout session ID to retrieve (returned from checkout creation)"),
    }),
  },
  async ({ checkout_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/checkout-sessions/${checkout_id}`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Checkout Complete Tool
server.registerTool(
  "ucp_checkout_complete",
  {
    title: "UCP Complete Checkout",
    description: "Complete a checkout session to finalize the purchase and create an order. Changes checkout status to 'completed' and generates an order ID. Returns the updated checkout with the order object included (order_id, checkout_id, line_items, currency, totals, permalink_url). Returns error if checkout not found, already completed, or already canceled.",
    inputSchema: z.object({
      checkout_id: z.string().describe("The checkout session ID to complete (must be in 'incomplete' status)"),
    }),
  },
  async ({ checkout_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/checkout-sessions/${checkout_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Order Get Tool
server.registerTool(
  "ucp_order_get",
  {
    title: "UCP Get Order",
    description: "Retrieve a completed UCP order by its ID. Returns the full order object including order_id, checkout_id, line_items, currency, totals, and permalink_url. Use this after checkout completion to get order details. Returns error if order_id is not found.",
    inputSchema: z.object({
      order_id: z.string().describe("The order ID to retrieve (returned from checkout completion)"),
    }),
  },
  async ({ order_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/orders/${order_id}`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Catalog Lookup Tool
server.registerTool(
  "ucp_catalog_lookup",
  {
    title: "UCP Catalog Lookup",
    description: "Batch retrieve multiple products from the UCP catalog by their IDs in a single request. More efficient than individual product lookups when you need multiple products. Returns array of product objects for found IDs. Includes messages array with not_found_ids for any IDs that don't exist in the catalog.",
    inputSchema: z.object({
      ids: z.array(z.string()).describe("Array of product IDs to retrieve from catalog"),
    }),
  },
  async ({ ids }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/catalog/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Catalog Product Tool
server.registerTool(
  "ucp_catalog_product",
  {
    title: "UCP Get Product",
    description: "Retrieve a single product from the UCP catalog by its ID. Returns the full product object including id, title, description, price_range, media (images), categories, and variants. Use for getting detailed product information when you have a specific product ID. Returns error if product_id is not found.",
    inputSchema: z.object({
      id: z.string().describe("The product ID to retrieve from catalog"),
    }),
  },
  async ({ id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/catalog/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Cart Update Tool
server.registerTool(
  "ucp_cart_update",
  {
    title: "UCP Update Cart",
    description: "Update an existing cart by full replacement of line items. This is a PUT operation - it completely replaces the existing line items with the new set. The server validates products, recalculates all totals, and updates the cart. Returns the updated cart with new line items and recalculated totals. Returns error if cart_id not found or all items are out of stock.",
    inputSchema: z.object({
      cart_id: z.string().describe("The cart ID to update (must exist)"),
      line_items: z.array(z.object({
        id: z.string().optional().describe("Line item ID (optional, server generates if not provided)"),
        item: z.object({
          id: z.string().describe("Product ID from catalog"),
          title: z.string().describe("Product title"),
          price: z.number().describe("Product price"),
        }),
        quantity: z.number().describe("Quantity of this item (positive integer)"),
        totals: z.array(z.any()).optional().describe("Optional pre-calculated totals (server will recalculate)"),
      })).describe("Complete replacement list of line items (replaces all existing items)"),
    }),
  },
  async ({ cart_id, line_items }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/carts/${cart_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_items }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Cart Cancel Tool
server.registerTool(
  "ucp_cart_cancel",
  {
    title: "UCP Cancel Cart",
    description: "Cancel and delete a cart by its ID. This removes the cart from storage and returns the cart's final state. After cancellation, the cart ID becomes invalid and cannot be retrieved or updated. Returns error if cart_id is not found.",
    inputSchema: z.object({
      cart_id: z.string().describe("The cart ID to cancel (must exist)"),
    }),
  },
  async ({ cart_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/carts/${cart_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Checkout Update Tool
server.registerTool(
  "ucp_checkout_update",
  {
    title: "UCP Update Checkout",
    description: "Update an existing checkout session by full replacement of line items. This is a PUT operation - it completely replaces the existing line items with the new set. The server validates products, recalculates all totals, and updates the checkout. Returns the updated checkout with new line items and recalculated totals. Returns error if checkout_id not found or all items are out of stock.",
    inputSchema: z.object({
      checkout_id: z.string().describe("The checkout session ID to update (must exist)"),
      line_items: z.array(z.object({
        id: z.string().optional().describe("Line item ID (optional, server generates if not provided)"),
        item: z.object({
          id: z.string().describe("Product ID from catalog"),
          title: z.string().describe("Product title"),
          price: z.number().describe("Product price"),
        }),
        quantity: z.number().describe("Quantity of this item (positive integer)"),
        totals: z.array(z.any()).optional().describe("Optional pre-calculated totals (server will recalculate)"),
      })).describe("Complete replacement list of line items (replaces all existing items)"),
    }),
  },
  async ({ checkout_id, line_items }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/checkout-sessions/${checkout_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_items }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// UCP Checkout Cancel Tool
server.registerTool(
  "ucp_checkout_cancel",
  {
    title: "UCP Cancel Checkout",
    description: "Cancel a checkout session by its ID. Changes checkout status to 'canceled'. Cannot cancel checkouts that are already 'completed'. Returns the updated checkout with canceled status. Returns error if checkout_id not found, already completed, or already canceled.",
    inputSchema: z.object({
      checkout_id: z.string().describe("The checkout session ID to cancel (must be in 'incomplete' status)"),
    }),
  },
  async ({ checkout_id }) => {
    try {
      const response = await fetch(`${UCP_BASE_URL}/checkout-sessions/${checkout_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// Recommendation System - Get System Status
server.registerTool(
  "recommendation_system_status",
  {
    title: "Recommendation System Status",
    description: "Get the current status and configuration of the W-ALS recommendation system. Returns information about model loading status, system health, and configuration parameters. Use this to verify the recommendation API is operational before making recommendation requests.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const response = await fetch(`${RECOMMENDATION_API_URL}/`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// Recommendation System - Get Recommendations for User
server.registerTool(
  "recommendation_get_for_user",
  {
    title: "Get User Recommendations",
    description: "Get personalized product recommendations for an existing user based on their purchase history. Uses collaborative filtering (W-ALS algorithm) to find products similar to what the user has purchased. Requires the user to have purchase history in the system. Returns array of recommended products with product_id, title, brand, category, price, rating, and image. Use k to control number of results (default 10).",
    inputSchema: z.object({
      user_id: z.string().describe("The external user ID (must have purchase history in system)"),
      k: z.number().optional().default(10).describe("Number of recommendations to return (default: 10, typical range 5-20)"),
    }),
  },
  async ({ user_id, k }) => {
    try {
      const response = await fetch(`${RECOMMENDATION_API_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, k }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// Recommendation System - Get Recommendations for New User
server.registerTool(
  "recommendation_get_for_new_user",
  {
    title: "Get New User Recommendations",
    description: "Get recommendations for a new user without purchase history using popularity-based filtering. Uses user preferences (category, sub-category, brands, price range) to find popular products matching their profile. Suitable for cold-start scenarios where user has no purchase history. Returns array of recommended products with product_id, title, brand, category, price, rating, and image. Use k to control number of results (default 10).",
    inputSchema: z.object({
      primary_category: z.string().describe("User's preferred product category (e.g., 'Apparel', 'Electronics')"),
      primary_sub_category: z.string().describe("User's preferred sub-category (e.g., 'T-Shirts', 'Laptops')"),
      preferred_brands: z.array(z.string()).describe("List of preferred brand names (e.g., ['Nike', 'Adidas'])"),
      price_range_preference: z.string().describe("Price preference: 'low', 'medium', or 'high'"),
      k: z.number().optional().default(10).describe("Number of recommendations to return (default: 10, typical range 5-20)"),
    }),
  },
  async ({ primary_category, primary_sub_category, preferred_brands, price_range_preference, k }) => {
    try {
      const response = await fetch(`${RECOMMENDATION_API_URL}/recommend/new-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_category,
          primary_sub_category,
          preferred_brands,
          price_range_preference,
          k,
        }),
      });
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// Recommendation System - Get Also Bought Recommendations
server.registerTool(
  "recommendation_get_also_bought",
  {
    title: "Get Also Bought Recommendations",
    description: "Get personalized 'also bought' recommendations for a user viewing a specific product. Combines the user's purchase history with the product they're currently viewing to find complementary products. Uses collaborative filtering to find products frequently purchased together with the viewed product by similar users. Requires user to have purchase history. Returns array of recommended products with product_id, title, brand, category, price, rating, and image. Use k to control number of results (default 10).",
    inputSchema: z.object({
      user_id: z.string().describe("The external user ID (must have purchase history in system)"),
      product_id: z.string().describe("The product ID the user is currently viewing (to find complementary products)"),
      k: z.number().optional().default(10).describe("Number of recommendations to return (default: 10, typical range 5-20)"),
    }),
  },
  async ({ user_id, product_id, k }) => {
    try {
      const response = await fetch(`${RECOMMENDATION_API_URL}/recommend/also-bought`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, product_id, k }),
      });
      if (!response.ok) {
        const error = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(error, null, 2) }],
          isError: true,
        };
      }
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

// Recommendation System - Health Check
server.registerTool(
  "recommendation_health_check",
  {
    title: "Recommendation System Health Check",
    description: "Check the health status of the recommendation API service. Returns status indicating if the service is healthy and the recommendation model is loaded. Use this before making recommendation requests to ensure the service is operational. Returns error if service is unhealthy or model is not loaded.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const response = await fetch(`${RECOMMENDATION_API_URL}/health`);
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
(async () => {
  await server.connect(transport);
})();
