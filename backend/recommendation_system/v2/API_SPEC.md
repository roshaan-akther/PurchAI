# W-ALS Recommendation System API Specification

## Overview
This API provides product recommendations using Weighted Alternating Least Squares (W-ALS) matrix factorization for implicit feedback (purchase history).

**Base URL:** `http://localhost:8010`

**Model Performance:**
- Precision@10: 68.0%
- Embedding Dimension: 512
- Confidence Parameter (alpha): 200
- Regularization: 0.001

---

## Endpoints

### 1. Get System Status
**GET `/`**

Returns the current status of the recommendation system and model configuration.

**Response:**
```json
{
  "message": "W-ALS Recommendation API",
  "status": "running",
  "model": {
    "components": 512,
    "reg": 0.001,
    "alpha": 200
  }
}
```

---

### 2. Get Recommendations for Existing User
**POST `/recommend`**

Get personalized product recommendations for an existing user based on their purchase history.

**Request Body:**
```json
{
  "user_id": "user_0",
  "k": 10
}
```

**Parameters:**
- `user_id` (string, required): The external user ID
- `k` (integer, optional): Number of recommendations to return (default: 10)

**Response:**
```json
{
  "user_id": "user_0",
  "recommendations": [
    {
      "product_id": "VESFN9F3SSQDYUPH",
      "title": "VIP Men Vest (Pack of 3)",
      "brand": "Unknown",
      "category": "Clothing and Accessories",
      "sub_category": "Innerwear and Swimwear",
      "price": 271,
      "rating": 4.1
    },
    {
      "product_id": "TSHFGZXPCMXCXRA7",
      "title": "Sporty Men Round Neck Blue T-Shirt",
      "brand": "Reeb",
      "category": "Clothing and Accessories",
      "sub_category": "Topwear",
      "price": 632,
      "rating": 4.5
    }
  ]
}
```

**Error Response (500):**
```json
{
  "detail": "Error message"
}
```

---

### 3. Get Recommendations for New User (Cold Start)
**POST `/recommend/new-user`**

Get recommendations for a new user without purchase history using popularity-based approach.

**Request Body:**
```json
{
  "primary_category": "Clothing and Accessories",
  "primary_sub_category": "Topwear",
  "preferred_brands": ["Nike", "Adidas"],
  "price_range_preference": "medium",
  "k": 10
}
```

**Parameters:**
- `primary_category` (string, required): User's preferred product category
- `primary_sub_category` (string, required): User's preferred sub-category
- `preferred_brands` (array of strings, required): List of preferred brands
- `price_range_preference` (string, required): Price preference (low/medium/high)
- `k` (integer, optional): Number of recommendations to return (default: 10)

**Response:**
```json
{
  "user_id": "new_user",
  "recommendations": [
    {
      "product_id": "TSHFGZXPCMXCXRA7",
      "title": "Sporty Men Round Neck Blue T-Shirt",
      "brand": "Reeb",
      "category": "Clothing and Accessories",
      "sub_category": "Topwear",
      "price": 632,
      "rating": 4.5
    }
  ]
}
```

**Error Response (500):**
```json
{
  "detail": "Error message"
}
```

---

### 4. Get Personalized "Also Bought" Recommendations
**POST `/recommend/also-bought`**

Get personalized recommendations for a user viewing a specific product. Combines user's purchase history with the product they're currently viewing to provide personalized "people like you also bought" recommendations.

**Request Body:**
```json
{
  "user_id": "user_0",
  "product_id": "TSHFGZXPCMXCXRA7",
  "k": 10
}
```

**Parameters:**
- `user_id` (string, required): The external user ID (must have purchase history)
- `product_id` (string, required): The product ID the user is currently viewing
- `k` (integer, optional): Number of recommendations to return (default: 10)

**Response:**
```json
{
  "user_id": "user_0",
  "recommendations": [
    {
      "product_id": "VESFN9F3SSQDYUPH",
      "title": "VIP Men Vest (Pack of 3)",
      "brand": "Unknown",
      "category": "Clothing and Accessories",
      "sub_category": "Innerwear and Swimwear",
      "price": 271,
      "rating": 4.1
    },
    {
      "product_id": "TMLFMG8HBCAMTT9V",
      "title": "TT Men Top Thermal",
      "brand": "Unknown",
      "category": "Clothing and Accessories",
      "sub_category": "Winter Wear",
      "price": 283,
      "rating": 4.2
    }
  ]
}
```

