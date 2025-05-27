from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Atlas connection
MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('MONGODB_DB_NAME', 'cryptique')
COLLECTION_NAME = os.getenv('MONGODB_VECTOR_COLLECTION', 'embeddings')

# Initialize MongoDB client
client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Ensure vector search index exists
def ensure_vector_index():
    """Ensure the vector search index exists in MongoDB Atlas."""
    indexes = collection.list_indexes()
    has_vector_index = False
    
    for index in indexes:
        if index.get('name') == 'vector_index':
            has_vector_index = True
            break
    
    if not has_vector_index:
        print("Creating vector index...")
        # Note: This requires MongoDB Atlas, won't work with regular MongoDB
        # The actual index creation would happen in MongoDB Atlas UI or via Atlas API
        print("Please create a vector index named 'vector_index' on the 'embedding' field in the MongoDB Atlas UI")
    
    return has_vector_index

# Check index on startup
ensure_vector_index()

def store_embedding(text, embedding, metadata):
    """Store text, embedding, and metadata in MongoDB."""
    document = {
        "text": text,
        "embedding": embedding,
        "metadata": metadata
    }
    return collection.insert_one(document)

def search_embeddings(query_embedding, limit=10, filter_query={}):
    """Search for similar embeddings in MongoDB Atlas."""
    # MongoDB Atlas vector search pipeline
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "queryVector": query_embedding,
                "path": "embedding",
                "numCandidates": limit * 10,  # Retrieve more candidates than needed for better results
                "limit": limit
            }
        }
    ]
    
    # Add filter if provided
    if filter_query:
        pipeline.insert(0, {"$match": filter_query})
    
    # Add project stage to format results
    pipeline.append({
        "$project": {
            "_id": 0,
            "text": 1,
            "metadata": 1,
            "score": {"$meta": "vectorSearchScore"}
        }
    })
    
    # Execute pipeline and return results
    results = list(collection.aggregate(pipeline))
    return results 