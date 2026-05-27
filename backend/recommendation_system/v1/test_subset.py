"""
Test script for subset of data
Tests the pipeline with 10 users and 100 products
"""

import sys
import config
from data.loader import load_and_clean_products, load_users, load_and_validate_interactions
from model.dataset_builder import build_dataset
from model.trainer import train_model
from model.persistence import save_model, save_dataset, save_training_log
from inference.recommender import recommend_for_user


def main():
    """Test pipeline with subset of data"""
    print("=" * 60)
    print("Testing with Subset of Data")
    print("=" * 60)
    
    # Step 1: Load subset of data
    print("\n[Step 1] Loading subset of data...")
    
    print("Loading products (first 1000)...")
    all_products = list(load_and_clean_products(config.PRODUCTS_PATH))
    products = all_products[:1000]  # Take first 1000
    print(f"  Loaded {len(products)} products")
    
    print("Loading users (first 10)...")
    all_users = load_users(config.USERS_PATH)
    users = all_users[:10]  # Take first 10
    print(f"  Loaded {len(users)} users")
    
    print("Loading interactions...")
    valid_product_ids = set(p['pid'] for p in products)
    all_interactions = load_and_validate_interactions(config.PURCHASES_PATH, valid_product_ids)
    
    # Filter interactions to only include our subset of users
    valid_user_ids = set(u['user_id'] for u in users)
    interactions = [(u, i, w) for u, i, w in all_interactions if u in valid_user_ids]
    print(f"  Loaded {len(interactions)} valid interactions")
    
    if len(interactions) == 0:
        print("ERROR: No interactions found for subset!")
        return
    
    # Step 2: Build dataset
    print("\n[Step 2] Building LightFM dataset...")
    dataset, interactions_matrix, item_features, user_features = build_dataset(
        users, products, interactions
    )
    
    # Step 3: Train model (fewer epochs for testing)
    print("\n[Step 3] Training model (5 epochs for testing)...")
    model, training_log = train_model(
        interactions_matrix,
        item_features,
        user_features,
        no_components=32,  # Smaller for testing
        learning_rate=0.01,
        epochs=5,  # Fewer epochs for testing
        early_stopping_patience=3
    )
    
    # Step 4: Test inference
    print("\n[Step 4] Testing inference...")
    test_user_id = users[0]['user_id']
    print(f"  Getting recommendations for {test_user_id}...")
    recommendations = recommend_for_user(model, dataset, test_user_id, user_features)
    print(f"  Top {len(recommendations)} recommendations:")
    for i, pid in enumerate(recommendations[:5], 1):
        product = next((p for p in products if p['pid'] == pid), None)
        if product:
            print(f"    {i}. {product['title']} ({product['brand']}) - ₹{product['selling_price']}")
    
    print("\n" + "=" * 60)
    print("Test completed successfully!")
    print("=" * 60)


if __name__ == '__main__':
    main()
