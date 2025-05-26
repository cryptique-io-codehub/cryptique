import sys
import json
from vector_store import VectorStore

def main():
    # Get search parameters from command line arguments
    query_text = sys.argv[1]
    client_id = sys.argv[2] if sys.argv[2] else None
    data_source_type = sys.argv[3] if sys.argv[3] else None
    limit = int(sys.argv[4]) if sys.argv[4] else 5
    
    # Initialize vector store
    vector_store = VectorStore()
    
    # Search for similar chunks
    results = vector_store.search_similar(
        query_text=query_text,
        client_id=client_id,
        data_source_type=data_source_type,
        limit=limit
    )
    
    # Print results as JSON (will be captured by Node.js)
    print(json.dumps(results, default=str))

if __name__ == "__main__":
    main() 