"""
Data loader for product search system
"""

import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config


def load_products():
    """
    Load products from JSON dataset
    Returns list of product dictionaries
    """
    print(f"Loading products from {config.PRODUCTS_PATH}...")
    
    with open(config.PRODUCTS_PATH, 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    print(f"Loaded {len(products)} products")
    return products


def preprocess_product(product):
    """
    Preprocess a single product for search
    Combine relevant fields into searchable text
    """
    # Combine title, brand, category, sub_category, and description
    # Weight important fields by repetition
    parts = []
    
    # Title (most important)
    if product.get('title'):
        parts.append(product['title'])
    
    # Brand (important)
    if product.get('brand'):
        parts.append(product['brand'])
    
    # Category and sub_category
    if product.get('category'):
        parts.append(product['category'])
    if product.get('sub_category'):
        parts.append(product['sub_category'])
    
    # Description (context)
    if product.get('description'):
        parts.append(product['description'])
    
    # Combine with spaces
    searchable_text = ' '.join(parts)
    
    return searchable_text


def prepare_search_documents(products):
    """
    Prepare documents for embedding
    Returns list of (pid, searchable_text, metadata) tuples
    """
    documents = []
    
    for product in products:
        # Skip if out of stock
        if product.get('out_of_stock', True):
            continue
        
        searchable_text = preprocess_product(product)
        
        metadata = {
            'pid': product.get('pid'),
            'title': product.get('title'),
            'brand': product.get('brand'),
            'category': product.get('category'),
            'sub_category': product.get('sub_category'),
            'selling_price': product.get('selling_price'),
            'average_rating': product.get('average_rating'),
            'description': product.get('description'),
        }
        
        documents.append((product.get('pid'), searchable_text, metadata))
    
    print(f"Prepared {len(documents)} searchable documents")
    return documents
