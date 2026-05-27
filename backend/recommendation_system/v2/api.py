"""
FastAPI endpoint for W-ALS Recommendation System
Provides REST API for recommendations
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import config
from model.persistence import load_model, load_dataset
from inference.recommender import recommend_for_user, recommend_for_new_user
from data.loader import load_and_clean_products

app = FastAPI(title="W-ALS Recommendation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and dataset at startup
model = None
dataset = None
products = None


class RecommendationRequest(BaseModel):
    user_id: str
    k: Optional[int] = 10


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[dict]


class NewUserRequest(BaseModel):
    primary_category: str
    primary_sub_category: str
    preferred_brands: List[str]
    price_range_preference: str
    k: Optional[int] = 10


class AlsoBoughtRequest(BaseModel):
    user_id: str
    product_id: str
    k: Optional[int] = 10


@app.on_event("startup")
async def startup_event():
    """Load model and dataset on startup"""
    global model, dataset, products
    
    print("Loading model and dataset...")
    model = load_model(config.MODEL_PATH)
    dataset = load_dataset(config.DATASET_PATH)
    products = load_and_clean_products(config.PRODUCTS_PATH)
    print("Model and dataset loaded successfully!")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "W-ALS Recommendation API",
        "status": "running",
        "model": {
            "components": model.n_components if model else None,
            "reg": model.reg if model else None,
            "alpha": model.alpha if model else None
        }
    }


@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get recommendations for a user"""
    try:
        recommendations = recommend_for_user(model, dataset, request.user_id, k=request.k)
        
        # Get product details
        product_details = []
        for pid in recommendations:
            product = next((p for p in products if p['pid'] == pid), None)
            if product:
                product_details.append({
                    "product_id": product['pid'],
                    "title": product['title'],
                    "brand": product['brand'],
                    "category": product['category'],
                    "sub_category": product['sub_category'],
                    "price": product['selling_price'],
                    "rating": product['average_rating'],
                    "image": product['images'][0] if product.get('images') and len(product['images']) > 0 else None
                })
        
        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=product_details
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/new-user", response_model=RecommendationResponse)
async def get_recommendations_for_new_user(request: NewUserRequest):
    """Get recommendations for a new user (cold start)"""
    try:
        user_features = {
            "primary_category": request.primary_category,
            "primary_sub_category": request.primary_sub_category,
            "preferred_brands": request.preferred_brands,
            "price_range_preference": request.price_range_preference
        }
        
        recommendations = recommend_for_new_user(model, dataset, user_features, k=request.k)
        
        # Get product details
        product_details = []
        for pid in recommendations:
            product = next((p for p in products if p['pid'] == pid), None)
            if product:
                product_details.append({
                    "product_id": product['pid'],
                    "title": product['title'],
                    "brand": product['brand'],
                    "category": product['category'],
                    "sub_category": product['sub_category'],
                    "price": product['selling_price'],
                    "rating": product['average_rating'],
                    "image": product['images'][0] if product.get('images') and len(product['images']) > 0 else None
                })
        
        return RecommendationResponse(
            user_id="new_user",
            recommendations=product_details
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/also-bought", response_model=RecommendationResponse)
async def get_also_bought_recommendations(request: AlsoBoughtRequest):
    """Get personalized 'also bought' recommendations for a user viewing a product"""
    try:
        user_mapping = dataset.mapping()[0]
        item_mapping = dataset.mapping()[1]
        
        if request.user_id not in user_mapping:
            raise HTTPException(status_code=404, detail="User not found")
        if request.product_id not in item_mapping:
            raise HTTPException(status_code=404, detail="Product not found")
        
        user_internal_id = user_mapping[request.user_id]
        product_internal_id = item_mapping[request.product_id]
        
        # Get user embedding and product embedding
        user_emb = model.user_embeddings[user_internal_id]
        product_emb = model.item_embeddings[product_internal_id]
        
        # Combine user and product context for personalized recommendations
        # Use user's preferences weighted by the product they're viewing
        combined_context = user_emb + product_emb
        
        # Score all items based on combined context
        item_embeddings = model.item_embeddings
        scores = item_embeddings @ combined_context
        
        # Get top k items (exclude the current product)
        item_internal_ids = list(item_mapping.values())
        top_indices = np.argsort(-scores)[:request.k + 1]
        
        # Filter out the current product
        recommended_internal_ids = [item_internal_ids[i] for i in top_indices 
                                    if item_internal_ids[i] != product_internal_id][:request.k]
        
        # Convert to external IDs
        internal_to_external = {v: k for k, v in item_mapping.items()}
        recommended_ids = [internal_to_external[i] for i in recommended_internal_ids]
        
        # Get product details
        product_details = []
        for pid in recommended_ids:
            product = next((p for p in products if p['pid'] == pid), None)
            if product:
                product_details.append({
                    "product_id": product['pid'],
                    "title": product['title'],
                    "brand": product['brand'],
                    "category": product['category'],
                    "sub_category": product['sub_category'],
                    "price": product['selling_price'],
                    "rating": product['average_rating'],
                    "image": product['images'][0] if product.get('images') and len(product['images']) > 0 else None
                })
        
        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=product_details
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "dataset_loaded": dataset is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
