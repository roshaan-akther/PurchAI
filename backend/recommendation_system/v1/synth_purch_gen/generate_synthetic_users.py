#!/usr/bin/env python3
"""
Synthetic User Data Generator for Recommendation System
Generates 10K users with realistic purchase patterns from Flipkart dataset
Optimized with multiprocessing for parallel execution
"""

import json
import random
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Tuple, Set
import ijson
from pathlib import Path
from multiprocessing import Pool, cpu_count, Manager
from functools import partial
import time

# Configuration
NUM_USERS = 10000
DATASET_PATH = "/home/roshaan/Desktop/purchai/backend/flipkart_fashion_products_dataset.json"
OUTPUT_DIR = Path("/home/roshaan/Desktop/purchai/backend/reco_sys")
RANDOM_SEED = 42
NUM_WORKERS = min(cpu_count(), 8)  # Use up to 8 workers

# Set random seed for reproducibility
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


class ProductIndex:
    """Index product metadata for fast lookups - optimized for multiprocessing"""
    
    def __init__(self):
        self.products = {}  # pid -> product metadata
        self.category_to_products = defaultdict(list)
        self.brand_to_products = defaultdict(list)
        self.sub_category_to_products = defaultdict(list)
        self.price_range_to_products = defaultdict(list)
        self.category_weights = {}  # Pre-computed weights for sampling
        self.brand_weights = {}  # Pre-computed weights for sampling
        self.sub_category_weights = {}  # Pre-computed weights for sampling
        
    def add_product(self, product: dict):
        """Add a product to the index"""
        pid = product.get('pid')
        if not pid:
            return
            
        rating_str = product.get('average_rating', '0')
        try:
            average_rating = float(rating_str) if rating_str else 0.0
        except (ValueError, TypeError):
            average_rating = 0.0
        
        self.products[pid] = {
            'pid': pid,
            'title': product.get('title', ''),
            'brand': product.get('brand', ''),
            'category': product.get('category', ''),
            'sub_category': product.get('sub_category', ''),
            'selling_price': self._parse_price(product.get('selling_price', '0')),
            'actual_price': self._parse_price(product.get('actual_price', '0')),
            'average_rating': average_rating
        }
        
        # Build inverted indices
        category = product.get('category', '')
        brand = product.get('brand', '')
        sub_category = product.get('sub_category', '')
        price = self._parse_price(product.get('selling_price', '0'))
        price_range = self._get_price_range(price)
        
        if category:
            self.category_to_products[category].append(pid)
        if brand:
            self.brand_to_products[brand].append(pid)
        if sub_category:
            self.sub_category_to_products[sub_category].append(pid)
        self.price_range_to_products[price_range].append(pid)
    
    def _parse_price(self, price_str: str) -> int:
        """Parse price string to integer"""
        if isinstance(price_str, int):
            return price_str
        return int(price_str.replace(',', '').replace('₹', '').strip()) if price_str else 0
    
    def _get_price_range(self, price: int) -> str:
        """Categorize price into ranges"""
        if price < 500:
            return 'very_low'
        elif price < 1000:
            return 'low'
        elif price < 2000:
            return 'medium'
        elif price < 5000:
            return 'high'
        else:
            return 'very_high'
    
    def finalize_index(self):
        """Pre-compute weights for fast sampling"""
        # Category weights
        total_products = sum(len(products) for products in self.category_to_products.values())
        for category, products in self.category_to_products.items():
            self.category_weights[category] = len(products) / total_products
        
        # Brand weights
        for brand, products in self.brand_to_products.items():
            self.brand_weights[brand] = len(products)
        
        # Sub-category weights
        for sub_cat, products in self.sub_category_to_products.items():
            self.sub_category_weights[sub_cat] = len(products)
    
    def get_products_by_category(self, category: str) -> List[str]:
        return self.category_to_products.get(category, [])
    
    def get_products_by_brand(self, brand: str) -> List[str]:
        return self.brand_to_products.get(brand, [])
    
    def get_products_by_sub_category(self, sub_category: str) -> List[str]:
        return self.sub_category_to_products.get(sub_category, [])
    
    def get_products_by_price_range(self, price_range: str) -> List[str]:
        return self.price_range_to_products.get(price_range, [])
    
    def get_product(self, pid: str) -> dict:
        return self.products.get(pid, {})
    
    def get_serializable_data(self):
        """Return data that can be serialized for multiprocessing"""
        return {
            'products': self.products,
            'category_to_products': dict(self.category_to_products),
            'brand_to_products': dict(self.brand_to_products),
            'sub_category_to_products': dict(self.sub_category_to_products),
            'price_range_to_products': dict(self.price_range_to_products),
            'category_weights': self.category_weights,
            'brand_weights': self.brand_weights,
            'sub_category_weights': self.sub_category_weights
        }


