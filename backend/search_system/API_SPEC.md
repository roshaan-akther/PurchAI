# Semantic Search API Specification

## Overview

The Semantic Search API provides intelligent product search using sentence-transformers embeddings and FAISS vector indexing. The API supports semantic search with pagination, input validation, and caching for optimal performance.

**Base URL:** `http://0.0.0.0:8020`

**Model:** `sentence-transformers/all-MiniLM-L6-v2` (ONNX quantized)

**Indexed Products:** 28,258

**Embedding Dimension:** 384

---

## Endpoints

### 1. Search Endpoint

Performs semantic search across the product catalog using natural language queries.

#### Request

- **Method:** `POST`
- **Path:** `/search`
- **Content-Type:** `application/json`

#### Request Body

```json
{
  "query": "string",
  "k": "integer (optional)",
  "offset": "integer (optional)",
  "limit": "integer (optional)"
}
```

#### Parameters

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `query` | string | Yes | - | 1-500 characters, non-empty | Search query text |
| `k` | integer | No | 10 | 1-100 | Number of results to retrieve from FAISS |
| `offset` | integer | No | 0 | ≥0 | Number of results to skip (pagination) |
| `limit` | integer | No | 10 | 1-100 | Number of results to return (pagination) |

#### Validation Rules

- **query:** Cannot be empty or whitespace only. Maximum 500 characters.
- **k:** Must be between 1 and 100 inclusive.
- **offset:** Must be non-negative.
- **limit:** Must be between 1 and 100 inclusive.

#### Request Example

```bash
curl -X POST http://localhost:8020/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "red t-shirt",
    "k": 10,
    "offset": 0,
    "limit": 5
  }'
```

#### Response

**Status Code:** `200 OK`

```json
{
  "query": "string",
  "results": [
    {
      "pid": "string",
      "title": "string",
      "brand": "string",
      "category": "string",
      "sub_category": "string",
      "price": "string",
      "rating": "string",
      "score": "float"
    }
  ],
  "total": "integer",
  "offset": "integer",
  "limit": "integer"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `query` | string | The original search query |
| `results` | array | Array of product results (paginated) |
| `results[].pid` | string | Product ID |
| `results[].title` | string | Product title |
| `results[].brand` | string | Product brand |
| `results[].category` | string | Product category |
| `results[].sub_category` | string | Product sub-category |
| `results[].price` | string | Product selling price |
| `results[].rating` | string | Product average rating |
| `results[].score` | float | Semantic similarity score (0-1, higher is better) |
| `total` | integer | Total number of results found (before pagination) |
| `offset` | integer | Offset used in the request |
| `limit` | integer | Limit used in the request |

#### Response Example

```json
{
  "query": "red t-shirt",
  "results": [
    {
      "pid": "TSHFGYYGZHJMMSJB",
      "title": "Color Block Men Round Neck Red T-Shirt",
      "brand": "SayItLo",
      "category": "Clothing and Accessories",
      "sub_category": "Topwear",
      "price": "349",
      "rating": "4.2",
      "score": 0.6710643768310547
    },
    {
      "pid": "TSHFYF6FNQTSUGYB",
      "title": "Solid Men V Neck Red T-Shirt",
      "brand": "NEXT ",
      "category": "Clothing and Accessories",
      "sub_category": "Topwear",
      "price": "349",
      "rating": "4.3",
      "score": 0.6667630076408386
    }
  ],
  "total": 15,
  "offset": 0,
  "limit": 5
}
```

#### Error Responses

**Validation Error (422 Unprocessable Entity)**

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "query"],
      "msg": "Value error, Query cannot be empty",
      "input": "",
      "ctx": {"error": {}}
    }
  ]
}
```

**Server Error (500 Internal Server Error)**

```json
{
  "detail": "Error message describing the issue"
}
```

---

### 2. Health Check Endpoint

Checks the health status of the API and its components.

#### Request

- **Method:** `GET`
- **Path:** `/health`

#### Request Example

```bash
curl http://localhost:8020/health
```

#### Response

**Status Code:** `200 OK`

