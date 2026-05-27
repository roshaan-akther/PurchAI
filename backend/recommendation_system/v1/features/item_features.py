"""
Item feature extraction for W-ALS Recommendation System
"""

from typing import List, Dict, Set
import config
from data.preprocessor import bin_price, bin_rating


def extract_item_features(product: Dict) -> List[str]:
    """Extract features from a single product"""
    features = []
    
    # Brand feature
    if product.get('brand'):
        features.append(f"brand:{product['brand']}")
    
    # Category feature
    if product.get('category'):
        features.append(f"category:{product['category']}")
    
    # Sub-category feature
    if product.get('sub_category'):
        features.append(f"sub_category:{product['sub_category']}")
    
    # Price range feature
    if product.get('selling_price'):
        price_range = bin_price(product['selling_price'])
        features.append(f"price_range:{price_range}")
    
    # Rating feature
    if product.get('average_rating'):
        rating_bin = bin_rating(product['average_rating'])
        features.append(f"rating:{rating_bin}")
    
    return features


def get_all_item_features(products: List[Dict]) -> Set[str]:
    """Get all unique item features from products"""
    all_features = set()
    for product in products:
        features = extract_item_features(product)
        all_features.update(features)
    return all_features
