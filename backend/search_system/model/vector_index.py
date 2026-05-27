"""
Vector index using FAISS for fast similarity search
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
import pickle
import numpy as np
import faiss


class VectorIndex:
    """FAISS vector index for fast similarity search"""
    
    def __init__(self, dimension=None):
        """
        Initialize FAISS index
        """
        self.dimension = dimension or config.EMBEDDING_DIM
        self.index = None
        self.pids = None  # Store product IDs in order
        
    def build_index(self, embeddings, pids):
        """
        Build FAISS index from embeddings
        embeddings: numpy array of shape (n, d)
        pids: list of product IDs corresponding to embeddings
        """
        print(f"Building FAISS index for {len(embeddings)} vectors...")
        
        # Normalize embeddings (already normalized, but ensure)
        faiss.normalize_L2(embeddings)
        
        # Create index (Inner Product = Cosine Similarity for normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        
        # Add vectors to index
        self.index.add(embeddings.astype('float32'))
        
        # Store product IDs
        self.pids = np.array(pids)
        
        print(f"Index built. Total vectors: {self.index.ntotal}")
    
    def search(self, query_embedding, k=None):
        """
        Search for similar vectors
        query_embedding: numpy array of shape (d,) or (1, d)
        k: number of results to return
        Returns: (distances, indices, pids) where distances and indices are 2D arrays (n_queries, k)
        """
        k = k or config.DEFAULT_K
        
        # Ensure query is 2D
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        # Normalize query
        faiss.normalize_L2(query_embedding)
        
        # Search - FAISS returns (n_queries, k) shape
        distances, indices = self.index.search(query_embedding.astype('float32'), k)
        
        # Get product IDs from indices
        result_pids = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.pids):
                result_pids.append(self.pids[idx])
        
        return distances, indices, result_pids
    
    def save_index(self, path):
        """Save FAISS index to disk"""
        faiss.write_index(self.index, path)
        print(f"FAISS index saved to {path}")
    
    def load_index(self, path):
        """Load FAISS index from disk"""
        self.index = faiss.read_index(path)
        print(f"FAISS index loaded from {path}")
    
    def save_metadata(self, pids, path):
        """Save product IDs metadata"""
        with open(path, 'wb') as f:
            pickle.dump(pids, f)
        print(f"Metadata saved to {path}")
    
    def load_metadata(self, path):
        """Load product IDs metadata"""
        with open(path, 'rb') as f:
            self.pids = np.array(pickle.load(f))
        print(f"Metadata loaded from {path}")
