import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATASET_PATH = "/home/roshaan/Desktop/purchai/purchai_v1-beta/backend/flipkart_fashion_products_dataset.json"

async def ingest_data():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.purchai
    collection = db.products
    
    print(f"Reading dataset from {DATASET_PATH}...")
    try:
        with open(DATASET_PATH, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return

    print(f"Clearing existing products...")
    await collection.delete_many({})
    
    print(f"Ingesting {len(data)} products...")
    # Ingest in batches to avoid BSON limit if necessary, though motor handles this well
    batch_size = 1000
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        await collection.insert_many(batch)
    
    print("Creating indices...")
    await collection.create_index([("product_name", "text"), ("description", "text"), ("brand", "text")])
    await collection.create_index("pid")
    
    print("Ingestion complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(ingest_data())
