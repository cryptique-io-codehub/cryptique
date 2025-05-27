import google.generativeai as genai
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorClient
import numpy as np
from config import (
    MONGODB_URI,
    DB_NAME,
    VECTOR_COLLECTION,
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    TOP_K
)

class VectorStore:
    def __init__(self):
        # Initialize Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(EMBEDDING_MODEL)
        
        # Initialize MongoDB
        self.client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.client[DB_NAME]
        self.collection = self.db[VECTOR_COLLECTION]

    async def setup_indexes(self):
        """Set up necessary indexes for vector search."""
        try:
            # Create vector search index
            await self.collection.create_index([
                ("vector", "vectorSearch")
            ], {
                "vectorSearchOptions": {
                    "dimension": 768,  # Gemini embedding dimension
                    "similarity": "cosine"
                }
            })

            # Create compound index for filtering
            await self.collection.create_index([
                ("metadata.data_type", 1),
                ("metadata.website_id", 1),
                ("metadata.contract_id", 1)
            ])

        except Exception as e:
            print(f"Error setting up indexes: {e}")
            raise

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Gemini."""
        try:
            embedding = await self.model.embed_content(text=text)
            return embedding.embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            raise

    async def store_vector(self, chunk: Dict[str, Any]) -> str:
        """Store vector in MongoDB Atlas."""
        try:
            vector = await self.generate_embedding(chunk['text'])
            
            document = {
                'vector': vector,
                'text': chunk['text'],
                'metadata': chunk['metadata']
            }
            
            result = await self.collection.insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error storing vector: {e}")
            raise

    async def store_vectors(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """Store multiple vectors in MongoDB Atlas."""
        try:
            # Generate embeddings for all chunks
            vectors = []
            for chunk in chunks:
                vector = await self.generate_embedding(chunk['text'])
                vectors.append({
                    'vector': vector,
                    'text': chunk['text'],
                    'metadata': chunk['metadata']
                })
            
            # Insert all vectors
            result = await self.collection.insert_many(vectors)
            return [str(id) for id in result.inserted_ids]
        except Exception as e:
            print(f"Error storing vectors: {e}")
            raise

    async def search_vectors(
        self,
        query: str,
        selected_sites: List[str] = None,
        selected_contracts: List[str] = None,
        limit: int = TOP_K
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors in MongoDB Atlas."""
        try:
            # Generate query embedding
            query_vector = await self.generate_embedding(query)

            # Build filter based on selected sites and contracts
            filter_conditions = []
            if selected_sites:
                filter_conditions.append({
                    "metadata.website_id": {"$in": selected_sites}
                })
            if selected_contracts:
                filter_conditions.append({
                    "metadata.contract_id": {"$in": selected_contracts}
                })

            # Combine filters with OR if both are present
            filter_query = {"$or": filter_conditions} if filter_conditions else {}

            # Perform vector search
            pipeline = [
                {
                    "$vectorSearch": {
                        "queryVector": query_vector,
                        "path": "vector",
                        "numCandidates": limit * 10,  # Request more candidates for better results
                        "limit": limit,
                        "index": "vector_index",
                        "filter": filter_query if filter_conditions else None
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "text": 1,
                        "metadata": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]

            results = []
            async for doc in self.collection.aggregate(pipeline):
                results.append(doc)

            return results

        except Exception as e:
            print(f"Error searching vectors: {e}")
            raise

    async def delete_vectors(
        self,
        website_id: str = None,
        contract_id: str = None,
        older_than: str = None
    ) -> int:
        """Delete vectors based on criteria."""
        try:
            filter_query = {}
            
            if website_id:
                filter_query["metadata.website_id"] = website_id
            if contract_id:
                filter_query["metadata.contract_id"] = contract_id
            if older_than:
                filter_query["metadata.timestamp"] = {"$lt": older_than}

            if not filter_query:
                raise ValueError("At least one deletion criteria must be specified")

            result = await self.collection.delete_many(filter_query)
            return result.deleted_count
        except Exception as e:
            print(f"Error deleting vectors: {e}")
            raise

    async def get_vector_stats(self) -> Dict[str, Any]:
        """Get statistics about stored vectors."""
        try:
            stats = {
                'total_vectors': await self.collection.count_documents({}),
                'by_data_type': {},
                'by_source': {},
                'websites': set(),
                'contracts': set()
            }

            # Aggregate by data type
            async for doc in self.collection.aggregate([
                {"$group": {
                    "_id": "$metadata.data_type",
                    "count": {"$sum": 1}
                }}
            ]):
                stats['by_data_type'][doc['_id']] = doc['count']

            # Aggregate by source
            async for doc in self.collection.aggregate([
                {"$group": {
                    "_id": "$metadata.source",
                    "count": {"$sum": 1}
                }}
            ]):
                stats['by_source'][doc['_id']] = doc['count']

            # Collect unique websites and contracts
            async for doc in self.collection.find({}, {'metadata.website_id': 1, 'metadata.contract_id': 1}):
                if doc.get('metadata', {}).get('website_id'):
                    stats['websites'].add(doc['metadata']['website_id'])
                if doc.get('metadata', {}).get('contract_id'):
                    stats['contracts'].add(doc['metadata']['contract_id'])

            stats['websites'] = list(stats['websites'])
            stats['contracts'] = list(stats['contracts'])

            return stats
        except Exception as e:
            print(f"Error getting vector stats: {e}")
            raise 