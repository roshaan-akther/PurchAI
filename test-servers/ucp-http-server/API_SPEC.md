# UCP Platform API Specification

## Overview

The UCP Mock Platform is a FastAPI-based implementation of the Unified Commerce Protocol (UCP) 2026-04-08 specification. It provides a complete shopping platform with catalog, cart, checkout, and order management capabilities for testing and development.

**Base URL:** `http://0.0.0.0:8030`

**UCP Version:** 2026-04-08

**Mock Products:** 3 (Blue Cotton T-Shirt, Red Fleece Hoodie, Classic Denim Jeans)

**Storage:** In-memory (data resets on server restart)

---

## UCP Profile

### GET `/.well-known/ucp`

Returns the UCP profile describing available services, capabilities, payment handlers, and signing keys.

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "services": {
      "dev.ucp.shopping": [{
        "version": "2026-04-08",
        "spec": "https://ucp.dev/2026-04-08/specification/overview",
        "transport": "rest",
        "endpoint": "http://localhost:8080",
        "schema": "https://ucp.dev/2026-04-08/services/shopping/rest.openapi.json"
      }]
    },
    "capabilities": {
      "dev.ucp.shopping.cart": [{
        "version": "2026-04-08",
        "spec": "https://ucp.dev/2026-04-08/specification/cart",
        "schema": "https://ucp.dev/2026-04-08/schemas/shopping/cart.json"
      }],
      "dev.ucp.shopping.checkout": [{
        "version": "2026-04-08",
        "spec": "https://ucp.dev/2026-04-08/specification/checkout",
        "schema": "https://ucp.dev/2026-04-08/schemas/shopping/checkout.json"
      }],
      "dev.ucp.shopping.catalog": [{
        "version": "2026-04-08",
        "spec": "https://ucp.dev/2026-04-08/specification/catalog",
        "schema": "https://ucp.dev/2026-04-08/schemas/shopping/catalog.json"
      }],
      "dev.ucp.shopping.order": [{
        "version": "2026-04-08",
        "spec": "https://ucp.dev/2026-04-08/specification/order",
        "schema": "https://ucp.dev/2026-04-08/schemas/shopping/order.json"
      }]
    },
    "payment_handlers": {
      "com.example.mock_payment": [{
        "id": "mock_payment_handler",
        "version": "2026-04-08",
        "spec": "https://example.com/specs/payments/mock",
        "schema": "https://example.com/specs/payments/mock.json",
        "available_instruments": [
          {
            "type": "card",
            "constraints": {
              "brands": ["visa", "mastercard", "amex"]
            }
          }
        ],
        "config": {
          "type": "CARD",
          "tokenization_specification": {
            "type": "PUSH",
            "parameters": {
              "token_retrieval_url": "https://api.example.com/v1/tokens"
            }
          }
        }
      }]
    },
    "signing_keys": [
      {
        "kid": "business_2026",
        "kty": "EC",
        "crv": "P-256",
        "x": "WbbXwVYGdJoP4Xm3qCkGvBRcRvKtEfXDbWvPzpPS8LA",
        "y": "sP4jHHxYqC89HBo8TjrtVOAGHfJDflYxw7MFMxuFMPY",
        "use": "sig",
        "alg": "ES256"
      }
    ]
  }
}
```

---

## Catalog Endpoints

### 1. Search Products

**POST** `/catalog/search`

Search for products by query string. Performs case-insensitive matching on product titles and descriptions.

**Request Body:**

```json
{
  "query": "string"
}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.catalog.search": [{"version": "2026-04-08"}]
    }
  },
  "products": [
    {
      "id": "prod_001",
      "title": "Blue Cotton T-Shirt",
      "description": {"plain": "Comfortable 100% cotton t-shirt in blue"},
      "price_range": {
        "min": {"amount": 1999, "currency": "USD"},
        "max": {"amount": 1999, "currency": "USD"}
      },
      "media": [
        {
          "type": "image",
          "url": "http://localhost:8080/images/tshirt-blue.jpg",
          "alt_text": "Blue Cotton T-Shirt"
        }
      ],
      "categories": [
        {"value": "Apparel", "taxonomy": "merchant"}
      ],
      "variants": [...]
    }
  ],
  "pagination": {
    "has_next_page": false,
    "total_count": 1
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/catalog/search \
  -H "Content-Type: application/json" \
  -d '{"query": "t-shirt"}'
```

---

### 2. Batch Lookup Products

**POST** `/catalog/lookup`

Retrieve multiple products by their IDs in a single request.

**Request Body:**

```json
{
  "ids": ["prod_001", "prod_002"]
}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]
    }
  },
  "products": [...]
}
```

If some products are not found, a message is included:

```json
{
  "ucp": {...},
  "products": [...],
  "messages": [
    {
      "type": "info",
      "code": "not_found",
      "content": "Products not found: prod_999"
    }
  ]
}
```

---

### 3. Get Single Product

**POST** `/catalog/product`

Retrieve a single product by ID.

**Request Body:**

```json
{
  "id": "prod_001"
}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]
    }
  },
  "product": {...}
}
```

**Error Response (not found):**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "status": "error"
  },
  "messages": [
    {
      "type": "error",
      "code": "not_found",
      "content": "Product not found: prod_999",
      "severity": "unrecoverable"
    }
  ]
}
```

