import sys
import json
from vector_store import VectorStore

def main():
    # Get chunk data from command line argument
    chunk_data = json.loads(sys.argv[1])
    
    # Initialize vector store
    vector_store = VectorStore()
    
    # Store the chunk and get document ID
    doc_id = vector_store.store_chunk(chunk_data)
    
    # Print the result (will be captured by Node.js)
    print(doc_id)

if __name__ == "__main__":
    main() 