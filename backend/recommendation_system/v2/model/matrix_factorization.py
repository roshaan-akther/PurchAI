"""
Custom Matrix Factorization for W-ALS
Compatible with Python 3.14
Implements Weighted ALS (W-ALS) for implicit feedback
"""

import numpy as np
from scipy.sparse import coo_matrix, csr_matrix
from typing import Tuple, List


class MatrixFactorization:
    """
    Matrix Factorization for implicit feedback using Weighted ALS
    """
    
    def __init__(self, n_components=128, reg=0.01, alpha=40):
        """
        Initialize model
        
        Args:
            n_components: Embedding dimension
            reg: Regularization parameter
            alpha: Confidence parameter for implicit feedback (typically 40)
        """
        self.n_components = n_components
        self.reg = reg
        self.alpha = alpha
        self.user_embeddings = None
        self.item_embeddings = None
        self.user_bias = None
        self.item_bias = None
        self.global_bias = None
    
    def fit(self, interactions, item_features=None, user_features=None, epochs=20, verbose=True):
        """
        Train model using Weighted ALS (W-ALS)
        
        Args:
            interactions: Sparse matrix of user-item interactions
            item_features: Sparse matrix of item features (not used in simple version)
            user_features: Sparse matrix of user features (not used in simple version)
            epochs: Number of training epochs
            verbose: Print progress
        """
        n_users, n_items = interactions.shape
        
        # Initialize embeddings
        self.user_embeddings = np.random.normal(0, 0.01, (n_users, self.n_components))
        self.item_embeddings = np.random.normal(0, 0.01, (n_items, self.n_components))
        self.user_bias = np.zeros(n_users)
        self.item_bias = np.zeros(n_items)
        self.global_bias = np.log(interactions.nnz / (n_users * n_items) + 1)
        
        # Convert to CSR for efficient row operations
        interactions_csr = interactions.tocsr()
        interactions_csc = interactions.tocsc()
        
        # Create confidence matrix for W-ALS
        # C_ui = 1 + alpha * R_ui
        confidence_matrix = interactions_csr.copy()
        confidence_matrix.data = 1 + self.alpha * confidence_matrix.data
        
        for epoch in range(epochs):
            # Update user embeddings using ALS
            for u in range(n_users):
                item_indices = interactions_csr[u].indices
                if len(item_indices) == 0:
                    continue
                
                confidences = confidence_matrix[u].data
                item_emb = self.item_embeddings[item_indices]
                item_bias = self.item_bias[item_indices]
                
                # Weighted target
                target = confidences * (1 - self.user_bias[u] - item_bias - self.global_bias)
                
                # Solve: (Q^T * C * Q + lambda * I) * p_u = Q^T * target
                weighted_Q = item_emb * confidences[:, np.newaxis]
                A = weighted_Q.T @ item_emb + self.reg * np.eye(self.n_components)
                b = weighted_Q.T @ target
                
                self.user_embeddings[u] = np.linalg.solve(A, b)
                
                # Update user bias
                predictions = (self.user_embeddings[u] @ item_emb.T + 
                              self.user_bias[u] + item_bias + self.global_bias)
                error = confidences * (1 - predictions)
                self.user_bias[u] = np.sum(error) / (np.sum(confidences) + self.reg)
            
            # Update item embeddings using ALS
            for i in range(n_items):
                user_indices = interactions_csc[:, i].indices
                if len(user_indices) == 0:
                    continue
                
                confidences = confidence_matrix[:, i].data
                user_emb = self.user_embeddings[user_indices]
                user_bias = self.user_bias[user_indices]
                
                # Weighted target
                target = confidences * (1 - user_bias - self.item_bias[i] - self.global_bias)
                
                # Solve: (P^T * C * P + lambda * I) * q_i = P^T * target
                weighted_P = user_emb * confidences[:, np.newaxis]
                A = weighted_P.T @ user_emb + self.reg * np.eye(self.n_components)
                b = weighted_P.T @ target
                
                self.item_embeddings[i] = np.linalg.solve(A, b)
                
                # Update item bias
                predictions = (user_emb @ self.item_embeddings[i] + 
                              user_bias + self.item_bias[i] + self.global_bias)
                error = confidences * (1 - predictions)
                self.item_bias[i] = np.sum(error) / (np.sum(confidences) + self.reg)
            
            if verbose:
                precision = self._precision_at_k(interactions, k=10)
                print(f"Epoch {epoch + 1}/{epochs}: Precision@10 = {precision:.4f}")
    
    def predict(self, user_id, item_ids):
        """
        Predict scores for user-item pairs
        
        Args:
            user_id: Internal user ID
            item_ids: List of internal item IDs
        
        Returns:
            Array of prediction scores
        """
        user_emb = self.user_embeddings[user_id]
        user_bias = self.user_bias[user_id]
        
        item_emb = self.item_embeddings[item_ids]
        item_bias = self.item_bias[item_ids]
        
        predictions = (user_emb @ item_emb.T + 
                       user_bias + item_bias + self.global_bias)
        
        return predictions
    
    def _precision_at_k(self, interactions, k=10):
        """Compute precision@k for evaluation"""
        interactions_csr = interactions.tocsr()
        n_users = interactions_csr.shape[0]
        precision_sum = 0
        count = 0
        
        for u in range(n_users):
            actual_items = set(interactions_csr[u].indices)
            if len(actual_items) == 0:
                continue
            
            all_items = np.arange(interactions_csr.shape[1])
            scores = self.predict(u, all_items)
            top_k = np.argsort(-scores)[:k]
            
            hits = len(set(top_k) & actual_items)
            precision_sum += hits / k
            count += 1
        
        return precision_sum / count if count > 0 else 0
