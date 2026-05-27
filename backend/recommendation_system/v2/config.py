"""
Configuration for W-ALS Recommendation System
Optimized for implicit feedback (purchases, clicks)
"""

# File Paths
DATA_DIR = "/home/roshaan/Desktop/purchai/backend/recommendation_system/v2/datasets"
TRAIN_DIR = "/home/roshaan/Desktop/purchai/backend/recommendation_system/v2/train"

PRODUCTS_PATH = f"{DATA_DIR}/flipkart_fashion_products_dataset.json"
USERS_PATH = f"{DATA_DIR}/synthetic_users.json"
PURCHASES_PATH = f"{DATA_DIR}/synthetic_purchases.json"
GENERATION_STATS_PATH = f"{DATA_DIR}/generation_stats.json"

MODEL_PATH = f"{TRAIN_DIR}/wals_model.pkl"
DATASET_PATH = f"{TRAIN_DIR}/wals_dataset.pkl"
TRAINING_LOG_PATH = f"{TRAIN_DIR}/training_log.txt"

# W-ALS Model Hyperparameters (Optimized for implicit feedback)
NO_COMPONENTS = 512  # Embedding dimension
REG = 0.001  # Regularization parameter (prevents overfitting)
ALPHA = 200  # Confidence parameter for implicit feedback (C_ui = 1 + alpha * R_ui)
EPOCHS = 100  # Maximum training epochs
NUM_THREADS = 4  # Number of CPU cores to use

# Early Stopping
EARLY_STOPPING_PATIENCE = 20  # Stop if no improvement for N epochs
MIN_DELTA = 0.0001  # Minimum improvement to consider as progress

# Inference Parameters
DEFAULT_K = 10  # Number of recommendations to return

# Data Filtering
FILTER_OUT_OF_STOCK = True
MIN_PRICE = 0
MAX_PRICE = 100000

# Logging
LOG_LEVEL = "INFO"
