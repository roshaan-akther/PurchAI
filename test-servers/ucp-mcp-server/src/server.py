import asyncio
import os
import uuid
from typing import Any, Dict, List, Optional
from mcp.server.fastmcp import FastMCP
from motor.motor_asyncio import AsyncIOMotorClient
from .models import (
    UCPMetadata, Product, PriceRange, Price, Media, Description,
    CatalogSearchResponse, CatalogLookupResponse, GetProductResponse,
    Checkout, LineItem, CheckoutResponse, Message
)

# Initialize FastMCP server
mcp = FastMCP("UCP-MCP-Server")

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
db = client.purchai
products_col = db.products
checkouts_col = db.checkouts

def map_db_to_ucp_product(doc: Dict[str, Any]) -> Product:
    # Handle price formatting (Flipkart dataset has commas)
    try:
        price_str = str(doc.get("actual_price", "0")).replace(",", "")
        price_val = int(float(price_str))
    except:
        price_val = 0
        
    return Product(
        id=doc["pid"],
        title=doc.get("product_name", doc.get("brand", "Unknown Product")),
        description=Description(plain=doc.get("description", "")),
        brand=doc.get("brand"),
        price_range=PriceRange(
            min=Price(amount=price_val, currency="INR")
        ),
        media=[Media(url=img) for img in doc.get("images", [])]
    )

@mcp.tool()
async def search_catalog(meta: Dict[str, Any], catalog: Dict[str, Any]) -> Dict[str, Any]:
    """Search for products in the catalog."""
    query = catalog.get("query", "")
    
    # MongoDB text search
    cursor = products_col.find({"$text": {"$search": query}}).limit(20)
    docs = await cursor.to_list(length=20)
    
    ucp_products = [map_db_to_ucp_product(doc) for doc in docs]
    
    response = CatalogSearchResponse(
        ucp=UCPMetadata(
            capabilities={"dev.ucp.shopping.catalog.search": [{"version": "2026-04-08"}]}
        ),
        products=ucp_products
    )
    return response.model_dump()

@mcp.tool()
async def lookup_catalog(meta: Dict[str, Any], catalog: Dict[str, Any]) -> Dict[str, Any]:
    """Lookup products or variants by identifiers."""
    ids = catalog.get("ids", [])
    
    cursor = products_col.find({"pid": {"$in": ids}})
    docs = await cursor.to_list(length=len(ids))
    
    found_products = [map_db_to_ucp_product(doc) for doc in docs]
    found_ids = {p.id for p in found_products}
    
    messages = []
    for pid in ids:
        if pid not in found_ids:
            messages.append(Message(type="info", code="not_found", content=f"Product {pid} not found"))
            
    response = CatalogLookupResponse(
        ucp=UCPMetadata(
            capabilities={"dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]}
        ),
        products=found_products,
        messages=messages if messages else None
    )
    return response.model_dump()

@mcp.tool()
async def get_product(meta: Dict[str, Any], catalog: Dict[str, Any]) -> Dict[str, Any]:
    """Get full product detail by identifier."""
    pid = catalog.get("id")
    
    doc = await products_col.find_one({"pid": pid})
    
    if not doc:
        return {
            "ucp": {"version": "2026-04-08", "status": "error"},
            "messages": [{"type": "error", "code": "not_found", "content": f"Product {pid} not found"}]
        }
        
    product = map_db_to_ucp_product(doc)
    response = GetProductResponse(
        ucp=UCPMetadata(
            capabilities={"dev.ucp.shopping.catalog.lookup": [{"version": "2026-04-08"}]}
        ),
        product=product
    )
    return response.model_dump()

@mcp.tool()
async def create_checkout(meta: Dict[str, Any], checkout: Dict[str, Any]) -> Dict[str, Any]:
    """Create a checkout session."""
    # Simple checkout creation logic
    checkout_id = f"chk_{uuid.uuid4().hex[:12]}"
    
    # Calculate totals from line items
    line_items = checkout.get("line_items", [])
    total_amount = 0
    processed_line_items = []
    
    for li in line_items:
        pid = li.get("item", {}).get("id")
        doc = await products_col.find_one({"pid": pid})
        if doc:
            try:
                price = int(doc.get("actual_price", "0").replace(",", ""))
            except:
                price = 0
            qty = li.get("quantity", 1)
            item_total = price * qty
            total_amount += item_total
            processed_line_items.append(LineItem(
                id=f"li_{uuid.uuid4().hex[:6]}",
                item={"id": pid, "title": doc.get("product_name"), "price": price},
                quantity=qty
            ))
            
    checkout_obj = Checkout(
        id=checkout_id,
        status="incomplete",
        currency="INR",
        line_items=processed_line_items,
        totals=[{"type": "total", "amount": total_amount}]
    )
    
    # Store in DB
    await checkouts_col.insert_one(checkout_obj.model_dump())
    
    response = CheckoutResponse(
        checkout=checkout_obj,
        ucp=UCPMetadata(
            capabilities={"dev.ucp.shopping.checkout": [{"version": "2026-04-08"}]}
        )
    )
    return response.model_dump()

if __name__ == "__main__":
    # Run with default transport (stdio)
    # For HTTP transport, use: fastmcp run --transport=streamable-http --port 3000 src.server:mcp
    mcp.run()
