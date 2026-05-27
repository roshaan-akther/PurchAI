"""
Data loading for W-ALS Recommendation System
Loads JSON data with validation
"""

import json
from typing import List, Tuple, Dict, Generator
import config


def load_products(path: str) -> Generator[Dict, None, None]:
    """Stream products to avoid memory issues"""
    with open(path, 'r') as f:
        content = f.read()
        products = json.loads(content)
        for product in products:
            yield product


def load_users(path: str) -> List[Dict]:
    """Load users from JSON"""
    with open(path, 'r') as f:
        return json.load(f)


def load_interactions(path: str) -> List[Tuple[str, str, int]]:
    """Load interactions from JSON"""
    data = json.load(open(path))
    interactions = []
    for user_data in data:
        user_id = user_data['user_id']
        for purchase in user_data['purchases']:
            interactions.append((user_id, purchase['product_id'], purchase['quantity']))
    return interactions


def load_and_clean_products(path: str) -> List[Dict]:
    """Load and clean products"""
    from .preprocessor import clean_product, filter_products
    
    products = []
    for product in load_products(path):
        cleaned = clean_product(product)
        if cleaned['pid']:
            products.append(cleaned)
    
    filtered = filter_products(products)
    print(f"Loaded {len(products)} products, filtered to {len(filtered)} valid products")
    return filtered


def load_and_validate_interactions(
    path: str, 
    valid_product_ids: set
) -> List[Tuple[str, str, int]]:
    """Load and validate interactions against valid product IDs"""
    interactions = load_interactions(path)
    valid = []
    invalid_count = 0
    
    for user_id, product_id, weight in interactions:
        if product_id in valid_product_ids:
            valid.append((user_id, product_id, weight))
        else:
            invalid_count += 1
    
    print(f"Loaded {len(interactions)} interactions, filtered {invalid_count} invalid")
    return valid
