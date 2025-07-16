"""
Database utility for MongoDB operations
"""

import asyncio
from typing import Dict, List, Optional, Any, AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from bson import ObjectId
import time
from contextlib import asynccontextmanager

from config import config
from utils.logger import get_logger

logger = get_logger(__name__)

class DatabaseManager:
    """
    Async MongoDB database manager with connection pooling and error handling
    """
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self.sync_client: Optional[MongoClient] = None
        self.sync_db = None
        self.is_connected = False
        
    async def connect(self) -> None:
        """
        Establish connection to MongoDB
        """
        try:
            # Async client for main operations
            self.client = AsyncIOMotorClient(
                config.database.mongodb_uri,
                **config.get_mongodb_config()
            )
            
            # Test connection
            await self.client.admin.command('ping')
            self.db = self.client[config.database.database_name]
            
            # Sync client for certain operations
            self.sync_client = MongoClient(
                config.database.mongodb_uri,
                **config.get_mongodb_config()
            )
            self.sync_db = self.sync_client[config.database.database_name]
            
            self.is_connected = True
            logger.info("Successfully connected to MongoDB")
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            raise
    
    async def disconnect(self) -> None:
        """
        Close database connections
        """
        if self.client:
            self.client.close()
        if self.sync_client:
            self.sync_client.close()
        self.is_connected = False
        logger.info("Disconnected from MongoDB")
    
    def get_collection(self, collection_name: str) -> AsyncIOMotorCollection:
        """
        Get async collection instance
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            AsyncIOMotorCollection instance
        """
        if not self.is_connected:
            raise RuntimeError("Database not connected")
        return self.db[collection_name]
    
    def get_sync_collection(self, collection_name: str):
        """
        Get sync collection instance
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            PyMongo collection instance
        """
        if not self.is_connected:
            raise RuntimeError("Database not connected")
        return self.sync_db[collection_name]
    
    async def find_documents(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
        sort: Optional[List[tuple]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find documents in collection
        
        Args:
            collection_name: Name of the collection
            filter_dict: MongoDB filter dictionary
            projection: Fields to include/exclude
            limit: Maximum number of documents to return
            skip: Number of documents to skip
            sort: Sort specification
            
        Returns:
            List of documents
        """
        try:
            collection = self.get_collection(collection_name)
            cursor = collection.find(filter_dict, projection)
            
            if sort:
                cursor = cursor.sort(sort)
            if skip:
                cursor = cursor.skip(skip)
            if limit:
                cursor = cursor.limit(limit)
            
            documents = await cursor.to_list(length=limit)
            return documents
            
        except Exception as e:
            logger.error(f"Error finding documents in {collection_name}: {e}")
            raise
    
    async def find_one_document(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any],
        projection: Optional[Dict[str, int]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Find single document in collection
        
        Args:
            collection_name: Name of the collection
            filter_dict: MongoDB filter dictionary
            projection: Fields to include/exclude
            
        Returns:
            Document or None
        """
        try:
            collection = self.get_collection(collection_name)
            document = await collection.find_one(filter_dict, projection)
            return document
            
        except Exception as e:
            logger.error(f"Error finding document in {collection_name}: {e}")
            raise
    
    async def insert_document(
        self,
        collection_name: str,
        document: Dict[str, Any]
    ) -> str:
        """
        Insert single document
        
        Args:
            collection_name: Name of the collection
            document: Document to insert
            
        Returns:
            Inserted document ID
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.insert_one(document)
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Error inserting document in {collection_name}: {e}")
            raise
    
    async def insert_documents(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Insert multiple documents
        
        Args:
            collection_name: Name of the collection
            documents: List of documents to insert
            
        Returns:
            List of inserted document IDs
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.insert_many(documents)
            return [str(id) for id in result.inserted_ids]
            
        except Exception as e:
            logger.error(f"Error inserting documents in {collection_name}: {e}")
            raise
    
    async def update_document(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any],
        update_dict: Dict[str, Any],
        upsert: bool = False
    ) -> int:
        """
        Update single document
        
        Args:
            collection_name: Name of the collection
            filter_dict: Filter to find document
            update_dict: Update operations
            upsert: Create document if not found
            
        Returns:
            Number of modified documents
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.update_one(filter_dict, update_dict, upsert=upsert)
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error updating document in {collection_name}: {e}")
            raise
    
    async def update_documents(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any],
        update_dict: Dict[str, Any]
    ) -> int:
        """
        Update multiple documents
        
        Args:
            collection_name: Name of the collection
            filter_dict: Filter to find documents
            update_dict: Update operations
            
        Returns:
            Number of modified documents
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.update_many(filter_dict, update_dict)
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error updating documents in {collection_name}: {e}")
            raise
    
    async def delete_document(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any]
    ) -> int:
        """
        Delete single document
        
        Args:
            collection_name: Name of the collection
            filter_dict: Filter to find document
            
        Returns:
            Number of deleted documents
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.delete_one(filter_dict)
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting document in {collection_name}: {e}")
            raise
    
    async def delete_documents(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any]
    ) -> int:
        """
        Delete multiple documents
        
        Args:
            collection_name: Name of the collection
            filter_dict: Filter to find documents
            
        Returns:
            Number of deleted documents
        """
        try:
            collection = self.get_collection(collection_name)
            result = await collection.delete_many(filter_dict)
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting documents in {collection_name}: {e}")
            raise
    
    async def aggregate(
        self,
        collection_name: str,
        pipeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Run aggregation pipeline
        
        Args:
            collection_name: Name of the collection
            pipeline: Aggregation pipeline
            
        Returns:
            Aggregation results
        """
        try:
            collection = self.get_collection(collection_name)
            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            return results
            
        except Exception as e:
            logger.error(f"Error running aggregation in {collection_name}: {e}")
            raise
    
    async def count_documents(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any]
    ) -> int:
        """
        Count documents matching filter
        
        Args:
            collection_name: Name of the collection
            filter_dict: Filter dictionary
            
        Returns:
            Document count
        """
        try:
            collection = self.get_collection(collection_name)
            count = await collection.count_documents(filter_dict)
            return count
            
        except Exception as e:
            logger.error(f"Error counting documents in {collection_name}: {e}")
            raise
    
    async def create_index(
        self,
        collection_name: str,
        keys: List[tuple],
        **kwargs
    ) -> str:
        """
        Create index on collection
        
        Args:
            collection_name: Name of the collection
            keys: Index specification
            **kwargs: Additional index options
            
        Returns:
            Index name
        """
        try:
            collection = self.get_collection(collection_name)
            index_name = await collection.create_index(keys, **kwargs)
            logger.info(f"Created index {index_name} on {collection_name}")
            return index_name
            
        except Exception as e:
            logger.error(f"Error creating index on {collection_name}: {e}")
            raise
    
    async def vector_search(
        self,
        collection_name: str,
        query_vector: List[float],
        index_name: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search
        
        Args:
            collection_name: Name of the collection
            query_vector: Query vector
            index_name: Vector search index name
            limit: Maximum number of results
            filters: Additional filters
            
        Returns:
            Search results with similarity scores
        """
        try:
            collection = self.get_collection(collection_name)
            
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": index_name,
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": limit * 10,
                        "limit": limit
                    }
                }
            ]
            
            # Add filters if provided
            if filters:
                pipeline.append({"$match": filters})
            
            # Add score field
            pipeline.append({
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"}
                }
            })
            
            results = await self.aggregate(collection_name, pipeline)
            return results
            
        except Exception as e:
            logger.error(f"Error performing vector search in {collection_name}: {e}")
            raise
    
    @asynccontextmanager
    async def transaction(self):
        """
        Context manager for database transactions
        """
        session = await self.client.start_session()
        try:
            async with session.start_transaction():
                yield session
        except Exception as e:
            logger.error(f"Transaction failed: {e}")
            raise
        finally:
            await session.end_session()
    
    async def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """
        Get collection statistics
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            Collection statistics
        """
        try:
            stats = await self.db.command("collStats", collection_name)
            return stats
            
        except Exception as e:
            logger.error(f"Error getting stats for {collection_name}: {e}")
            raise

# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions
async def get_db() -> DatabaseManager:
    """Get database manager instance"""
    if not db_manager.is_connected:
        await db_manager.connect()
    return db_manager

async def close_db() -> None:
    """Close database connections"""
    await db_manager.disconnect() 