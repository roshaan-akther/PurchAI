"""
Model persistence for W-ALS Recommendation System
Saves and loads model and dataset
"""

import pickle
from .matrix_factorization import MatrixFactorization
from typing import List, Tuple


def save_model(model: MatrixFactorization, path: str):
    """Save MatrixFactorization model to pickle"""
    print(f"Saving model to {path}...")
    with open(path, 'wb') as f:
        pickle.dump(model, f)
    print("Model saved successfully!")


def load_model(path: str) -> MatrixFactorization:
    """Load MatrixFactorization model from pickle"""
    print(f"Loading model from {path}...")
    with open(path, 'rb') as f:
        model = pickle.load(f)
    print("Model loaded successfully!")
    return model


def save_dataset(dataset, path: str):
    """Save LightFM dataset to pickle"""
    print(f"Saving dataset to {path}...")
    with open(path, 'wb') as f:
        pickle.dump(dataset, f)
    print("Dataset saved successfully!")


def load_dataset(path: str):
    """Load LightFM dataset from pickle"""
    print(f"Loading dataset from {path}...")
    with open(path, 'rb') as f:
        dataset = pickle.load(f)
    print("Dataset loaded successfully!")
    return dataset


def save_training_log(training_log: List[Tuple[int, float]], path: str):
    """Save training log to text file"""
    print(f"Saving training log to {path}...")
    with open(path, 'w') as f:
        f.write("Epoch,Precision@10\n")
        for epoch, precision in training_log:
            f.write(f"{epoch},{precision:.4f}\n")
    print("Training log saved successfully!")


def load_training_log(path: str) -> List[Tuple[int, float]]:
    """Load training log from text file"""
    print(f"Loading training log from {path}...")
    training_log = []
    with open(path, 'r') as f:
        next(f)  # Skip header
        for line in f:
            epoch, precision = line.strip().split(',')
            training_log.append((int(epoch), float(precision)))
    print("Training log loaded successfully!")
    return training_log
