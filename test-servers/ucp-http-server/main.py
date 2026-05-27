from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from semantic_search_client import SemanticSearchClient, semantic_search_products

app = FastAPI(
    title="UCP Mock Platform with Official SDK",
    description="A UCP-compliant platform using official ucp-sdk Pydantic models",
    version="1.0.0"
)

# Mock product database with UCP-compliant structure
PRODUCTS = {
    "prod_001": {
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
                "availability": {"available": True}
            }
        ]
    },
    "prod_002": {
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
                "availability": {"available": True}
            }
        ]
    },
    "prod_003": {
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
                "availability": {"available": True}
            }
        ]
    }
}

# In-memory storage
carts: Dict[str, dict] = {}
checkouts: Dict[str, dict] = {}
orders: Dict[str, dict] = {}

# Semantic search client
semantic_client = SemanticSearchClient()

def calculate_totals(items: List[dict], currency: str = "USD") -> List[dict]:
    """Calculate totals from items - returns UCP-compliant totals array"""
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    tax = int(subtotal * 0.08)
    shipping = 500 if subtotal > 0 else 0
    total = subtotal + tax + shipping
    return [
        {"type": "subtotal", "amount": subtotal},
        {"type": "tax", "amount": tax, "display_text": "Tax"},
        {"type": "shipping", "amount": shipping, "display_text": "Shipping"},
        {"type": "total", "amount": total, "display_text": "Total"}
    ]

def create_error_response(code: str, content: str, severity: str = "unrecoverable") -> dict:
    """Create UCP-compliant error response"""
    return {
        "ucp": {
            "version": "2026-04-08",
            "status": "error"
        },
        "messages": [
            {
                "type": "error",
                "code": code,
                "content": content,
                "severity": severity
            }
        ]
    }

