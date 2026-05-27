"""
Main entry point for W-ALS Recommendation System
Orchestrates the entire training pipeline
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from data.loader import load_and_clean_products, load_users, load_and_validate_interactions
from model.dataset_builder import build_dataset
from model.trainer import train_model
from model.persistence import save_model, save_dataset, save_training_log
from inference.recommender import recommend_for_user


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("W-ALS Recommendation System - Training Pipeline")
    print("=" * 60)
    
    # Step 1: Load data
    print("\n[Step 1] Loading data...")
    print(f"  Products: {config.PRODUCTS_PATH}")
    print(f"  Users: {config.USERS_PATH}")
    print(f"  Purchases: {config.PURCHASES_PATH}")
    
    print("\nLoading products...")
    products = load_and_clean_products(config.PRODUCTS_PATH)
    print(f"  Loaded {len(products)} valid products")
    
    print("\nLoading users...")
    users = load_users(config.USERS_PATH)
    print(f"  Loaded {len(users)} users")
    
    print("\nLoading interactions...")
    valid_product_ids = set(p['pid'] for p in products)
    interactions = load_and_validate_interactions(config.PURCHASES_PATH, valid_product_ids)
    print(f"  Loaded {len(interactions)} valid interactions")
    
    # Step 2: Build dataset
    print("\n[Step 2] Building W-ALS dataset...")
    dataset, interactions_matrix, item_features, user_features = build_dataset(
        users, products, interactions
    )
    
    # Step 3: Train model
    print("\n[Step 3] Training W-ALS model...")
    model, training_log = train_model(
        interactions_matrix,
        item_features,
        user_features,
        no_components=config.NO_COMPONENTS,
        reg=config.REG,
        alpha=config.ALPHA,
        epochs=config.EPOCHS,
        num_threads=config.NUM_THREADS,
        early_stopping_patience=config.EARLY_STOPPING_PATIENCE,
        min_delta=config.MIN_DELTA
    )
    
    # Step 4: Save model and dataset
    print("\n[Step 4] Saving model and dataset...")
    
    # Create train directory if it doesn't exist
    os.makedirs(config.TRAIN_DIR, exist_ok=True)
    
    save_model(model, config.MODEL_PATH)
    save_dataset(dataset, config.DATASET_PATH)
    save_training_log(training_log, config.TRAINING_LOG_PATH)
    
    # Step 5: Test inference
    print("\n[Step 5] Testing inference...")
    test_user_id = users[0]['user_id']
    print(f"  Getting recommendations for {test_user_id}...")
    recommendations = recommend_for_user(model, dataset, test_user_id, user_features)
    print(f"  Top {len(recommendations)} recommendations:")
    for i, pid in enumerate(recommendations[:5], 1):
        product = next((p for p in products if p['pid'] == pid), None)
        if product:
            print(f"    {i}. {product['title']} ({product['brand']}) - ₹{product['selling_price']}")
    
    print("\n" + "=" * 60)
    print("Training pipeline completed successfully!")
    print("=" * 60)
    print(f"\nModel saved to: {config.MODEL_PATH}")
    print(f"Dataset saved to: {config.DATASET_PATH}")
    print(f"Training log saved to: {config.TRAINING_LOG_PATH}")


if __name__ == '__main__':
    main()
