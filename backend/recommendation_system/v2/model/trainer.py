"""
Model trainer for W-ALS Recommendation System
Trains Matrix Factorization model with early stopping
"""

from .matrix_factorization import MatrixFactorization
import config


def train_model(
    interactions,
    item_features,
    user_features=None,
    no_components=None,
    learning_rate=None,
    loss=None,
    epochs=None,
    num_threads=None,
    early_stopping_patience=None,
    reg=None,
    alpha=None,
    min_delta=None
):
    """
    Train Matrix Factorization model with early stopping (W-ALS)
    
    Args:
        interactions: Sparse matrix of user-item interactions
        item_features: Sparse matrix of item features (not used in simple version)
        user_features: Sparse matrix of user features (not used in simple version)
        no_components: Embedding dimension
        learning_rate: Not used in W-ALS
        loss: Loss function (not used in simple version)
        epochs: Maximum epochs
        num_threads: Number of threads (not used in simple version)
        early_stopping_patience: Early stopping patience
        reg: Regularization parameter
        alpha: Confidence parameter for implicit feedback
        min_delta: Minimum improvement to consider as progress
    
    Returns:
        model: Trained MatrixFactorization model
        training_log: List of (epoch, precision) tuples
    """
    no_components = no_components or config.NO_COMPONENTS
    reg = reg or config.REG
    alpha = alpha or config.ALPHA
    epochs = epochs or config.EPOCHS
    early_stopping_patience = early_stopping_patience or config.EARLY_STOPPING_PATIENCE
    min_delta = min_delta or config.MIN_DELTA
    
    print(f"Training W-ALS Matrix Factorization model...")
    print(f"  - Components: {no_components}")
    print(f"  - Regularization: {reg}")
    print(f"  - Alpha (confidence): {alpha}")
    print(f"  - Max epochs: {epochs}")
    print(f"  - Early stopping patience: {early_stopping_patience}")
    print(f"  - Min delta: {min_delta}")
    
    model = MatrixFactorization(
        n_components=no_components,
        reg=reg,
        alpha=alpha
    )
    
    best_precision = 0.0
    patience_counter = 0
    training_log = []
    
    for epoch in range(epochs):
        model.fit(
            interactions,
            item_features=item_features,
            user_features=user_features,
            epochs=1,
            verbose=False
        )
        
        precision = model._precision_at_k(interactions, k=10)
        training_log.append((epoch + 1, precision))
        
        print(f"Epoch {epoch + 1}/{epochs}: Precision@10 = {precision:.4f}")
        
        if precision > best_precision + min_delta:
            best_precision = precision
            patience_counter = 0
            print(f"  -> New best precision: {best_precision:.4f}")
        else:
            patience_counter += 1
            print(f"  -> No improvement for {patience_counter} epoch(s)")
            
            if patience_counter >= early_stopping_patience:
                print(f"Early stopping triggered after {epoch + 1} epochs")
                break
    
    print(f"\nTraining complete!")
    print(f"Best precision@10: {best_precision:.4f}")
    print(f"Total epochs trained: {len(training_log)}")
    
    return model, training_log