def load_flipkart_dataset(dataset_path: str) -> ProductIndex:
    """Load and index Flipkart dataset - optimized streaming"""
    print("Loading Flipkart dataset...")
    start_time = time.time()
    index = ProductIndex()
    
    with open(dataset_path, 'r') as f:
        # Use ijson to stream JSON without loading entire file
        products = ijson.items(f, 'item')
        count = 0
        for product in products:
            index.add_product(product)
            count += 1
            if count % 100000 == 0:
                elapsed = time.time() - start_time
                rate = count / elapsed if elapsed > 0 else 0
                print(f"  Processed {count} products ({rate:.0f} products/sec)...")
    
    # Pre-compute weights for fast sampling
    index.finalize_index()
    
    elapsed = time.time() - start_time
    print(f"  Total products indexed: {len(index.products)}")
    print(f"  Categories: {len(index.category_to_products)}")
    print(f"  Brands: {len(index.brand_to_products)}")
    print(f"  Sub-categories: {len(index.sub_category_to_products)}")
    print(f"  Loading time: {elapsed:.2f} seconds")
    
    return index


def generate_user_profile(index: ProductIndex, user_id: int) -> dict:
    """Generate a user profile with realistic preferences"""
    
    # Select primary category (weighted by product count)
    categories = list(index.category_to_products.keys())
    category_weights = [len(index.category_to_products[cat]) for cat in categories]
    total_weight = sum(category_weights)
    category_probs = [w / total_weight for w in category_weights]
    primary_category = np.random.choice(categories, p=category_probs)
    
    # Select primary sub-category
    sub_categories = [sc for sc in index.sub_category_to_products.keys() 
                     if sc in [index.get_product(pid)['sub_category'] 
                              for pid in index.category_to_products[primary_category]]]
    if sub_categories:
        sub_weights = [len(index.sub_category_to_products[sc]) for sc in sub_categories]
        sub_total = sum(sub_weights)
        sub_probs = [w / sub_total for w in sub_weights]
        primary_sub_category = np.random.choice(sub_categories, p=sub_probs)
    else:
        primary_sub_category = index.get_product(index.category_to_products[primary_category][0])['sub_category']
    
    # Select preferred brands (2-5 brands from primary category)
    category_products = index.category_to_products[primary_category]
    brands_in_category = set(index.get_product(pid)['brand'] for pid in category_products)
    brands_in_category.discard('')
    
    # Handle case with no brands
    if not brands_in_category:
        brands_in_category = set(index.brand_to_products.keys())
        brands_in_category.discard('')
    
    num_brands = random.randint(1, min(5, len(brands_in_category)))
    if num_brands == 0:
        num_brands = 1
    
    brand_weights = [len(index.brand_to_products[b]) for b in brands_in_category]
    brand_total = sum(brand_weights)
    brand_probs = [w / brand_total for w in brand_weights] if brand_total > 0 else None
    if brand_probs:
        preferred_brands = list(np.random.choice(list(brands_in_category), 
                                                size=num_brands, 
                                                replace=False, 
                                                p=brand_probs))
    else:
        preferred_brands = list(brands_in_category)[:num_brands]
    
    # Price range preference
    category_prices = [index.get_product(pid)['selling_price'] for pid in category_products]
    price_33 = np.percentile(category_prices, 33)
    price_66 = np.percentile(category_prices, 66)
    
    price_roll = random.random()
    if price_roll < 0.33:
        price_range_preference = 'low'
    elif price_roll < 0.66:
        price_range_preference = 'medium'
    else:
        price_range_preference = 'high'
    
    # Behavioral parameters (beta distribution for realistic values)
    brand_loyalty = np.random.beta(2, 1)  # Skewed towards higher loyalty
    category_affinity = np.random.beta(2, 1)
    
    # Purchase frequency
    freq_roll = random.random()
    if freq_roll < 0.3:
        purchase_frequency = 'low'
    elif freq_roll < 0.8:
        purchase_frequency = 'medium'
    else:
        purchase_frequency = 'high'
    
    return {
        'user_id': f'user_{user_id}',
        'primary_category': primary_category,
        'primary_sub_category': primary_sub_category,
        'preferred_brands': preferred_brands,
        'price_range_preference': price_range_preference,
        'brand_loyalty': float(brand_loyalty),
        'category_affinity': float(category_affinity),
        'purchase_frequency': purchase_frequency
    }


