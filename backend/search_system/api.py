"""
FastAPI endpoint for Semantic Search System
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, ConfigDict
from typing import List, Optional
import config
from model.embeddings import EmbeddingGenerator
from model.vector_index import VectorIndex
import pickle
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global variables
embedder = None
vector_index = None
product_metadata = None
search_cache = {}  # In-memory cache for search results


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    global embedder, vector_index, product_metadata
    
    # Startup
    logger.info("startup_started")
    embedder = EmbeddingGenerator()
    logger.info("model_loaded", model=config.MODEL_NAME)
    
    vector_index = VectorIndex()
    vector_index.load_index(config.FAISS_INDEX_PATH)
    vector_index.load_metadata(config.PRODUCT_IDS_PATH)
    logger.info("index_loaded", path=config.FAISS_INDEX_PATH)
    
    with open(config.PRODUCT_METADATA_PATH, 'rb') as f:
        product_metadata = pickle.load(f)
    logger.info("metadata_loaded", count=len(product_metadata))
    
    logger.info("startup_complete")
    
    yield
    
    # Shutdown - cleanup if needed
    logger.info("shutdown_started")
    # Add any cleanup logic here if needed
    logger.info("shutdown_complete")


app = FastAPI(title="Semantic Search API", lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str
    k: Optional[int] = 10
    offset: Optional[int] = 0
    limit: Optional[int] = 10
    
    @field_validator('query')
    @classmethod
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        if len(v) > 500:
            raise ValueError('Query length cannot exceed 500 characters')
        return v.strip()
    
    @field_validator('k')
    @classmethod
    def validate_k(cls, v):
        if v is not None and (v < 1 or v > 100):
            raise ValueError('k must be between 1 and 100')
        return v or 10
    
    @field_validator('offset')
    @classmethod
    def validate_offset(cls, v):
        if v is not None and v < 0:
            raise ValueError('offset must be non-negative')
        return v or 0
    
    @field_validator('limit')
    @classmethod
    def validate_limit(cls, v):
        if v is not None and (v < 1 or v > 100):
            raise ValueError('limit must be between 1 and 100')
        return v or 10


class SearchResult(BaseModel):
    pid: str
    title: str
    brand: str
    category: str
    sub_category: str
    price: str
    rating: str
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Semantic Search API",
        "status": "running",
        "model": {
            "name": config.MODEL_NAME,
            "dimension": config.EMBEDDING_DIM
        },
        "index": {
            "total_vectors": vector_index.index.ntotal if vector_index else 0
        }
    }


@app.post("/search")
async def search(request: SearchRequest):
    """Semantic search endpoint with pagination and caching"""
    try:
        logger.info("search_started", query=request.query, k=request.k, offset=request.offset, limit=request.limit)
        
        # Generate cache key
        cache_key = f"{request.query}:{request.k}:{request.offset}:{request.limit}"
        
        # Check cache
        if cache_key in search_cache:
            logger.info("cache_hit", cache_key=cache_key)
            return search_cache[cache_key]
        
        # Encode query
        query_embedding = embedder.encode_single(request.query)
        
        # Search index - get more results than needed for pagination
        search_k = min(request.k + request.offset + request.limit, 100)
        distances, indices, result_pids = vector_index.search(query_embedding, k=search_k)
        
        # Convert to simple dict - use distances[0][i] pattern
        # Convert all numpy types to native Python types
        all_results = []
        for i, pid in enumerate(result_pids):
            if pid in product_metadata:
                meta = product_metadata[pid]
                # Use .item() to convert numpy scalar to Python native type
                score_val = distances[0][i].item() if hasattr(distances[0][i], 'item') else float(distances[0][i])
                all_results.append({
                    "pid": str(meta['pid']),
                    "title": str(meta['title']),
                    "brand": str(meta['brand']),
                    "category": str(meta['category']),
                    "sub_category": str(meta['sub_category']),
                    "price": str(meta['selling_price']),
                    "rating": str(meta['average_rating']),
                    "score": score_val
                })
        
        # Apply pagination
        paginated_results = all_results[request.offset:request.offset + request.limit]
        
        response = {
            "query": request.query,
            "results": paginated_results,
            "total": len(all_results),
            "offset": request.offset,
            "limit": request.limit
        }
        
        # Cache the response
        search_cache[cache_key] = response
        logger.info("search_completed", results_count=len(paginated_results), total=len(all_results))
        
        return response
    except Exception as e:
        import traceback
        logger.error("search_failed", error=str(e), traceback=traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": embedder is not None,
        "index_loaded": vector_index is not None,
        "metadata_loaded": product_metadata is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)
