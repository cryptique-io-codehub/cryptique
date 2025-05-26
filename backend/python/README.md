# Vector Store Implementation for CQ Intelligence

This directory contains the Python implementation of vector embeddings and similarity search for CQ Intelligence.

## Overview

The vector store implementation uses:
- Sentence Transformers (`all-MiniLM-L6-v2`) for generating text embeddings
- MongoDB Atlas Vector Search for storing and querying embeddings
- Express.js routes for API endpoints

## Setup

1. Install Python dependencies:
```bash
cd backend/python
pip install -r requirements.txt
```

2. Configure MongoDB Atlas:
- Create a vector search index on the `client_data_chunks` collection
- Use the following index configuration:
```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "text_embedding": {
        "dimensions": 384,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

3. Environment Variables:
- The implementation uses the existing `MONGODB_URI` from your Vercel environment

## API Endpoints

### Store Chunk
```http
POST /api/vector/store
Content-Type: application/json

{
  "chunk": {
    "chunk_id": "uuid",
    "client_id": "client123",
    "text": "Text to embed",
    "data_source_type": "website_session",
    "timestamp_utc": "2024-03-14T12:00:00Z",
    "original_doc_id": "doc123",
    "source_site_id": "site123"
  }
}
```

### Search Similar
```http
POST /api/vector/search
Content-Type: application/json

{
  "queryText": "Search query",
  "clientId": "client123",
  "dataSourceType": "website_session",
  "limit": 5
}
```

## Implementation Details

- `vector_store.py`: Main class for vector operations
- `store_chunk.py`: Script for storing chunks with embeddings
- `search_similar.py`: Script for similarity search
- Express route in `routes/vectorStore.js` handles API endpoints

## Notes

- The implementation uses the existing MongoDB connection from your app
- Python scripts are called from Node.js using child processes
- All vector operations are performed in Python for better ML library support
- The vector search index is optimized for the `all-MiniLM-L6-v2` model's 384-dimensional embeddings 