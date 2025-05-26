from typing import List, Dict, Any, Optional
import os
from datetime import datetime
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import numpy as np

class VectorStore:
    def __init__(
        self,
        mongodb_uri: str = os.getenv("MONGODB_URI"),
        database_name: str = "cryptique_rag_db",
        collection_name: str = "client_data_chunks",
        model_name: str = "all-MiniLM-L6-v2"
    ):
        """
        Initialize the vector store with MongoDB Atlas connection and embedding model.
        
        Args:
            mongodb_uri: MongoDB Atlas connection string (defaults to MONGODB_URI env var)
            database_name: Name of the database
            collection_name: Name of the collection
            model_name: Name of the sentence transformer model to use
        """
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable is required")
            
        # Initialize MongoDB connection
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.collection = self.db[collection_name]
        
        # Initialize the embedding model
        self.model = SentenceTransformer(model_name)
        self.embedding_dimension = self.model.get_sentence_embedding_dimension()
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for the given text.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the text embedding
        """
        # Generate embedding and convert to list of floats
        embedding = self.model.encode(text)
        return embedding.tolist()
    
    def store_chunk(self, chunk: Dict[str, Any]) -> str:
        """
        Store a chunk with its embedding in MongoDB Atlas.
        
        Args:
            chunk: Dictionary containing chunk data including text and metadata
            
        Returns:
            The ID of the stored document
        """
        # Generate embedding for the text
        embedding = self.get_embedding(chunk["text"])
        
        # Prepare the document for storage
        document = {
            "chunk_id": chunk["chunk_id"],
            "team_id": chunk["team_id"],
            "text": chunk["text"],
            "text_embedding": embedding,
            "data_source_type": chunk["data_source_type"],
            "timestamp_utc": chunk["timestamp_utc"],
            "original_doc_id": chunk["original_doc_id"],
        }
        
        # Add optional fields if present
        if "source_site_id" in chunk:
            document["source_site_id"] = chunk["source_site_id"]
        if "source_contract_address" in chunk:
            document["source_contract_address"] = chunk["source_contract_address"]
            
        # Add all additional metadata fields
        for key, value in chunk.items():
            if key not in document and key != "client_id":
                document[key] = value
        
        # Insert into MongoDB
        result = self.collection.insert_one(document)
        return str(result.inserted_id)
    
    def retrieve_relevant_chunks(
        self,
        query_text: str,
        team_id: Optional[str] = None,
        top_k: int = 5,
        min_score: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant chunks for a given query text.
        If team_id is provided, results will be filtered to that team.
        
        Args:
            query_text: The user's question or query
            team_id: Optional team ID to filter results
            top_k: Number of chunks to retrieve (default: 5)
            min_score: Minimum similarity score threshold (default: 0.7)
            
        Returns:
            List of dictionaries containing relevant chunks with their metadata
        """
        # Generate embedding for the query
        query_embedding = self.get_embedding(query_text)
        
        # Build the aggregation pipeline
        pipeline = []
        
        # Add team filter if provided
        if team_id:
            pipeline.append({
                "$match": {
                    "team_id": team_id
                }
            })
        
        # Add vector search stage
        pipeline.append({
            "$vectorSearch": {
                "index": "vector_index",
                "path": "text_embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,  # Search through more candidates for better results
                "limit": top_k,
                "minScore": min_score
            }
        })
        
        # Add projection stage
        pipeline.append({
            "$project": {
                "_id": 0,
                "chunk_id": 1,
                "team_id": 1,
                "text": 1,
                "data_source_type": 1,
                "timestamp_utc": 1,
                "source_site_id": 1,
                "source_contract_address": 1,
                "original_doc_id": 1,
                "score": { "$meta": "vectorSearchScore" }
            }
        })
        
        try:
            # Execute the aggregation pipeline
            results = list(self.collection.aggregate(pipeline))
            
            # Sort results by score in descending order (highest similarity first)
            results.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            return results
            
        except Exception as e:
            print(f"Error during vector search: {str(e)}")
            return []
    
    def search_similar(
        self,
        query_text: str,
        client_id: Optional[str] = None,
        data_source_type: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using vector similarity.
        
        Args:
            query_text: The text to search for
            client_id: Optional filter by client_id
            data_source_type: Optional filter by data source type
            limit: Maximum number of results to return
            
        Returns:
            List of similar chunks with their metadata
        """
        # Generate embedding for the query
        query_embedding = self.get_embedding(query_text)
        
        # Build the search pipeline
        pipeline = [
            {
                "$search": {
                    "index": "vector_index",  # Make sure this matches your Atlas Search index name
                    "knnBeta": {
                        "vector": query_embedding,
                        "path": "text_embedding",
                        "k": limit
                    }
                }
            }
        ]
        
        # Add filters if provided
        match_conditions = {}
        if client_id:
            match_conditions["client_id"] = client_id
        if data_source_type:
            match_conditions["data_source_type"] = data_source_type
        
        if match_conditions:
            pipeline.append({"$match": match_conditions})
        
        # Add projection to include score
        pipeline.append({
            "$project": {
                "_id": 0,
                "chunk_id": 1,
                "text": 1,
                "client_id": 1,
                "data_source_type": 1,
                "timestamp_utc": 1,
                "score": {"$meta": "searchScore"}
            }
        })
        
        # Execute the search
        results = list(self.collection.aggregate(pipeline))
        return results 