```json
{
  "status": "string",
  "model_loaded": "boolean",
  "index_loaded": "boolean",
  "metadata_loaded": "boolean"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Health status ("healthy" or "unhealthy") |
| `model_loaded` | boolean | Whether the embedding model is loaded |
| `index_loaded` | boolean | Whether the FAISS index is loaded |
| `metadata_loaded` | boolean | Whether product metadata is loaded |

#### Response Example

```json
{
  "status": "healthy",
  "model_loaded": true,
  "index_loaded": true,
  "metadata_loaded": true
}
```

---

### 3. Root Endpoint

Returns API information and configuration.

#### Request

- **Method:** `GET`
- **Path:** `/`

#### Request Example

```bash
curl http://localhost:8020/
```

#### Response

**Status Code:** `200 OK`

```json
{
  "message": "string",
  "status": "string",
  "model": {
    "name": "string",
    "dimension": "integer"
  },
  "index": {
    "total_vectors": "integer"
  }
}
```

#### Response Example

```json
{
  "message": "Semantic Search API",
  "status": "running",
  "model": {
    "name": "sentence-transformers/all-MiniLM-L6-v2",
    "dimension": 384
  },
  "index": {
    "total_vectors": 28258
  }
}
```

---

## Features

### 1. Input Validation

All requests are validated using Pydantic models:

- Query validation: Non-empty, max 500 characters
- Parameter range validation: k, offset, limit
- Automatic error responses with detailed messages

### 2. Pagination

Results support offset-based pagination:

- `offset`: Skip N results (default: 0)
- `limit`: Return N results (default: 10, max: 100)
- `total`: Total available results in response

### 3. Query Caching

Frequent queries are cached in-memory:

- Cache key: `query:k:offset:limit`
- Automatic cache hit detection
- Significantly faster response times for repeated queries

### 4. CORS Support

Cross-Origin Resource Sharing enabled for:

- `http://localhost:3000`
- `http://localhost:8000`
- `http://127.0.0.1:3000`

All methods and headers allowed.

### 5. Structured Logging

JSON-formatted logging for observability:

- Startup/shutdown events
- Search operations with parameters
- Cache hits/misses
- Error tracking with stack traces

### 6. Model Quantization

ONNX backend with INT8 quantization:

- Pre-quantized model: `model_qint8_avx512_vnni.onnx`
- ~3x faster inference than PyTorch
- Smaller memory footprint

---

## Performance

### Indexing

- **Products Indexed:** 28,258
- **Embedding Generation:** ~3.25 it/s (ONNX)
- **Total Indexing Time:** ~4.5 minutes (full dataset)

### Search

- **Single Query (cache miss):** ~200ms
- **Single Query (cache hit):** ~5ms
- **FAISS Search:** <10ms

### Model

- **Model:** sentence-transformers/all-MiniLM-L6-v2
- **Backend:** ONNX Runtime (quantized)
- **Embedding Dimension:** 384
- **Provider:** CPUExecutionProvider

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 422 | Validation error |
| 500 | Internal server error |

### Error Response Format

All errors return JSON with a `detail` field:

```json
{
  "detail": "Error message or validation details"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production deployments.

---

## Authentication

Currently no authentication is required. Consider adding API key or JWT authentication for production deployments.

---

## OpenAPI/Swagger Documentation

Interactive API documentation available at:

- **Swagger UI:** `http://localhost:8020/docs`
- **ReDoc:** `http://localhost:8020/redoc`

---

## Example Usage

### Python

```python
import requests

# Search with pagination
response = requests.post(
    "http://localhost:8020/search",
    json={
        "query": "red t-shirt",
        "k": 10,
        "offset": 0,
        "limit": 5
    }
)
results = response.json()
print(f"Found {results['total']} products")
for product in results['results']:
    print(f"{product['title']} - {product['price']}")

# Health check
health = requests.get("http://localhost:8020/health").json()
print(f"Status: {health['status']}")
```

### JavaScript

```javascript
// Search with pagination
const response = await fetch('http://localhost:8020/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'red t-shirt',
    k: 10,
    offset: 0,
    limit: 5
  })
});
const results = await response.json();
console.log(`Found ${results.total} products`);
results.results.forEach(product => {
  console.log(`${product.title} - ${product.price}`);
});

// Health check
const health = await fetch('http://localhost:8020/health').then(r => r.json());
console.log(`Status: ${health.status}`);
```

---

## Deployment

### Requirements

- Python 3.8+
- Dependencies listed in `requirements.txt`

### Running the Server

```bash
# Install dependencies
pip install -r requirements.txt

# Build the index
python main.py

# Start the API server
python api.py
```

The server will start on `http://0.0.0.0:8020`

### Environment Variables

No environment variables required. Configuration is in `config.py`.

---

## Version History

- **v1.0.0** - Initial release with semantic search
- **v1.1.0** - Added pagination, input validation, CORS
- **v1.2.0** - Added structured logging, query caching
- **v1.3.0** - Added ONNX quantization for faster inference

---

## Support

For issues or questions, refer to the project documentation or contact the development team.
