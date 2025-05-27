import os
import sys
import subprocess
import signal
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get port from environment or use default
port = os.environ.get('PORT', 5000)

# Define paths
current_dir = os.path.dirname(os.path.abspath(__file__))
app_path = os.path.join(current_dir, 'app.py')

def install_dependencies():
    """Install required dependencies."""
    try:
        print("Installing Python dependencies...")
        requirements_path = os.path.join(current_dir, 'requirements.txt')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', requirements_path])
        print("Dependencies installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        return False

def start_service():
    """Start the Flask embedding service."""
    print(f"Starting embedding service on port {port}...")
    try:
        # Run Flask app
        process = subprocess.Popen([
            sys.executable, app_path
        ], env=os.environ.copy())
        
        # Give the service a moment to start
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            print(f"Embedding service is running on http://localhost:{port}")
            return process
        else:
            print("Failed to start embedding service.")
            return None
    except Exception as e:
        print(f"Error starting service: {e}")
        return None

def handle_exit(signum, frame):
    """Handle termination signals."""
    print("\nShutting down embedding service...")
    if 'process' in globals() and process:
        process.terminate()
        process.wait()
    print("Service stopped.")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    # Install dependencies
    if not install_dependencies():
        print("Failed to install dependencies. Exiting.")
        sys.exit(1)
    
    # Start the service
    process = start_service()
    if not process:
        print("Failed to start the service. Exiting.")
        sys.exit(1)
    
    try:
        # Keep the script running to maintain the service
        while True:
            time.sleep(1)
            
            # Check if process is still running
            if process.poll() is not None:
                print("Service stopped unexpectedly. Restarting...")
                process = start_service()
                if not process:
                    print("Failed to restart the service. Exiting.")
                    sys.exit(1)
    except KeyboardInterrupt:
        handle_exit(None, None) 