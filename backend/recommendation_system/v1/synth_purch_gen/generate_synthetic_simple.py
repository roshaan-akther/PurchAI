"""
Simple synthetic data generator for current flipkart dataset
"""
import json
import random
from datetime import datetime, timedelta
from collections import defaultdict

# Load products
print("Loading products...")
with open('/home/roshaan/Desktop/purchai/purchai_v1-beta/backend/flipkart_fashion_products_dataset.json') as f:
    products = json.load(f)

# Filter valid products
valid_products = [p for p in products if p.get('pid') and not p.get('out_of_stock', False)]
print(f"Loaded {len(valid_products)} valid products")

# Build indices
category_to_products = defaultdict(list)
brand_to_products = defaultdict(list)
for p in valid_products:
    category_to_products[p['category']].append(p)
    brand_to_products[p['brand']].append(p)

# Generate users
print("Generating 100 synthetic users...")
users = []
for i in range(100):
    # Select primary category
    category = random.choice(list(category_to_products.keys()))
    products_in_category = category_to_products[category]
    
    # Select brands from category
    brands_in_category = list(set(p['brand'] for p in products_in_category))
    preferred_brands = random.sample(brands_in_category, min(3, len(brands_in_category)))
    
    user = {
        "user_id": f"user_{i}",
        "primary_category": category,
        "primary_sub_category": products_in_category[0]['sub_category'] if products_in_category else "Unknown",
        "preferred_brands": preferred_brands,
        "price_range_preference": random.choice(["low", "medium", "high"]),
        "brand_loyalty": random.random(),
        "category_affinity": random.random(),
        "purchase_frequency": random.choice(["low", "medium", "high"])
    }
    users.append(user)

# Generate purchases
print("Generating purchases...")
purchases_data = []
for user in users:
    user_purchases = []
    
    # Determine purchase count
    freq_map = {"low": 20, "medium": 35, "high": 50}
    n_purchases = random.randint(freq_map[user["purchase_frequency"]] - 5, freq_map[user["purchase_frequency"]] + 5)
    
    # Generate purchases
    for _ in range(n_purchases):
        # Select product based on preferences
        if random.random() < user["category_affinity"]:
            # Stay in primary category
            candidates = category_to_products[user["primary_category"]]
        else:
            # Random category
            candidates = valid_products
        
        if random.random() < user["brand_loyalty"] and len(user["preferred_brands"]) > 0:
            # Filter by preferred brand
            brand_candidates = [p for p in candidates if p['brand'] in user["preferred_brands"]]
            if brand_candidates:
                candidates = brand_candidates
        
        if candidates:
            product = random.choice(candidates)
            timestamp = datetime.now() - timedelta(days=random.randint(0, 365))
            
            user_purchases.append({
                "product_id": product['pid'],
                "timestamp": timestamp.isoformat(),
                "quantity": random.randint(1, 3),
                "event_type": "purchase"
            })
    
    purchases_data.append({
        "user_id": user["user_id"],
        "purchases": user_purchases
    })

# Save data
print("Saving data...")
with open('/home/roshaan/Desktop/purchai/backend/reco_sys/datasets/synthetic_users.json', 'w') as f:
    json.dump(users, f, indent=2)

with open('/home/roshaan/Desktop/purchai/backend/reco_sys/datasets/synthetic_purchases.json', 'w') as f:
    json.dump(purchases_data, f, indent=2)

# Calculate stats
total_purchases = sum(len(d['purchases']) for d in purchases_data)
stats = {
    "total_users": len(users),
    "total_purchases": total_purchases,
    "avg_purchases_per_user": total_purchases / len(users),
    "invalid_product_ids": 0,
    "category_distribution": dict([(c, len(v)) for c, v in category_to_products.items()]),
    "brand_distribution": dict([(b, len(v)) for b, v in list(brand_to_products.items())[:10]])
}

with open('/home/roshaan/Desktop/purchai/backend/reco_sys/datasets/generation_stats.json', 'w') as f:
    json.dump(stats, f, indent=2)

print(f"Generated {len(users)} users with {total_purchases} total purchases")
print("Data saved to datasets/")