---

## Cart Endpoints

### 1. Create Cart

**POST** `/carts`

Create a new shopping cart with line items.

**Request Body:**

```json
{
  "line_items": [
    {
      "item": {
        "id": "prod_001"
      },
      "quantity": 2
    }
  ]
}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.cart": [{"version": "2026-04-08"}]
    }
  },
  "id": "uuid-string",
  "line_items": [
    {
      "id": "li_1",
      "item": {
        "id": "prod_001",
        "title": "Blue Cotton T-Shirt",
        "price": 1999
      },
      "quantity": 2,
      "totals": [
        {"type": "subtotal", "amount": 3998}
      ]
    }
  ],
  "currency": "USD",
  "totals": [
    {"type": "subtotal", "amount": 3998},
    {"type": "tax", "amount": 319, "display_text": "Tax"},
    {"type": "shipping", "amount": 500, "display_text": "Shipping"},
    {"type": "total", "amount": 4817, "display_text": "Total"}
  ],
  "continue_url": "http://localhost:8080/checkout?cart=uuid-string",
  "expires_at": "2026-05-25T08:00:00Z"
}
```

**Totals Calculation:**
- Subtotal: Sum of (price × quantity) for all items
- Tax: 8% of subtotal
- Shipping: 500 (if subtotal > 0)
- Total: Subtotal + Tax + Shipping

---

### 2. Get Cart

**GET** `/carts/{cart_id}`

Retrieve an existing cart by ID.

**Response:** Same as create cart response.

**Error Response (not found):**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "status": "error"
  },
  "messages": [
    {
      "type": "error",
      "code": "not_found",
      "content": "Cart not found",
      "severity": "unrecoverable"
    }
  ]
}
```

---

### 3. Update Cart

**PUT** `/carts/{cart_id}`

Full replacement of cart line items.

**Request Body:** Same as create cart.

**Response:** Updated cart with new line items and recalculated totals.

---

### 4. Cancel Cart

**POST** `/carts/{cart_id}/cancel`

Cancel and delete a cart.

**Response:** Returns the cart state before deletion.

---

## Checkout Endpoints

### 1. Create Checkout Session

**POST** `/checkout-sessions`

Create a new checkout session from line items.

**Request Body:**

```json
{
  "line_items": [
    {
      "item": {
        "id": "prod_001"
      },
      "quantity": 1
    }
  ]
}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.checkout": [{"version": "2026-04-08"}]
    }
  },
  "id": "checkout-uuid",
  "line_items": [...],
  "status": "incomplete",
  "currency": "USD",
  "totals": [...],
  "links": [
    {"type": "privacy_policy", "url": "http://localhost:8030/policies/privacy"},
    {"type": "terms_of_service", "url": "http://localhost:8030/policies/terms"}
  ],
  "expires_at": "2026-05-25T08:00:00Z"
}
```

**Status Values:**
- `incomplete` - Initial state
- `completed` - Successfully completed
- `canceled` - Canceled by user

---

### 2. Get Checkout Session

**GET** `/checkout-sessions/{checkout_id}`

Retrieve an existing checkout session.

**Response:** Same as create checkout response.

---

### 3. Update Checkout Session

**PUT** `/checkout-sessions/{checkout_id}`

Full replacement of checkout line items.

**Request Body:** Same as create checkout.

**Response:** Updated checkout with new line items and totals.

---

### 4. Complete Checkout

**POST** `/checkout-sessions/{checkout_id}/complete`

Complete a checkout session and create an order.

**Request Body:**

```json
{}
```

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.checkout": [{"version": "2026-04-08"}]
    }
  },
  "id": "checkout-uuid",
  "line_items": [...],
  "status": "completed",
  "currency": "USD",
  "totals": [...],
  "links": [...],
  "expires_at": "2026-05-25T08:00:00Z",
  "order": {
    "ucp": {
      "version": "2026-04-08",
      "capabilities": {
        "dev.ucp.shopping.order": [{"version": "2026-04-08"}]
      }
    },
    "id": "order-uuid",
    "checkout_id": "checkout-uuid",
    "line_items": [...],
    "currency": "USD",
    "totals": [...],
    "permalink_url": "http://localhost:8080/orders/order-uuid"
  }
}
```