def generate_purchase_timeline(num_purchases: int, start_date: datetime, end_date: datetime, rng: np.random.Generator) -> List[datetime]:
    """Generate purchase timestamps using Poisson process - optimized"""
    days = (end_date - start_date).days
    lambda_rate = num_purchases / days
    
    # Generate inter-arrival times using exponential distribution
    inter_arrivals = rng.exponential(1/lambda_rate, num_purchases)
    
    # Convert to timestamps
    timestamps = []
    current_time = start_date
    for delay in inter_arrivals:
        current_time += timedelta(days=delay)
        if current_time <= end_date:
            timestamps.append(current_time)
    
    # Sort and return
    timestamps.sort()
    
    # If we didn't get enough timestamps, add some randomly
    while len(timestamps) < num_purchases:
        random_time = start_date + timedelta(days=rng.random() * days)
        timestamps.append(random_time)
    
    timestamps.sort()
    return timestamps[:num_purchases]


def select_product_for_purchase(index_data: dict,
                                 profile: dict,
                                 purchased_products: Set[str],
                                 time_progress: float,
                                 rng: np.random.Generator) -> str:
    """Select a product for a purchase based on user profile and temporal dynamics - optimized"""
    
    # Adjust loyalty based on time progress (0 = early, 1 = recent)
    tau = 0.5  # 6 months in normalized time
    time_factor = 1 - np.exp(-time_progress / tau)
    adjusted_brand_loyalty = profile['brand_loyalty'] * (0.5 + 0.5 * time_factor)
    adjusted_category_affinity = profile['category_affinity'] * (0.5 + 0.5 * time_factor)
    
    # Determine category
    if rng.random() < adjusted_category_affinity:
        sub_category = profile['primary_sub_category']
    else:
        sub_categories = list(index_data['sub_category_weights'].keys())
        sub_weights = list(index_data['sub_category_weights'].values())
        sub_total = sum(sub_weights)
        sub_probs = [w / sub_total for w in sub_weights]
        sub_category = rng.choice(sub_categories, p=sub_probs)
    
    # Determine brand
    if rng.random() < adjusted_brand_loyalty:
        brand = rng.choice(profile['preferred_brands'])
    else:
        # Select from brands in sub-category
        sub_cat_products = index_data['sub_category_to_products'].get(sub_category, [])
        brands_in_sub = set(index_data['products'][pid]['brand'] for pid in sub_cat_products)
        brands_in_sub.discard('')
        if brands_in_sub:
            brand = rng.choice(list(brands_in_sub))
        else:
            brand = None
    
    # Determine price range
    price_preference = profile['price_range_preference']
    price_ranges = ['very_low', 'low', 'medium', 'high', 'very_high']
    price_idx = price_ranges.index(price_preference)
    price_idx_sampled = int(rng.normal(price_idx, 1))
    price_idx_sampled = max(0, min(len(price_ranges) - 1, price_idx_sampled))
    price_range = price_ranges[price_idx_sampled]
    
    # Filter products
    candidates = index_data['sub_category_to_products'].get(sub_category, [])
    
    if brand:
        brand_products = index_data['brand_to_products'].get(brand, [])
        candidates = [pid for pid in candidates if pid in brand_products]
    
    if price_range:
        price_products = index_data['price_range_to_products'].get(price_range, [])
        candidates = [pid for pid in candidates if pid in price_products]
    
    # Remove already purchased
    candidates = [pid for pid in candidates if pid not in purchased_products]
    
    # Relax constraints if no candidates
    if not candidates:
        candidates = index_data['sub_category_to_products'].get(sub_category, [])
        candidates = [pid for pid in candidates if pid not in purchased_products]
    
    if not candidates:
        candidates = list(index_data['products'].keys())
        candidates = [pid for pid in candidates if pid not in purchased_products]
    
    # Random selection
    if candidates:
        return rng.choice(candidates)
    else:
        return rng.choice(list(index_data['products'].keys()))


def generate_user_purchases(index_data: dict, profile: dict, rng: np.random.Generator) -> List[dict]:
    """Generate purchase history for a user - optimized"""
    
    # Determine purchase count
    freq_map = {'low': (20, 30), 'medium': (30, 40), 'high': (40, 50)}
    min_purchases, max_purchases = freq_map[profile['purchase_frequency']]
    num_purchases = rng.integers(min_purchases, max_purchases + 1)
    
    # Generate timeline
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    timestamps = generate_purchase_timeline(num_purchases, start_date, end_date, rng)
    
    # Generate purchases
    purchases = []
    purchased_products = set()
    
    for i, timestamp in enumerate(timestamps):
        time_progress = i / len(timestamps) if len(timestamps) > 0 else 0
        product_id = select_product_for_purchase(index_data, profile, purchased_products, time_progress, rng)
        
        # Determine quantity
        product = index_data['products'][product_id]
        price = product.get('selling_price', 0)
        
        if price < 500 and rng.random() < 0.2:
            quantity = rng.integers(2, 6)
        else:
            quantity = 1
        
        purchases.append({
            'product_id': product_id,
            'timestamp': timestamp.isoformat(),
            'quantity': quantity,
            'event_type': 'purchase'
        })
        
        purchased_products.add(product_id)
    
    return purchases


