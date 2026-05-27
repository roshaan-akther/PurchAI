from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class UCPMetadata(BaseModel):
    version: str = "2026-04-08"
    status: Optional[str] = None
    capabilities: Optional[Dict[str, List[Dict[str, str]]]] = None

class Description(BaseModel):
    plain: str

class Price(BaseModel):
    amount: int
    currency: str

class PriceRange(BaseModel):
    min: Price
    max: Optional[Price] = None

class Media(BaseModel):
    type: str = "image"
    url: str
    alt_text: Optional[str] = None

class Product(BaseModel):
    id: str
    handle: Optional[str] = None
    title: str
    description: Description
    url: Optional[str] = None
    price_range: PriceRange
    media: List[Media] = []
    brand: Optional[str] = None

class Message(BaseModel):
    type: str  # error, warning, info
    code: str
    content: str
    severity: Optional[str] = None
    path: Optional[str] = None

class UCPResponse(BaseModel):
    ucp: UCPMetadata
    messages: Optional[List[Message]] = None

class CatalogSearchResponse(UCPResponse):
    products: List[Product]
    pagination: Optional[Dict[str, Any]] = None

class CatalogLookupResponse(UCPResponse):
    products: List[Product]

class GetProductResponse(UCPResponse):
    product: Optional[Product] = None

class LineItem(BaseModel):
    id: Optional[str] = None
    item: Dict[str, Any]  # Simplified for now
    quantity: int

class Checkout(BaseModel):
    id: Optional[str] = None
    status: str = "incomplete"
    currency: str
    line_items: List[LineItem]
    totals: Optional[List[Dict[str, Any]]] = None
    ucp: Optional[UCPMetadata] = None

class CheckoutResponse(BaseModel):
    checkout: Checkout
    ucp: Optional[UCPMetadata] = None # UCP spec says it's in checkout.ucp but examples show it can be top level
