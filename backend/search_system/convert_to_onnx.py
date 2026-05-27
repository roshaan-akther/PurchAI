"""
Convert sentence-transformers model to ONNX format with quantization
"""

from sentence_transformers import SentenceTransformer
import os

def convert_model_to_onnx():
    """Convert model to ONNX format for faster inference"""
    print("=" * 60)
    print("Converting Model to ONNX Format")
    print("=" * 60)
    
    # Load model with ONNX backend
    print(f"\nLoading model: {config.MODEL_NAME}")
    model = SentenceTransformer(config.MODEL_NAME, backend="onnx")
    
    # Save the converted model
    output_path = config.MODEL_DIR
    os.makedirs(output_path, exist_ok=True)
    
    print(f"\nSaving ONNX model to: {output_path}")
    model.save_pretrained(output_path)
    
    print("\n" + "=" * 60)
    print("Model conversion complete!")
    print(f"ONNX model saved to: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import config
    
    convert_model_to_onnx()
