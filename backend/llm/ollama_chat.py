import subprocess
import time
import requests
import signal
import sys

def start_ollama_server():
    """Start Ollama server in background"""
    print("Starting Ollama server...")
    process = subprocess.Popen(['ollama', 'serve'], 
                              stdout=subprocess.PIPE, 
                              stderr=subprocess.PIPE)
    # Wait for server to be ready
    time.sleep(3)
    return process

def chat_with_model(prompt, model="gemma3:270m"):
    """Send a prompt to the model using HTTP API"""
    url = "http://localhost:11434/api/generate"
    data = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    
    response = requests.post(url, json=data)
    response.raise_for_status()
    return response.json()['response']

def main():
    # Start server
    server_process = start_ollama_server()
    
    try:
        # Simple chat loop
        print("Chat with gemma3:270m (type 'quit' to exit)")
        print("-" * 50)
        
        while True:
            user_input = input("You: ")
            if user_input.lower() in ['quit', 'exit']:
                break
            
            response = chat_with_model(user_input)
            print(f"Model: {response}")
            print()
    
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    
    finally:
        # Cleanup
        print("Stopping Ollama server...")
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    main()