def generate_user_data_worker(args: Tuple[int, dict, int]) -> Tuple[dict, dict]:
    """Worker function for parallel user generation"""
    user_id, index_data, seed = args
    rng = np.random.default_rng(seed)
    
    profile = generate_user_profile(index_data, user_id, rng)
    purchases = generate_user_purchases(index_data, profile, rng)
    
    return profile, {'user_id': profile['user_id'], 'purchases': purchases}


def validate_data(index_data: dict,
                  users: List[dict],
                  purchases: List[dict]) -> dict:
    """Validate generated data - optimized"""
    print("Validating generated data...")
    
    stats = {
        'total_users': len(users),
        'total_purchases': sum(len(p['purchases']) for p in purchases),
        'avg_purchases_per_user': 0,
        'category_distribution': defaultdict(int),
        'brand_distribution': defaultdict(int),
        'purchase_count_distribution': defaultdict(int),
        'invalid_product_ids': 0
    }
    
    # Check product IDs
    for user_purchases in purchases:
        for purchase in user_purchases['purchases']:
            pid = purchase['product_id']
            if pid not in index_data['products']:
                stats['invalid_product_ids'] += 1
    
    # Calculate averages
    stats['avg_purchases_per_user'] = stats['total_purchases'] / stats['total_users']
    
    # Category distribution
    for user in users:
        stats['category_distribution'][user['primary_category']] += 1
    
    # Brand distribution
    for user in users:
        for brand in user['preferred_brands']:
            stats['brand_distribution'][brand] += 1
    
    # Purchase count distribution
    for user_purchases in purchases:
        count = len(user_purchases['purchases'])
        stats['purchase_count_distribution'][count] += 1
    
    print(f"  Total users: {stats['total_users']}")
    print(f"  Total purchases: {stats['total_purchases']}")
    print(f"  Avg purchases per user: {stats['avg_purchases_per_user']:.2f}")
    print(f"  Invalid product IDs: {stats['invalid_product_ids']}")
    
    return stats


def main():
    """Main execution - optimized with multiprocessing"""
    print("=" * 60)
    print("Synthetic User Data Generator (Parallel)")
    print("=" * 60)
    print(f"Using {NUM_WORKERS} workers")
    
    # Phase 1: Load and index products
    index = load_flipkart_dataset(DATASET_PATH)
    index_data = index.get_serializable_data()
    
    # Phase 2 & 3: Generate users and purchases in parallel
    print(f"\nGenerating {NUM_USERS} users with {NUM_WORKERS} workers...")
    start_time = time.time()
    
    # Prepare arguments for workers
    worker_args = [(i, index_data, RANDOM_SEED + i) for i in range(NUM_USERS)]
    
    # Generate in parallel
    with Pool(NUM_WORKERS) as pool:
        results = pool.map(generate_user_data_worker, worker_args)
    
    # Separate results
    users = []
    purchases = []
    for profile, user_purchases in results:
        users.append(profile)
        purchases.append(user_purchases)
    
    elapsed = time.time() - start_time
    print(f"  Generated {len(users)} users in {elapsed:.2f} seconds")
    print(f"  Rate: {len(users) / elapsed:.2f} users/second")
    
    # Phase 4: Validate
    stats = validate_data(index_data, users, purchases)
    
    # Phase 5: Save outputs
    print("\nSaving outputs...")
    
    # Save users
    users_path = OUTPUT_DIR / 'synthetic_users.json'
    with open(users_path, 'w') as f:
        json.dump(users, f, indent=2)
    print(f"  Saved users to {users_path}")
    
    # Save purchases
    purchases_path = OUTPUT_DIR / 'synthetic_purchases.json'
    with open(purchases_path, 'w') as f:
        json.dump(purchases, f, indent=2)
    print(f"  Saved purchases to {purchases_path}")
    
    # Save stats
    stats_path = OUTPUT_DIR / 'generation_stats.json'
    stats_serializable = {
        'total_users': stats['total_users'],
        'total_purchases': stats['total_purchases'],
        'avg_purchases_per_user': stats['avg_purchases_per_user'],
        'invalid_product_ids': stats['invalid_product_ids'],
        'category_distribution': dict(stats['category_distribution']),
        'brand_distribution': dict(stats['brand_distribution']),
        'purchase_count_distribution': dict(stats['purchase_count_distribution'])
    }
    with open(stats_path, 'w') as f:
        json.dump(stats_serializable, f, indent=2)
    print(f"  Saved stats to {stats_path}")
    
    total_time = time.time() - start_time
    print("\n" + "=" * 60)
    print("Generation complete!")
    print(f"Total time: {total_time:.2f} seconds")
    print("=" * 60)


if __name__ == '__main__':
    main()
