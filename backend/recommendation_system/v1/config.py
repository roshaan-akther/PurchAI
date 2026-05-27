"""
Configuration for W-ALS Recommendation System
Optimized for implicit feedback (purchases, clicks)
"""

# File Paths
DATA_DIR = "/home/roshaan/Desktop/purchai/backend/reco_sys/datasets"
TRAIN_DIR = "/home/roshaan/Desktop/purchai/backend/reco_sys/train"

PRODUCTS_PATH = "/home/roshaan/Desktop/purchai/purchai_v1-beta/backend/flipkart_fashion_products_dataset.json"
USERS_PATH = f"{DATA_DIR}/synthetic_users.json"
PURCHASES_PATH = f"{DATA_DIR}/synthetic_purchases.json"
GENERATION_STATS_PATH = f"{DATA_DIR}/generation_stats.json"

MODEL_PATH = f"{TRAIN_DIR}/wals_model.pkl"
DATASET_PATH = f"{TRAIN_DIR}/wals_dataset.pkl"
TRAINING_LOG_PATH = f"{TRAIN_DIR}/training_log.txt"

# W-ALS Model Hyperparameters (Optimized for implicit feedback)
NO_COMPONENTS = 128  # Embedding dimension (increased for better quality)
REG = 0.01  # Regularization parameter (prevents overfitting)
ALPHA = 40  # Confidence parameter for implicit feedback (C_ui = 1 + alpha * R_ui)
EPOCHS = 30  # Maximum training epochs
NUM_THREADS = 4  # Number of CPU cores to use

# Early Stopping
EARLY_STOPPING_PATIENCE = 5  # Stop if no improvement for N epochs
MIN_DELTA = 0.001  # Minimum improvement to consider as progress

# Feature Binning Thresholds
PRICE_BINS = {
    "0-500": (0, 500),
    "500-1000": (500, 1000),
    "1000-2000": (1000, 2000),
    "2000-5000": (2000, 5000),
    "5000+": (5000, float('inf'))
}

RATING_BINS = {
    "very_low": (0, 2.0),
    "low": (2.0, 3.0),
    "medium_low": (3.0, 3.5),
    "medium": (3.5, 4.0),
    "high": (4.0, 4.5),
    "very_high": (4.5, 5.0)
}

# Inference Parameters
DEFAULT_K = 10  # Number of recommendations to return

# Data Filtering
FILTER_OUT_OF_STOCK = True
MIN_PRICE = 0
MAX_PRICE = 100000

# Logging
LOG_LEVEL = "INFO"
