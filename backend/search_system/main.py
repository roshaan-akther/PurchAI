"""
Main script to build the search index
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from data.loader import load_products, prepare_search_documents
from model.embeddings import EmbeddingGenerator
from model.vector_index import VectorIndex
import pickle


def build_index():
    """
    Build the complete search index
    """
    print("=" * 60)
    print("Building Semantic Search Index")
    print("=" * 60)
    
    # 1. Load products
    products = load_products()
    
    # Limit products for testing if TEST_MODE is enabled
    if config.TEST_MODE:
        print(f"TEST_MODE: Limiting to first {config.TEST_PRODUCT_LIMIT} products")
        products = products[:config.TEST_PRODUCT_LIMIT]
    
    # 2. Prepare documents
    documents = prepare_search_documents(products)
    pids, texts, metadata_list = zip(*documents)
    pids = list(pids)
    texts = list(texts)
    metadata_list = list(metadata_list)
    
    # 3. Generate embeddings
    print("\nGenerating embeddings...")
    embedder = EmbeddingGenerator()
    embeddings = embedder.encode_batch(texts, show_progress=True)
    print(f"Generated embeddings shape: {embeddings.shape}")
    
    # 4. Build FAISS index
    print("\nBuilding FAISS index...")
    vector_index = VectorIndex()
    vector_index.build_index(embeddings, pids)
    
    # 5. Create directories
    os.makedirs(config.INDEX_DIR, exist_ok=True)
    
    # 6. Save everything
    print("\nSaving index and metadata...")
    embedder.save_embeddings(embeddings, config.EMBEDDINGS_PATH)
    vector_index.save_index(config.FAISS_INDEX_PATH)
    vector_index.save_metadata(pids, config.PRODUCT_IDS_PATH)
    
    # Save metadata separately for API
    metadata_dict = {pid: meta for pid, meta in zip(pids, metadata_list)}
    with open(config.PRODUCT_METADATA_PATH, 'wb') as f:
        pickle.dump(metadata_dict, f)
    
    print("\n" + "=" * 60)
    print("Index building complete!")
    print(f"Total products indexed: {len(pids)}")
    print(f"Embedding dimension: {embeddings.shape[1]}")
    print(f"Index saved to: {config.INDEX_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    build_index()
