"""
User feature extraction for W-ALS Recommendation System
"""

from typing import List, Dict, Set


def extract_user_features(user: Dict) -> List[str]:
    """Extract features from a single user"""
    features = []
    
    # Category feature
    if user.get('primary_category'):
        features.append(f"category:{user['primary_category']}")
    
    # Sub-category feature
    if user.get('primary_sub_category'):
        features.append(f"sub_category:{user['primary_sub_category']}")
    
    # Price range preference
    if user.get('price_range_preference'):
        features.append(f"price_range:{user['price_range_preference']}")
    
    # Purchase frequency
    if user.get('purchase_frequency'):
        features.append(f"frequency:{user['purchase_frequency']}")
    
    # Brand preferences
    if user.get('preferred_brands'):
        for brand in user['preferred_brands']:
            if brand:
                features.append(f"brand:{brand}")
    
    return features


def get_all_user_features(users: List[Dict]) -> Set[str]:
    """Get all unique user features from users"""
    all_features = set()
    for user in users:
        features = extract_user_features(user)
        all_features.update(features)
    return all_features
