"""
Dataset builder for W-ALS Recommendation System
Builds custom dataset from raw data (Python 3.14 compatible)
"""

from scipy.sparse import coo_matrix, csr_matrix
from typing import List, Tuple, Dict
from features.item_features import extract_item_features, get_all_item_features
from features.user_features import extract_user_features, get_all_user_features


class SimpleDataset:
    """Simple dataset class for user/item ID mapping"""
    
    def __init__(self):
        self.user_id_map = {}  # External -> Internal
        self.item_id_map = {}  # External -> Internal
        self.user_id_reverse = {}  # Internal -> External
        self.item_id_reverse = {}  # Internal -> External
    
    def fit(self, users: List[str], items: List[str]):
        """Fit dataset with user and item IDs"""
        self.user_id_map = {uid: i for i, uid in enumerate(users)}
        self.item_id_map = {iid: i for i, iid in enumerate(items)}
        self.user_id_reverse = {i: uid for uid, i in self.user_id_map.items()}
        self.item_id_reverse = {i: iid for iid, i in self.item_id_map.items()}
    
    def mapping(self):
        """Return mapping tuple (user_map, item_map)"""
        return (self.user_id_map, self.item_id_map)


def build_dataset(
    users: List[Dict],
    products: List[Dict],
    interactions: List[Tuple[str, str, int]]
) -> Tuple:
    """
    Build custom dataset from raw data
    
    Returns:
        dataset: SimpleDataset object
        interactions_matrix: Sparse matrix of interactions
        item_features: None (not used in simple version)
        user_features: None (not used in simple version)
    """
    print("Building dataset...")
    
    # Create dataset
    dataset = SimpleDataset()
    
    # Extract user and item IDs
    user_ids = [u['user_id'] for u in users]
    item_ids = [p['pid'] for p in products]
    
    print(f"Users: {len(user_ids)}, Items: {len(item_ids)}")
    
    # Fit dataset
    print("Fitting dataset...")
    dataset.fit(user_ids, item_ids)
    
    # Build interactions matrix
    print("Building interactions matrix...")
    rows = []
    cols = []
    data = []
    
    for user_id, item_id, weight in interactions:
        if user_id in dataset.user_id_map and item_id in dataset.item_id_map:
            rows.append(dataset.user_id_map[user_id])
            cols.append(dataset.item_id_map[item_id])
            data.append(weight)
    
    interactions_matrix = coo_matrix(
        (data, (rows, cols)),
        shape=(len(user_ids), len(item_ids))
    )
    print(f"Interactions: {interactions_matrix.nnz}")
    
    print("Dataset built successfully!")
    
    return dataset, interactions_matrix, None, None
