"""
Recommender for W-ALS Recommendation System
Generates recommendations for users
"""

import numpy as np
from model.matrix_factorization import MatrixFactorization
from typing import List, Optional
import config


def recommend_for_user(
    model: MatrixFactorization,
    dataset,
    user_id: str,
    user_features=None,
    k: int = None
) -> List[str]:
    """
    Get recommendations for a specific user
    
    Args:
        model: Trained MatrixFactorization model
        dataset: SimpleDataset object
        user_id: External user ID
        user_features: User features (optional, not used in simple version)
        k: Number of recommendations to return
    
    Returns:
        List of recommended product IDs
    """
    k = k or config.DEFAULT_K
    
    user_mapping = dataset.mapping()[0]
    if user_id not in user_mapping:
        print(f"User {user_id} not found in dataset")
        return []
    
    user_internal_id = user_mapping[user_id]
    
    item_mapping = dataset.mapping()[1]
    item_internal_ids = list(item_mapping.values())
    
    scores = model.predict(user_internal_id, item_internal_ids)
    
    top_indices = np.argsort(-scores)[:k]
    
    internal_to_external = {v: k for k, v in item_mapping.items()}
    recommended_items = [internal_to_external[item_internal_ids[i]] for i in top_indices]
    
    return recommended_items


def recommend_for_new_user(
    model: MatrixFactorization,
    dataset,
    user_features,
    k: int = None
) -> List[str]:
    """
    Get recommendations for a new user (cold start)
    Uses popularity-based recommendations
    
    Args:
        model: Trained MatrixFactorization model
        dataset: SimpleDataset object
        user_features: User features (not used in simple version)
        k: Number of recommendations to return
    
    Returns:
        List of recommended product IDs
    """
    k = k or config.DEFAULT_K
    
    item_mapping = dataset.mapping()[1]
    item_internal_ids = list(item_mapping.values())
    
    avg_item_emb = np.mean(model.item_embeddings, axis=0)
    similarities = model.item_embeddings @ avg_item_emb
    
    top_indices = np.argsort(-similarities)[:k]
    
    item_id_map = {v: k for k, v in item_mapping.items()}
    recommended_items = [item_id_map[i] for i in top_indices]
    
    return recommended_items


def batch_recommend(
    model: MatrixFactorization,
    dataset,
    user_ids: List[str],
    user_features=None,
    k: int = None
) -> dict:
    """
    Get recommendations for multiple users
    
    Args:
        model: Trained MatrixFactorization model
        dataset: SimpleDataset object
        user_ids: List of user IDs
        user_features: User features (optional, not used in simple version)
        k: Number of recommendations per user
    
    Returns:
        Dictionary mapping user_id to list of recommended product IDs
    """
    k = k or config.DEFAULT_K
    recommendations = {}
    
    for user_id in user_ids:
        recs = recommend_for_user(model, dataset, user_id, user_features, k)
        recommendations[user_id] = recs
    
    return recommendations
