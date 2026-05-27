"""
Embedding generation using all-MiniLM-L6-v2
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingGenerator:
    """Generate embeddings using all-MiniLM-L6-v2"""
    
    def __init__(self, model_name=None, use_onnx=True):
        """
        Initialize embedding model
        
        Args:
            model_name: Name of the model to use
            use_onnx: Whether to use ONNX backend with quantization (default: True)
        """
        self.model_name = model_name or config.MODEL_NAME
        
        if use_onnx:
            print(f"Loading model with ONNX backend (quantized): {self.model_name}")
            # Use pre-quantized ONNX model for faster inference
            self.model = SentenceTransformer(
                self.model_name,
                backend="onnx",
                model_kwargs={
                    "file_name": "model_qint8_avx512_vnni.onnx",  # Quantized model
                    "provider": "CPUExecutionProvider"
                }
            )
        else:
            print(f"Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name, device='cpu')
        
        print(f"Model loaded. Embedding dimension: {self.model.get_embedding_dimension()}")
    
    def encode_batch(self, texts, batch_size=None, show_progress=True):
        """
        Encode a list of texts in batches
        Returns numpy array of embeddings
        """
        batch_size = batch_size or config.BATCH_SIZE
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True,
            normalize_embeddings=True  # Normalize for cosine similarity
        )
        return embeddings
    
    def encode_single(self, text):
        """
        Encode a single text
        Returns numpy array of embedding
        """
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding
    
    def save_embeddings(self, embeddings, path):
        """Save embeddings to disk"""
        with open(path, 'wb') as f:
            pickle.dump(embeddings, f)
        print(f"Embeddings saved to {path}")
    
    def load_embeddings(self, path):
        """Load embeddings from disk"""
        with open(path, 'rb') as f:
            embeddings = pickle.load(f)
        print(f"Embeddings loaded from {path}")
        return embeddings
