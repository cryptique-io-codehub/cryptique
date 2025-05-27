import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
DB_NAME = 'cryptique'
VECTOR_COLLECTION = 'vector_store'

# Gemini API Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API')
EMBEDDING_MODEL = 'models/embedding-001'
GENERATION_MODEL = 'gemini-pro'

# Vector Search Configuration
VECTOR_DIMENSION = 768  # Gemini embedding dimension
TOP_K = 5  # Number of similar chunks to retrieve

# Chunking Configuration
MAX_CHUNK_SIZE = 500  # Maximum characters per chunk
CHUNK_OVERLAP = 50  # Overlap between chunks

# API Configuration
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', 8000)) 