**Error Responses:**

- Already completed: `{"code": "invalid_operation", "content": "Checkout is already completed", "severity": "recoverable"}`
- Already canceled: `{"code": "invalid_operation", "content": "Checkout is canceled", "severity": "recoverable"}`

---

### 5. Cancel Checkout

**POST** `/checkout-sessions/{checkout_id}/cancel`

Cancel a checkout session.

**Response:** Checkout with status set to `canceled`.

**Error Responses:**

- Already completed: `{"code": "invalid_operation", "content": "Cannot cancel completed checkout", "severity": "recoverable"}`
- Already canceled: `{"code": "invalid_operation", "content": "Checkout is already canceled", "severity": "recoverable"}`

---

## Order Endpoints

### 1. Get Order

**GET** `/orders/{order_id}`

Retrieve an order by ID.

**Response:**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "capabilities": {
      "dev.ucp.shopping.order": [{"version": "2026-04-08"}]
    }
  },
  "id": "order-uuid",
  "checkout_id": "checkout-uuid",
  "line_items": [...],
  "currency": "USD",
  "totals": [...],
  "permalink_url": "http://localhost:8080/orders/order-uuid"
}
```

**Error Response (not found):**

```json
{
  "ucp": {
    "version": "2026-04-08",
    "status": "error"
  },
  "messages": [
    {
      "type": "error",
      "code": "not_found",
      "content": "Order not found",
      "severity": "unrecoverable"
    }
  ]
}
```

---

## Error Handling

All error responses follow the UCP error format:

```json
{
  "ucp": {
    "version": "2026-04-08",
    "status": "error"
  },
  "messages": [
    {
      "type": "error",
      "code": "error_code",
      "content": "Human-readable error message",
      "severity": "unrecoverable" | "recoverable"
    }
  ]
}
```

**Common Error Codes:**
- `not_found` - Resource not found
- `out_of_stock` - Items unavailable
- `invalid_operation` - Operation not allowed in current state

**Severity Levels:**
- `unrecoverable` - Error cannot be recovered from
- `recoverable` - Error can be recovered from with user action

---

## Mock Products

### Product 1: Blue Cotton T-Shirt

```json
{
  "id": "prod_001",
  "title": "Blue Cotton T-Shirt",
  "description": {"plain": "Comfortable 100% cotton t-shirt in blue"},
  "price_range": {
    "min": {"amount": 1999, "currency": "USD"},
    "max": {"amount": 1999, "currency": "USD"}
  },
  "media": [
    {
      "type": "image",
      "url": "http://localhost:8080/images/tshirt-blue.jpg",
      "alt_text": "Blue Cotton T-Shirt"
    }
  ],
  "categories": [
    {"value": "Apparel", "taxonomy": "merchant"}
  ],
  "variants": [
    {
      "id": "prod_001",
      "sku": "TSHIRT-BLU-001",
      "title": "Blue Cotton T-Shirt",
      "description": {"plain": "Comfortable 100% cotton t-shirt in blue"},
      "price": {"amount": 1999, "currency": "USD"},
      "availability": {"available": true}
    }
  ]
}
```

### Product 2: Red Fleece Hoodie

```json
{
  "id": "prod_002",
  "title": "Red Fleece Hoodie",
  "description": {"plain": "Warm fleece hoodie in red color"},
  "price_range": {
    "min": {"amount": 4999, "currency": "USD"},
    "max": {"amount": 4999, "currency": "USD"}
  },
  "media": [
    {
      "type": "image",
      "url": "http://localhost:8080/images/hoodie-red.jpg",
      "alt_text": "Red Fleece Hoodie"
    }
  ],
  "categories": [
    {"value": "Apparel", "taxonomy": "merchant"}
  ],
  "variants": [
    {
      "id": "prod_002",
      "sku": "HOODIE-RED-001",
      "title": "Red Fleece Hoodie",
      "description": {"plain": "Warm fleece hoodie in red color"},
      "price": {"amount": 4999, "currency": "USD"},
      "availability": {"available": true}
    }
  ]
}
```

### Product 3: Classic Denim Jeans

```json
{
  "id": "prod_003",
  "title": "Classic Denim Jeans",
  "description": {"plain": "Classic fit denim jeans"},
  "price_range": {
    "min": {"amount": 5999, "currency": "USD"},
    "max": {"amount": 5999, "currency": "USD"}
  },
  "media": [
    {
      "type": "image",
      "url": "http://localhost:8080/images/jeans.jpg",
      "alt_text": "Classic Denim Jeans"
    }
  ],
  "categories": [
    {"value": "Apparel", "taxonomy": "merchant"}
  ],
  "variants": [
    {
      "id": "prod_003",
      "sku": "JEANS-CLS-001",
      "title": "Classic Denim Jeans",
      "description": {"plain": "Classic fit denim jeans"},
      "price": {"amount": 5999, "currency": "USD"},
      "availability": {"available": true}
    }
  ]
}
```

---

## Deployment

### Requirements

- Python 3.8+
- FastAPI
- Uvicorn

### Running the Server

```bash
cd /home/roshaan/Desktop/purchai/test-servers/ucp-http-server
python main.py
```

The server will start on `http://0.0.0.0:8080`

