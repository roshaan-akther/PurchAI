"""
Configuration for Semantic Search System
"""

import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")
INDEX_DIR = os.path.join(BASE_DIR, "index")

# Product dataset path
PRODUCTS_PATH = "/home/roshaan/Desktop/purchai/backend/recommendation_system/v2/datasets/flipkart_fashion_products_dataset.json"

# Model and index paths
EMBEDDINGS_PATH = os.path.join(INDEX_DIR, "product_embeddings.pkl")
FAISS_INDEX_PATH = os.path.join(INDEX_DIR, "faiss_index.bin")
PRODUCT_IDS_PATH = os.path.join(INDEX_DIR, "product_ids.pkl")
PRODUCT_METADATA_PATH = os.path.join(INDEX_DIR, "product_metadata.pkl")

# all-MiniLM-L6-v2 model
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

# Search parameters
DEFAULT_K = 10  # Number of results to return
BATCH_SIZE = 32  # Batch size for encoding

# Testing mode - limit to first N products for faster testing
TEST_MODE = False
TEST_PRODUCT_LIMIT = 100  # Only use first 100 products when TEST_MODE is True

# Text preprocessing
MAX_TEXT_LENGTH = 512  # Max tokens for model
