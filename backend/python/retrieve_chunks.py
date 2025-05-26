import sys
import json
from vector_store import VectorStore

def main():
    # Get parameters from command line arguments
    query_text = sys.argv[1]
    team_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'null' else None
    top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    min_score = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7
    
    # Initialize vector store
    vector_store = VectorStore()
    
    # Retrieve relevant chunks
    results = vector_store.retrieve_relevant_chunks(
        query_text=query_text,
        team_id=team_id,
        top_k=top_k,
        min_score=min_score
    )
    
    # Print results as JSON (will be captured by Node.js)
    print(json.dumps(results, default=str))

if __name__ == "__main__":
    main() 