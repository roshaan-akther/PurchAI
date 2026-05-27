"""
Data preprocessing for W-ALS Recommendation System
Cleans and normalizes raw product data
"""

import re
from typing import Dict, List
import config


def clean_price(price_str: str) -> int:
    """Convert price string to int"""
    if not price_str:
        return 0
    # Remove commas, currency symbols, and whitespace
    cleaned = re.sub(r'[,\₹\s]', '', str(price_str))
    try:
        return int(cleaned)
    except ValueError:
        return 0


def clean_rating(rating_str: str) -> float:
    """Convert rating string to float"""
    if not rating_str:
        return 0.0
    try:
        return float(rating_str)
    except ValueError:
        return 0.0


def normalize_brand(brand: str) -> str:
    """Normalize brand name"""
    if not brand:
        return "Unknown"
    return brand.strip().title()


def normalize_category(category: str) -> str:
    """Normalize category"""
    if not category:
        return "Unknown"
    return category.strip()


def normalize_sub_category(sub_category: str) -> str:
    """Normalize sub-category"""
    if not sub_category:
        return "Unknown"
    return sub_category.strip()


def clean_product(product: Dict) -> Dict:
    """Clean single product dict"""
    return {
        'pid': product.get('pid'),
        'title': product.get('title', ''),
        'brand': normalize_brand(product.get('brand', '')),
        'category': normalize_category(product.get('category', '')),
        'sub_category': normalize_sub_category(product.get('sub_category', '')),
        'selling_price': clean_price(product.get('selling_price', '0')),
        'actual_price': clean_price(product.get('actual_price', '0')),
        'average_rating': clean_rating(product.get('average_rating', '0')),
        'out_of_stock': product.get('out_of_stock', False),
        'description': product.get('description', '')
    }


def filter_products(products: List[Dict]) -> List[Dict]:
    """Filter out invalid products"""
    filtered = []
    for p in products:
        cleaned = clean_product(p)
        # Filter out:
        # - Missing pid
        # - Out of stock (if configured)
        # - Invalid price
        # - Price outside range
        if (cleaned['pid'] and 
            (not config.FILTER_OUT_OF_STOCK or not cleaned['out_of_stock']) and 
            cleaned['selling_price'] > 0 and
            config.MIN_PRICE <= cleaned['selling_price'] <= config.MAX_PRICE):
            filtered.append(cleaned)
    return filtered


def bin_price(price: int) -> str:
    """Bin price into ranges"""
    for bin_name, (min_val, max_val) in config.PRICE_BINS.items():
        if min_val <= price < max_val:
            return bin_name
    return "5000+"  # Default to highest bin


def bin_rating(rating: float) -> str:
    """Bin rating into ranges"""
    for bin_name, (min_val, max_val) in config.RATING_BINS.items():
        if min_val <= rating < max_val:
            return bin_name
    return "medium"  # Default to medium