**Error Response (404):**
```json
{
  "detail": "User not found"
}
```

**Error Response (404):**
```json
{
  "detail": "Product not found"
}
```

**Error Response (500):**
```json
{
  "detail": "Error message"
}
```

---

### 5. Health Check
**GET `/health`**

Check if the API is healthy and model is loaded.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "dataset_loaded": true
}
```

---

## Data Models

### RecommendationRequest
```typescript
{
  user_id: string;
  k?: number; // default: 10
}
```

### RecommendationResponse
```typescript
{
  user_id: string;
  recommendations: Product[];
}
```

### Product
```typescript
{
  product_id: string;
  title: string;
  brand: string;
  category: string;
  sub_category: string;
  price: number;
  rating: number;
}
```

### NewUserRequest
```typescript
{
  primary_category: string;
  primary_sub_category: string;
  preferred_brands: string[];
  price_range_preference: string; // "low" | "medium" | "high"
  k?: number; // default: 10
}
```

### AlsoBoughtRequest
```typescript
{
  user_id: string;
  product_id: string;
  k?: number; // default: 10
}
```

---

## Example Usage

### cURL Examples

**Get recommendations for existing user:**
```bash
curl -X POST http://localhost:8010/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_0", "k": 5}'
```

**Get recommendations for new user:**
```bash
curl -X POST http://localhost:8010/recommend/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "primary_category": "Clothing and Accessories",
    "primary_sub_category": "Topwear",
    "preferred_brands": ["Nike", "Adidas"],
    "price_range_preference": "medium",
    "k": 5
  }'
```

**Get personalized "also bought" recommendations:**
```bash
curl -X POST http://localhost:8010/recommend/also-bought \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_0",
    "product_id": "TSHFGZXPCMXCXRA7",
    "k": 5
  }'
```

**Health check:**
```bash
curl http://localhost:8010/health
```

### Python Example

```python
import requests

# Get recommendations for existing user
response = requests.post(
    "http://localhost:8010/recommend",
    json={"user_id": "user_0", "k": 10}
)
recommendations = response.json()

# Get recommendations for new user
response = requests.post(
    "http://localhost:8010/recommend/new-user",
    json={
        "primary_category": "Clothing and Accessories",
        "primary_sub_category": "Topwear",
        "preferred_brands": ["Nike", "Adidas"],
        "price_range_preference": "medium",
        "k": 10
    }
)
recommendations = response.json()

# Get personalized "also bought" recommendations
response = requests.post(
    "http://localhost:8010/recommend/also-bought",
    json={
        "user_id": "user_0",
        "product_id": "TSHFGZXPCMXCXRA7",
        "k": 10
    }
)
recommendations = response.json()
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 404 | User or product not found (for /recommend/also-bought) |
| 500 | Internal server error (model/dataset loading issues) |

---

## Performance Notes

- **Cold Start**: First request may be slower due to model loading
- **Scalability**: Current implementation loads all products into memory (28,258 products)
- **Response Time**: ~100-500ms per request after model is loaded
- **Model Size**: ~50MB (512-dimensional embeddings for 28K items)

---

## Model Details

**Algorithm**: Weighted Alternating Least Squares (W-ALS)

**Key Features:**
- Confidence weighting: C_ui = 1 + alpha * R_ui
- Implicit feedback (purchases, not ratings)
- 512-dimensional latent factors
- Early stopping for training optimization

**Training Data:**
- 28,258 products (Flipkart fashion dataset)
- 100 synthetic users
- 3,394 purchase interactions
- Precision@10: 68.0%

---

## Deployment

**Start the API server:**
```bash
cd /home/roshaan/Desktop/purchai/backend/recommendation_system/v2
python api.py
```

**Server runs on:** `http://0.0.0.0:8000`

**Dependencies:**
- fastapi==0.128.0
- uvicorn==0.35.0
- pydantic==2.12.4
- numpy==2.3.5
- scipy==1.16.2
