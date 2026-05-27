"""
Semantic Search Client for UCP HTTP Server
Integrates with the PurchAI Semantic Search API
"""

import httpx
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Semantic Search API Configuration
SEMANTIC_SEARCH_URL = "http://localhost:8020"
SEARCH_ENDPOINT = "/search"
HEALTH_ENDPOINT = "/health"


class SemanticSearchClient:
    """Client for the PurchAI Semantic Search API"""
    
    def __init__(self, base_url: str = SEMANTIC_SEARCH_URL):
        """
        Initialize the semantic search client
        
        Args:
            base_url: Base URL of the semantic search API
        """
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def search(
        self,
        query: str,
        k: int = 10,
        offset: int = 0,
        limit: int = 10
    ) -> Dict:
        """
        Perform semantic search
        
        Args:
            query: Search query text
            k: Number of results to retrieve from FAISS (1-100)
            offset: Number of results to skip (pagination)
            limit: Number of results to return (1-100)
        
        Returns:
            Search response with results, total, offset, limit
        """
        try:
            response = await self.client.post(
                f"{self.base_url}{SEARCH_ENDPOINT}",
                json={
                    "query": query,
                    "k": k,
                    "offset": offset,
                    "limit": limit
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Semantic search error: {e}")
            return {
                "query": query,
                "results": [],
                "total": 0,
                "offset": offset,
                "limit": limit
            }
    
    async def health_check(self) -> Dict:
        """
        Check the health of the semantic search API
        
        Returns:
            Health status response
        """
        try:
            response = await self.client.get(f"{self.base_url}{HEALTH_ENDPOINT}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Health check error: {e}")
            return {
                "status": "unhealthy",
                "model_loaded": False,
                "index_loaded": False,
                "metadata_loaded": False
            }
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


def transform_to_ucp_product(search_result: Dict) -> Dict:
    """
    Transform semantic search result to UCP product format
    
    Args:
        search_result: Single result from semantic search API
    
    Returns:
        UCP-compliant product object
    """
    return {
        "id": search_result.get("pid", ""),
        "title": search_result.get("title", ""),
        "description": {
            "plain": f"{search_result.get('brand', '')} {search_result.get('title', '')} - {search_result.get('category', '')}"
        },
        "price_range": {
            "min": {
                "amount": int(search_result.get("price", "0") or "0"),
                "currency": "INR"
            },
            "max": {
                "amount": int(search_result.get("price", "0") or "0"),
                "currency": "INR"
            }
        },
        "media": [
            {
                "type": "image",
                "url": f"http://localhost:8080/images/{search_result.get('pid', '')}.jpg",
                "alt_text": search_result.get("title", "")
            }
        ],
        "categories": [
            {
                "value": search_result.get("category", "Uncategorized"),
                "taxonomy": "merchant"
            }
        ],
        "variants": [
            {
                "id": search_result.get("pid", ""),
                "sku": f"SKU-{search_result.get('pid', '')}",
                "title": search_result.get("title", ""),
                "description": {
                    "plain": f"{search_result.get('brand', '')} {search_result.get('title', '')}"
                },
                "price": {
                    "amount": int(search_result.get("price", "0") or "0"),
                    "currency": "INR"
                },
                "availability": {"available": True}
            }
        ],
        # Add semantic search metadata
        "metadata": {
            "semantic_score": search_result.get("score", 0.0),
            "brand": search_result.get("brand", ""),
            "sub_category": search_result.get("sub_category", ""),
            "rating": search_result.get("rating", "")
        }
    }


async def semantic_search_products(
    query: str,
    k: int = 10,
    offset: int = 0,
    limit: int = 10,
    client: Optional[SemanticSearchClient] = None
) -> tuple[List[Dict], int]:
    """
    Search products using semantic search and transform to UCP format
    
    Args:
        query: Search query text
        k: Number of results to retrieve from FAISS
        offset: Pagination offset
        limit: Number of results to return
        client: Optional SemanticSearchClient instance
    
    Returns:
        Tuple of (UCP products list, total count)
    """
    if client is None:
        client = SemanticSearchClient()
    
    try:
        search_response = await client.search(
            query=query,
            k=k,
            offset=offset,
            limit=limit
        )
        
        # Transform results to UCP format
        ucp_products = [
            transform_to_ucp_product(result)
            for result in search_response.get("results", [])
        ]
        
        total = search_response.get("total", 0)
        
        return ucp_products, total
        
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return [], 0