### Dependencies

```bash
pip install fastapi uvicorn pydantic
```

---

## Example Usage

### Complete Purchase Flow

```python
import requests

BASE_URL = "http://localhost:8080"

# 1. Search for products
search = requests.post(f"{BASE_URL}/catalog/search", json={"query": "t-shirt"})
products = search.json()["products"]
product_id = products[0]["id"]

# 2. Create cart
cart = requests.post(f"{BASE_URL}/carts", json={
    "line_items": [{"item": {"id": product_id}, "quantity": 2}]
})
cart_id = cart.json()["id"]

# 3. Create checkout
checkout = requests.post(f"{BASE_URL}/checkout-sessions", json={
    "line_items": [{"item": {"id": product_id}, "quantity": 2}]
})
checkout_id = checkout.json()["id"]

# 4. Complete checkout
completed = requests.post(f"{BASE_URL}/checkout-sessions/{checkout_id}/complete", json={})
order_id = completed.json()["order"]["id"]

# 5. Get order
order = requests.get(f"{BASE_URL}/orders/{order_id}")
print(order.json())
```

---

## Limitations

- **In-Memory Storage**: All data (carts, checkouts, orders) is stored in memory and resets on server restart
- **Mock Products**: Only 3 products available
- **No Authentication**: No authentication or authorization implemented
- **No Payment**: Payment processing is mocked
- **No Inventory Management**: Products are always in stock
- **No Validation**: Minimal input validation beyond basic checks

---

## OpenAPI/Swagger Documentation

Interactive API documentation available at:

- **Swagger UI:** `http://localhost:8030/docs`
- **ReDoc:** `http://localhost:8030/redoc`

---

## Version History

- **v1.0.0** - Initial release with UCP 2026-04-08 compliance
