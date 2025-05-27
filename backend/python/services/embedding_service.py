import google.generativeai as genai
import os
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API') or 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs'
genai.configure(api_key=GEMINI_API_KEY)

def generate_embedding(text):
    """Generate embedding for the given text using Gemini embeddings."""
    try:
        # Generate embedding
        embedding_model = 'models/embedding-001'
        embedding_result = genai.embed_content(
            model=embedding_model,
            content=text,
            task_type="retrieval_document"
        )
        
        # Convert to numpy array for processing
        embedding_values = np.array(embedding_result['embedding'])
        return embedding_values
        
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise 