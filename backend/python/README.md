# CQ Intelligence RAG (Retrieval-Augmented Generation) Service

This Python service provides embedding generation, vector storage, and retrieval capabilities for the CQ Intelligence feature of Cryptique. It enhances analytics responses by using a RAG approach to provide more accurate and context-aware answers.

## Overview

The RAG implementation follows these steps:

1. **Data Transformation**: Converts raw analytics and smart contract data into natural language descriptions.
2. **Chunking & Metadata**: Breaks text into appropriate chunks and associates rich metadata.
3. **Embedding Generation**: Creates vector embeddings for text chunks using Gemini's embedding model.
4. **Vector Storage**: Stores embeddings along with text and metadata in MongoDB Atlas.
5. **Retrieval**: Retrieves the most relevant text chunks for a user query.
6. **Response Generation**: Constructs a prompt that includes retrieved context and uses Gemini to generate responses.

## Setup

### Prerequisites

- Python 3.9+
- MongoDB Atlas account with vector search capability
- Gemini API key

### Installation

1. Create a `.env` file based on `.env.example` with your configuration
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

### Starting the Service

Run the service using:

```
python start_service.py
```

This will:
- Install dependencies if needed
- Start the Flask API server
- Handle graceful restarts and termination

## API Endpoints

The service exposes the following endpoints:

- `GET /health` - Health check endpoint
- `POST /embed` - Generate embeddings for text
- `POST /store` - Store text, embedding, and metadata
- `POST /search` - Search for similar embeddings

## Initial Data Processing

To generate initial embeddings for existing data:

```
python scripts/generate_initial_embeddings.py
```

This script:
- Retrieves all websites and smart contracts from the database
- Transforms data into natural language descriptions
- Generates embeddings and stores them in the vector database

## Integration with Node.js Backend

The Python service is integrated with the Node.js backend using a proxy router that forwards requests to the Python service. The main backend routes are defined in `/api/vector/*` endpoints.

## Vector Search Setup

For vector search to work:
1. Create a vector index in MongoDB Atlas
2. Name the index `vector_index`
3. Set the index to use the `embedding` field
4. Configure the index for cosine similarity 