# UCP Profile endpoint
@app.get("/.well-known/ucp")
async def get_ucp_profile():
    """UCP Profile endpoint - compliant with 2026-04-08 specification"""
    return {
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

# Catalog endpoints
@app.post("/catalog/search")
async def search_catalog(search_data: dict):
    """Search products - UCP catalog search endpoint with semantic search only"""
    query = search_data.get("query", "")
    k = search_data.get("k", 10)
    offset = search_data.get("offset", 0)
    limit = search_data.get("limit", 10)
    
    if not query:
        return create_error_response("invalid_input", "Query parameter is required")
    
    # Use semantic search only
    try:
        # Check semantic search health first
        health = await semantic_client.health_check()
        if health.get("status") != "healthy":
            return create_error_response(
                "service_unavailable",
                "Semantic search service is not healthy",
                "recoverable"
            )
        
        products, total = await semantic_search_products(
            query=query,
            k=k,
            offset=offset,
            limit=limit,
            client=semantic_client
        )
        
        return {
            "ucp": {
                "version": "2026-04-08",
                "capabilities": {
                    "dev.ucp.shopping.catalog.search": [{"version": "2026-04-08"}]
                }
            },
            "products": products,
            "pagination": {
                "has_next_page": offset + limit < total,
                "total_count": total
            }
        }
    except Exception as e:
        return create_error_response(
            "search_failed",
            f"Semantic search failed: {str(e)}",
            "recoverable"
        )

@app.post("/catalog/lookup")
async def lookup_catalog(lookup_data: dict):
    """Batch lookup products by IDs"""
    ids = lookup_data.get("ids", [])
    results = []
    not_found_ids = []
    
    for product_id in ids:
        if product_id in PRODUCTS:
            results.append(PRODUCTS[product_id])
        else:
            not_found_ids.append(product_id)
    
    response = {
        "ucp": {
            "version": "2026-04-08",
            "capabilities": {
                "dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]
            }
        },
        "products": results
    }
    
    if not_found_ids:
        response["messages"] = [
            {
                "type": "info",
                "code": "not_found",
                "content": f"Products not found: {', '.join(not_found_ids)}"
            }
        ]
    
    return response

@app.post("/catalog/product")
async def get_product(product_data: dict):
    """Get single product by ID"""
    product_id = product_data.get("id")
    
    if product_id not in PRODUCTS:
        return create_error_response("not_found", f"Product not found: {product_id}")
    
    return {
        "ucp": {
            "version": "2026-04-08",
            "capabilities": {
                "dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]
            }
        },
        "product": PRODUCTS[product_id]
    }

# Cart endpoints
@app.post("/carts")
async def create_cart(cart_data: dict):
    """Create a cart - UCP compliant"""
    cart_id = str(uuid.uuid4())
    line_items_input = cart_data.get("line_items", [])
    
    # Build line items with proper structure
    line_items = []
    items_for_totals = []
    line_item_counter = 0
    
    for item in line_items_input:
        product_id = item.get("item", {}).get("id")
        if product_id in PRODUCTS:
            line_item_counter += 1
            quantity = item.get("quantity", 1)
            price = PRODUCTS[product_id]["price_range"]["min"]["amount"]
            
            line_items.append({
                "id": f"li_{line_item_counter}",
                "item": {
                    "id": product_id,
                    "title": PRODUCTS[product_id]["title"],
                    "price": price
                },
                "quantity": quantity,
                "totals": [
                    {"type": "subtotal", "amount": price * quantity}
                ]
            })
            items_for_totals.append({
                "price": price,
                "quantity": quantity
            })
    
    if not line_items:
        return create_error_response("out_of_stock", "All requested items are currently out of stock")
    
    totals = calculate_totals(items_for_totals)
    
    cart = {
        "ucp": {
            "version": "2026-04-08",
            "capabilities": {
                "dev.ucp.shopping.cart": [{"version": "2026-04-08"}]
            }
        },
        "id": cart_id,
        "line_items": line_items,
        "currency": "USD",
        "totals": totals,
        "continue_url": f"http://localhost:8080/checkout?cart={cart_id}",
        "expires_at": (datetime.utcnow() + timedelta(hours=6)).isoformat() + "Z"
    }
    carts[cart_id] = cart
    return cart

@app.get("/carts/{cart_id}")
async def get_cart(cart_id: str):
    """Get a cart"""
    if cart_id not in carts:
        return create_error_response("not_found", "Cart not found")
    return carts[cart_id]

@app.put("/carts/{cart_id}")
async def update_cart(cart_id: str, cart_data: dict):
    """Update a cart - full replacement"""
    if cart_id not in carts:
        return create_error_response("not_found", "Cart not found")
    
    line_items_input = cart_data.get("line_items", [])
    
    # Rebuild line items
    line_items = []
    items_for_totals = []
    line_item_counter = 0
    
    for item in line_items_input:
        product_id = item.get("item", {}).get("id")
        if product_id in PRODUCTS:
            line_item_counter += 1
            quantity = item.get("quantity", 1)
            price = PRODUCTS[product_id]["price_range"]["min"]["amount"]
            
            line_items.append({
                "id": f"li_{line_item_counter}",
                "item": {
                    "id": product_id,
                    "title": PRODUCTS[product_id]["title"],
                    "price": price
                },
                "quantity": quantity,
                "totals": [
                    {"type": "subtotal", "amount": price * quantity}
                ]
            })
            items_for_totals.append({
                "price": price,
                "quantity": quantity
            })
    
    if not line_items:
        return create_error_response("out_of_stock", "All requested items are currently out of stock")
    
    totals = calculate_totals(items_for_totals)
    
    carts[cart_id]["line_items"] = line_items
    carts[cart_id]["totals"] = totals
    
    return carts[cart_id]

@app.post("/carts/{cart_id}/cancel")
async def cancel_cart(cart_id: str):
    """Cancel a cart"""
    if cart_id not in carts:
        return create_error_response("not_found", "Cart not found")
    
    cart_state = carts[cart_id].copy()
    del carts[cart_id]
    return cart_state

# Checkout endpoints
@app.post("/checkout-sessions")
async def create_checkout(checkout_data: dict):
    """Create a checkout - UCP compliant"""
    checkout_id = str(uuid.uuid4())
    line_items_input = checkout_data.get("line_items", [])
    
    # Build line items with proper structure
    line_items = []
    items_for_totals = []
    line_item_counter = 0
    
    for item in line_items_input:
        product_id = item.get("item", {}).get("id")
        if product_id in PRODUCTS:
            line_item_counter += 1
            quantity = item.get("quantity", 1)
            price = PRODUCTS[product_id]["price_range"]["min"]["amount"]
            
            line_items.append({
                "id": f"li_{line_item_counter}",
                "item": {
                    "id": product_id,
                    "title": PRODUCTS[product_id]["title"],
                    "price": price
                },
                "quantity": quantity,
                "totals": [
                    {"type": "subtotal", "amount": price * quantity}
                ]
            })
            items_for_totals.append({
                "price": price,
                "quantity": quantity
            })
    
    if not line_items:
        return create_error_response("out_of_stock", "All requested items are currently out of stock")
    
    totals = calculate_totals(items_for_totals)
    
    checkout = {
        "ucp": {
            "version": "2026-04-08",
            "capabilities": {
                "dev.ucp.shopping.checkout": [{"version": "2026-04-08"}]
            }
        },
        "id": checkout_id,
        "line_items": line_items,
        "status": "incomplete",
        "currency": "USD",
        "totals": totals,
        "links": [
            {"type": "privacy_policy", "url": "http://localhost:8080/policies/privacy"},
            {"type": "terms_of_service", "url": "http://localhost:8080/policies/terms"}
        ],
        "expires_at": (datetime.utcnow() + timedelta(hours=6)).isoformat() + "Z"
    }
    checkouts[checkout_id] = checkout
    return checkout

@app.get("/checkout-sessions/{checkout_id}")
async def get_checkout(checkout_id: str):
    """Get a checkout"""
    if checkout_id not in checkouts:
        return create_error_response("not_found", "Checkout not found")
    return checkouts[checkout_id]

@app.put("/checkout-sessions/{checkout_id}")
async def update_checkout(checkout_id: str, checkout_data: dict):
    """Update a checkout - full replacement"""
    if checkout_id not in checkouts:
        return create_error_response("not_found", "Checkout not found")
    
    line_items_input = checkout_data.get("line_items", [])
    
    # Rebuild line items
    line_items = []
    items_for_totals = []
    line_item_counter = 0
    
    for item in line_items_input:
        product_id = item.get("item", {}).get("id")
        if product_id in PRODUCTS:
            line_item_counter += 1
            quantity = item.get("quantity", 1)
            price = PRODUCTS[product_id]["price_range"]["min"]["amount"]
            
            line_items.append({
                "id": f"li_{line_item_counter}",
                "item": {
                    "id": product_id,
                    "title": PRODUCTS[product_id]["title"],
                    "price": price
                },
                "quantity": quantity,
                "totals": [
                    {"type": "subtotal", "amount": price * quantity}
                ]
            })
            items_for_totals.append({
                "price": price,
                "quantity": quantity
            })
    
    if not line_items:
        return create_error_response("out_of_stock", "All requested items are currently out of stock")
    
    totals = calculate_totals(items_for_totals)
    
    checkouts[checkout_id]["line_items"] = line_items
    checkouts[checkout_id]["totals"] = totals
    
    return checkouts[checkout_id]

@app.post("/checkout-sessions/{checkout_id}/complete")
async def complete_checkout(checkout_id: str, complete_data: dict):
    """Complete a checkout"""
    if checkout_id not in checkouts:
        return create_error_response("not_found", "Checkout not found")
    
    checkout = checkouts[checkout_id]
    
    if checkout["status"] == "completed":
        return create_error_response("invalid_operation", "Checkout is already completed", "recoverable")
    
    if checkout["status"] == "canceled":
        return create_error_response("invalid_operation", "Checkout is canceled", "recoverable")
    
    checkout["status"] = "completed"
    
    order_id = str(uuid.uuid4())
    order = {
        "ucp": {
            "version": "2026-04-08",
            "capabilities": {
                "dev.ucp.shopping.order": [{"version": "2026-04-08"}]
            }
        },
        "id": order_id,
        "checkout_id": checkout_id,
        "line_items": checkout["line_items"],
        "currency": checkout["currency"],
        "totals": checkout["totals"],
        "permalink_url": f"http://localhost:8080/orders/{order_id}"
    }
    orders[order_id] = order
    checkout["order"] = order
    
    return checkout

@app.post("/checkout-sessions/{checkout_id}/cancel")
async def cancel_checkout(checkout_id: str):
    """Cancel a checkout"""
    if checkout_id not in checkouts:
        return create_error_response("not_found", "Checkout not found")
    
    checkout = checkouts[checkout_id]
    
    if checkout["status"] == "completed":
        return create_error_response("invalid_operation", "Cannot cancel completed checkout", "recoverable")
    
    if checkout["status"] == "canceled":
        return create_error_response("invalid_operation", "Checkout is already canceled", "recoverable")
    
    checkout["status"] = "canceled"
    
    return checkout

# Order endpoints
@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get an order"""
    if order_id not in orders:
        return create_error_response("not_found", "Order not found")
    return orders[order_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8030)
