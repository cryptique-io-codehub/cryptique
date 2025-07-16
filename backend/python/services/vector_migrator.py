"""
Vector Data Migrator for Cryptique
Handles migration from current CQ Intelligence data with validation and optimization
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Tuple, AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from bson import ObjectId
from tqdm.asyncio import tqdm
import math

from config import config
from utils.logger import get_logger, log_async_performance, LogContext
from utils.database import get_db
from utils.validators import DataValidator
from services.data_processor import DataProcessor
from services.embedding_generator import EmbeddingGenerator, EmbeddingModel

logger = get_logger(__name__)

class MigrationStatus(Enum):
    """Migration status levels"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class DataSource(Enum):
    """Data source types for migration"""
    ANALYTICS = "analytics"
    SESSIONS = "sessions"
    CAMPAIGNS = "campaigns"
    TRANSACTIONS = "transactions"
    SMART_CONTRACTS = "smart_contracts"
    GRANULAR_EVENTS = "granular_events"

@dataclass
class MigrationConfig:
    """Configuration for migration process"""
    source_types: List[DataSource] = field(default_factory=list)
    batch_size: int = 100
    max_workers: int = 4
    embedding_model: EmbeddingModel = EmbeddingModel.GEMINI
    validate_data: bool = True
    optimize_embeddings: bool = True
    backup_original: bool = True
    resume_from_checkpoint: bool = True
    
@dataclass
class MigrationProgress:
    """Progress tracking for migration"""
    total_records: int = 0
    processed_records: int = 0
    successful_records: int = 0
    failed_records: int = 0
    skipped_records: int = 0
    current_source: Optional[str] = None
    start_time: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    errors: List[str] = field(default_factory=list)
    
    @property
    def percentage_complete(self) -> float:
        if self.total_records == 0:
            return 0.0
        return (self.processed_records / self.total_records) * 100
    
    @property
    def success_rate(self) -> float:
        if self.processed_records == 0:
            return 0.0
        return (self.successful_records / self.processed_records) * 100

@dataclass
class MigrationResult:
    """Result of migration process"""
    success: bool
    progress: MigrationProgress
    processing_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    checkpoint_data: Optional[Dict[str, Any]] = None

class VectorMigrator:
    """
    Advanced vector data migrator with validation and optimization
    """
    
    def __init__(self, config: Optional[MigrationConfig] = None):
        self.config = config or MigrationConfig()
        self.db = None
        self.data_processor = DataProcessor()
        self.embedding_generator = EmbeddingGenerator()
        self.validator = DataValidator()
        self.progress = MigrationProgress()
        self.checkpoint_file = "migration_checkpoint.json"
        
        # Migration state
        self.is_running = False
        self.should_pause = False
        self.current_checkpoint = {}
        
    async def initialize(self):
        """Initialize the migrator"""
        self.db = await get_db()
        await self.data_processor.initialize()
        await self.embedding_generator.initialize()
        logger.info("Vector migrator initialized")
    
    @log_async_performance
    async def migrate_all_data(
        self,
        site_ids: Optional[List[str]] = None,
        team_ids: Optional[List[str]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> MigrationResult:
        """
        Migrate all data from current system to vector format
        
        Args:
            site_ids: Specific site IDs to migrate
            team_ids: Specific team IDs to migrate
            start_date: Start date for data migration
            end_date: End date for data migration
            
        Returns:
            MigrationResult with migration statistics
        """
        start_time = time.time()
        self.is_running = True
        self.progress.start_time = datetime.now()
        
        try:
            with LogContext("Starting full data migration"):
                # Load checkpoint if resuming
                if self.config.resume_from_checkpoint:
                    await self._load_checkpoint()
                
                # Get total record count
                await self._calculate_total_records(site_ids, team_ids, start_date, end_date)
                
                # Migrate each data source
                for source in self.config.source_types:
                    if self.should_pause:
                        await self._save_checkpoint()
                        break
                    
                    self.progress.current_source = source.value
                    await self._migrate_data_source(
                        source, site_ids, team_ids, start_date, end_date
                    )
                
                # Finalize migration
                await self._finalize_migration()
                
                return MigrationResult(
                    success=True,
                    progress=self.progress,
                    processing_time=time.time() - start_time,
                    metadata={
                        'migration_config': self.config.__dict__,
                        'completion_time': datetime.now().isoformat()
                    }
                )
                
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return MigrationResult(
                success=False,
                progress=self.progress,
                processing_time=time.time() - start_time,
                metadata={'error': str(e)}
            )
        finally:
            self.is_running = False
    
    @log_async_performance
    async def migrate_analytics_data(
        self,
        site_ids: Optional[List[str]] = None,
        batch_size: Optional[int] = None
    ) -> MigrationResult:
        """
        Migrate analytics data specifically
        
        Args:
            site_ids: Specific site IDs to migrate
            batch_size: Batch size for processing
            
        Returns:
            MigrationResult with migration statistics
        """
        start_time = time.time()
        batch_size = batch_size or self.config.batch_size
        
        try:
            with LogContext("Migrating analytics data"):
                # Get analytics data
                filter_dict = {}
                if site_ids:
                    filter_dict["siteId"] = {"$in": site_ids}
                
                analytics_data = await self.db.find_documents("analytics", filter_dict)
                
                if not analytics_data:
                    logger.warning("No analytics data found to migrate")
                    return MigrationResult(
                        success=True,
                        progress=self.progress,
                        processing_time=time.time() - start_time,
                        metadata={'message': 'No data to migrate'}
                    )
                
                # Process in batches
                total_records = len(analytics_data)
                successful_migrations = 0
                
                for i in range(0, total_records, batch_size):
                    batch = analytics_data[i:i + batch_size]
                    
                    # Process batch
                    batch_results = await self._process_analytics_batch(batch)
                    successful_migrations += sum(1 for r in batch_results if r['success'])
                    
                    # Update progress
                    self.progress.processed_records += len(batch)
                    self.progress.successful_records += successful_migrations
                    
                    logger.info(f"Processed {self.progress.processed_records}/{total_records} analytics records")
                
                return MigrationResult(
                    success=True,
                    progress=self.progress,
                    processing_time=time.time() - start_time,
                    metadata={
                        'total_records': total_records,
                        'successful_migrations': successful_migrations
                    }
                )
                
        except Exception as e:
            logger.error(f"Analytics migration failed: {e}")
            return MigrationResult(
                success=False,
                progress=self.progress,
                processing_time=time.time() - start_time,
                metadata={'error': str(e)}
            )
    
    @log_async_performance
    async def migrate_session_data(
        self,
        site_ids: Optional[List[str]] = None,
        batch_size: Optional[int] = None
    ) -> MigrationResult:
        """
        Migrate session data specifically
        
        Args:
            site_ids: Specific site IDs to migrate
            batch_size: Batch size for processing
            
        Returns:
            MigrationResult with migration statistics
        """
        start_time = time.time()
        batch_size = batch_size or self.config.batch_size
        
        try:
            with LogContext("Migrating session data"):
                # Get session data
                filter_dict = {}
                if site_ids:
                    filter_dict["siteId"] = {"$in": site_ids}
                
                session_data = await self.db.find_documents("sessions", filter_dict)
                
                if not session_data:
                    logger.warning("No session data found to migrate")
                    return MigrationResult(
                        success=True,
                        progress=self.progress,
                        processing_time=time.time() - start_time,
                        metadata={'message': 'No data to migrate'}
                    )
                
                # Process in batches
                total_records = len(session_data)
                successful_migrations = 0
                
                for i in range(0, total_records, batch_size):
                    batch = session_data[i:i + batch_size]
                    
                    # Process batch
                    batch_results = await self._process_session_batch(batch)
                    successful_migrations += sum(1 for r in batch_results if r['success'])
                    
                    # Update progress
                    self.progress.processed_records += len(batch)
                    self.progress.successful_records += successful_migrations
                    
                    logger.info(f"Processed {self.progress.processed_records}/{total_records} session records")
                
                return MigrationResult(
                    success=True,
                    progress=self.progress,
                    processing_time=time.time() - start_time,
                    metadata={
                        'total_records': total_records,
                        'successful_migrations': successful_migrations
                    }
                )
                
        except Exception as e:
            logger.error(f"Session migration failed: {e}")
            return MigrationResult(
                success=False,
                progress=self.progress,
                processing_time=time.time() - start_time,
                metadata={'error': str(e)}
            )
    
    @log_async_performance
    async def migrate_transaction_data(
        self,
        contract_ids: Optional[List[str]] = None,
        batch_size: Optional[int] = None
    ) -> MigrationResult:
        """
        Migrate transaction data specifically
        
        Args:
            contract_ids: Specific contract IDs to migrate
            batch_size: Batch size for processing
            
        Returns:
            MigrationResult with migration statistics
        """
        start_time = time.time()
        batch_size = batch_size or self.config.batch_size
        
        try:
            with LogContext("Migrating transaction data"):
                # Get transaction data
                filter_dict = {}
                if contract_ids:
                    filter_dict["contractId"] = {"$in": contract_ids}
                
                transaction_data = await self.db.find_documents("transactions", filter_dict)
                
                if not transaction_data:
                    logger.warning("No transaction data found to migrate")
                    return MigrationResult(
                        success=True,
                        progress=self.progress,
                        processing_time=time.time() - start_time,
                        metadata={'message': 'No data to migrate'}
                    )
                
                # Process in batches
                total_records = len(transaction_data)
                successful_migrations = 0
                
                for i in range(0, total_records, batch_size):
                    batch = transaction_data[i:i + batch_size]
                    
                    # Process batch
                    batch_results = await self._process_transaction_batch(batch)
                    successful_migrations += sum(1 for r in batch_results if r['success'])
                    
                    # Update progress
                    self.progress.processed_records += len(batch)
                    self.progress.successful_records += successful_migrations
                    
                    logger.info(f"Processed {self.progress.processed_records}/{total_records} transaction records")
                
                return MigrationResult(
                    success=True,
                    progress=self.progress,
                    processing_time=time.time() - start_time,
                    metadata={
                        'total_records': total_records,
                        'successful_migrations': successful_migrations
                    }
                )
                
        except Exception as e:
            logger.error(f"Transaction migration failed: {e}")
            return MigrationResult(
                success=False,
                progress=self.progress,
                processing_time=time.time() - start_time,
                metadata={'error': str(e)}
            )
    
    async def validate_migration(
        self,
        sample_size: int = 100
    ) -> Dict[str, Any]:
        """
        Validate migration results
        
        Args:
            sample_size: Number of records to sample for validation
            
        Returns:
            Validation results
        """
        try:
            with LogContext("Validating migration results"):
                validation_results = {
                    'total_vector_documents': 0,
                    'sample_validation': {},
                    'data_integrity': {},
                    'embedding_quality': {},
                    'performance_metrics': {}
                }
                
                # Count total vector documents
                total_docs = await self.db.count_documents("vectordocuments", {})
                validation_results['total_vector_documents'] = total_docs
                
                # Sample validation
                sample_docs = await self.db.find_documents(
                    "vectordocuments",
                    {},
                    limit=sample_size
                )
                
                if sample_docs:
                    # Validate sample
                    sample_validation = await self._validate_sample(sample_docs)
                    validation_results['sample_validation'] = sample_validation
                    
                    # Check embedding quality
                    embedding_quality = await self._validate_embedding_quality(sample_docs)
                    validation_results['embedding_quality'] = embedding_quality
                
                # Data integrity checks
                integrity_results = await self._check_data_integrity()
                validation_results['data_integrity'] = integrity_results
                
                return validation_results
                
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return {'error': str(e)}
    
    async def pause_migration(self):
        """Pause the migration process"""
        self.should_pause = True
        await self._save_checkpoint()
        logger.info("Migration paused")
    
    async def resume_migration(self):
        """Resume the migration process"""
        self.should_pause = False
        await self._load_checkpoint()
        logger.info("Migration resumed")
    
    async def get_migration_status(self) -> Dict[str, Any]:
        """Get current migration status"""
        return {
            'is_running': self.is_running,
            'should_pause': self.should_pause,
            'progress': {
                'total_records': self.progress.total_records,
                'processed_records': self.progress.processed_records,
                'successful_records': self.progress.successful_records,
                'failed_records': self.progress.failed_records,
                'percentage_complete': self.progress.percentage_complete,
                'success_rate': self.progress.success_rate,
                'current_source': self.progress.current_source,
                'start_time': self.progress.start_time.isoformat() if self.progress.start_time else None,
                'estimated_completion': self.progress.estimated_completion.isoformat() if self.progress.estimated_completion else None
            },
            'errors': self.progress.errors[-10:]  # Last 10 errors
        }
    
    # Private methods
    
    async def _calculate_total_records(
        self,
        site_ids: Optional[List[str]],
        team_ids: Optional[List[str]],
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ):
        """Calculate total records to migrate"""
        total = 0
        
        for source in self.config.source_types:
            count = await self._count_source_records(
                source, site_ids, team_ids, start_date, end_date
            )
            total += count
        
        self.progress.total_records = total
        logger.info(f"Total records to migrate: {total}")
    
    async def _count_source_records(
        self,
        source: DataSource,
        site_ids: Optional[List[str]],
        team_ids: Optional[List[str]],
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> int:
        """Count records for a specific source"""
        filter_dict = {}
        
        # Build filter based on source type
        if source == DataSource.ANALYTICS:
            collection = "analytics"
            if site_ids:
                filter_dict["siteId"] = {"$in": site_ids}
        elif source == DataSource.SESSIONS:
            collection = "sessions"
            if site_ids:
                filter_dict["siteId"] = {"$in": site_ids}
        elif source == DataSource.CAMPAIGNS:
            collection = "campaigns"
            if site_ids:
                filter_dict["siteId"] = {"$in": site_ids}
        elif source == DataSource.TRANSACTIONS:
            collection = "transactions"
            # For transactions, we need to filter by contracts
            if site_ids:
                # Get contracts for sites
                contracts = await self.db.find_documents(
                    "smartcontracts",
                    {"siteId": {"$in": site_ids}} if site_ids else {}
                )
                contract_ids = [str(c["_id"]) for c in contracts]
                filter_dict["contractId"] = {"$in": contract_ids}
        else:
            return 0
        
        # Add date filters
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filter_dict["createdAt"] = date_filter
        
        return await self.db.count_documents(collection, filter_dict)
    
    async def _migrate_data_source(
        self,
        source: DataSource,
        site_ids: Optional[List[str]],
        team_ids: Optional[List[str]],
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ):
        """Migrate data from a specific source"""
        logger.info(f"Migrating data from source: {source.value}")
        
        if source == DataSource.ANALYTICS:
            await self.migrate_analytics_data(site_ids, self.config.batch_size)
        elif source == DataSource.SESSIONS:
            await self.migrate_session_data(site_ids, self.config.batch_size)
        elif source == DataSource.TRANSACTIONS:
            # Get contract IDs for sites
            contract_ids = None
            if site_ids:
                contracts = await self.db.find_documents(
                    "smartcontracts",
                    {"siteId": {"$in": site_ids}}
                )
                contract_ids = [str(c["_id"]) for c in contracts]
            
            await self.migrate_transaction_data(contract_ids, self.config.batch_size)
        # Add other sources as needed
    
    async def _process_analytics_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of analytics data"""
        results = []
        
        for record in batch:
            try:
                # Extract relevant data for embedding
                content = await self._extract_analytics_content(record)
                
                # Generate embedding
                embedding_result = await self.embedding_generator.generate_embedding(
                    content,
                    self.config.embedding_model,
                    context={
                        'data_type': 'analytics',
                        'source_type': 'analytics',
                        'site_id': record.get('siteId'),
                        'importance': 7
                    }
                )
                
                if embedding_result.success:
                    # Create vector document
                    vector_doc = await self._create_vector_document(
                        record, embedding_result, 'analytics'
                    )
                    
                    # Insert into database
                    await self.db.insert_document("vectordocuments", vector_doc)
                    results.append({'success': True, 'record_id': record.get('_id')})
                else:
                    results.append({'success': False, 'error': embedding_result.error})
                    
            except Exception as e:
                logger.error(f"Error processing analytics record: {e}")
                results.append({'success': False, 'error': str(e)})
        
        return results
    
    async def _process_session_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of session data"""
        results = []
        
        for record in batch:
            try:
                # Extract relevant data for embedding
                content = await self._extract_session_content(record)
                
                # Generate embedding
                embedding_result = await self.embedding_generator.generate_embedding(
                    content,
                    self.config.embedding_model,
                    context={
                        'data_type': 'session',
                        'source_type': 'session',
                        'site_id': record.get('siteId'),
                        'importance': 6
                    }
                )
                
                if embedding_result.success:
                    # Create vector document
                    vector_doc = await self._create_vector_document(
                        record, embedding_result, 'session'
                    )
                    
                    # Insert into database
                    await self.db.insert_document("vectordocuments", vector_doc)
                    results.append({'success': True, 'record_id': record.get('_id')})
                else:
                    results.append({'success': False, 'error': embedding_result.error})
                    
            except Exception as e:
                logger.error(f"Error processing session record: {e}")
                results.append({'success': False, 'error': str(e)})
        
        return results
    
    async def _process_transaction_batch(self, batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of transaction data"""
        results = []
        
        for record in batch:
            try:
                # Extract relevant data for embedding
                content = await self._extract_transaction_content(record)
                
                # Generate embedding
                embedding_result = await self.embedding_generator.generate_embedding(
                    content,
                    self.config.embedding_model,
                    context={
                        'data_type': 'transaction',
                        'source_type': 'transaction',
                        'contract_id': record.get('contractId'),
                        'importance': 8
                    }
                )
                
                if embedding_result.success:
                    # Create vector document
                    vector_doc = await self._create_vector_document(
                        record, embedding_result, 'transaction'
                    )
                    
                    # Insert into database
                    await self.db.insert_document("vectordocuments", vector_doc)
                    results.append({'success': True, 'record_id': record.get('_id')})
                else:
                    results.append({'success': False, 'error': embedding_result.error})
                    
            except Exception as e:
                logger.error(f"Error processing transaction record: {e}")
                results.append({'success': False, 'error': str(e)})
        
        return results
    
    async def _extract_analytics_content(self, record: Dict[str, Any]) -> str:
        """Extract content from analytics record for embedding"""
        content_parts = []
        
        # Basic analytics info
        content_parts.append(f"Site ID: {record.get('siteId', 'unknown')}")
        content_parts.append(f"Total Visitors: {record.get('totalVisitors', 0)}")
        content_parts.append(f"Unique Visitors: {record.get('uniqueVisitors', 0)}")
        content_parts.append(f"Web3 Visitors: {record.get('web3Visitors', 0)}")
        content_parts.append(f"Wallets Connected: {record.get('walletsConnected', 0)}")
        content_parts.append(f"Total Page Views: {record.get('totalPageViews', 0)}")
        
        # Page views breakdown
        if record.get('pageViews'):
            page_views = record['pageViews']
            top_pages = sorted(page_views.items(), key=lambda x: x[1], reverse=True)[:5]
            content_parts.append(f"Top Pages: {', '.join([f'{page}: {views}' for page, views in top_pages])}")
        
        # User journey information
        if record.get('userJourneys'):
            journey_count = len(record['userJourneys'])
            content_parts.append(f"User Journeys: {journey_count}")
        
        return " | ".join(content_parts)
    
    async def _extract_session_content(self, record: Dict[str, Any]) -> str:
        """Extract content from session record for embedding"""
        content_parts = []
        
        # Basic session info
        content_parts.append(f"Site ID: {record.get('siteId', 'unknown')}")
        content_parts.append(f"User ID: {record.get('userId', 'unknown')}")
        content_parts.append(f"Duration: {record.get('duration', 0)} seconds")
        content_parts.append(f"Pages Viewed: {record.get('pagesViewed', 0)}")
        content_parts.append(f"Is Bounce: {record.get('isBounce', False)}")
        content_parts.append(f"Is Web3 User: {record.get('isWeb3User', False)}")
        
        # Device and browser info
        if record.get('browser'):
            browser = record['browser']
            content_parts.append(f"Browser: {browser.get('name', 'unknown')}")
        
        if record.get('device'):
            device = record['device']
            content_parts.append(f"Device: {device.get('type', 'unknown')}")
        
        # Wallet info
        if record.get('wallet') and record['wallet'].get('walletAddress'):
            wallet = record['wallet']
            content_parts.append(f"Wallet: {wallet.get('walletType', 'unknown')}")
            content_parts.append(f"Chain: {wallet.get('chainName', 'unknown')}")
        
        # UTM data
        if record.get('utmData'):
            utm = record['utmData']
            if utm.get('source'):
                content_parts.append(f"UTM Source: {utm['source']}")
            if utm.get('medium'):
                content_parts.append(f"UTM Medium: {utm['medium']}")
        
        return " | ".join(content_parts)
    
    async def _extract_transaction_content(self, record: Dict[str, Any]) -> str:
        """Extract content from transaction record for embedding"""
        content_parts = []
        
        # Basic transaction info
        content_parts.append(f"Contract ID: {record.get('contractId', 'unknown')}")
        content_parts.append(f"Transaction Hash: {record.get('tx_hash', 'unknown')}")
        content_parts.append(f"From Address: {record.get('from_address', 'unknown')}")
        content_parts.append(f"To Address: {record.get('to_address', 'unknown')}")
        content_parts.append(f"Value ETH: {record.get('value_eth', '0')}")
        content_parts.append(f"Gas Used: {record.get('gas_used', 0)}")
        content_parts.append(f"Status: {record.get('status', 'unknown')}")
        
        # Token info
        if record.get('token_name'):
            content_parts.append(f"Token: {record['token_name']}")
        if record.get('token_symbol'):
            content_parts.append(f"Symbol: {record['token_symbol']}")
        
        # Chain info
        if record.get('chain'):
            content_parts.append(f"Chain: {record['chain']}")
        
        # Block info
        if record.get('block_number'):
            content_parts.append(f"Block: {record['block_number']}")
        
        return " | ".join(content_parts)
    
    async def _create_vector_document(
        self,
        original_record: Dict[str, Any],
        embedding_result,
        source_type: str
    ) -> Dict[str, Any]:
        """Create vector document from original record and embedding"""
        return {
            'documentId': f"{source_type}_{original_record['_id']}",
            'sourceType': source_type,
            'sourceId': original_record['_id'],
            'siteId': original_record.get('siteId'),
            'teamId': original_record.get('teamId'),
            'embedding': embedding_result.embedding.tolist(),
            'content': embedding_result.metadata.get('processed_text_length', ''),
            'metadata': {
                'dataType': source_type,
                'originalRecord': original_record,
                'embeddingModel': embedding_result.model_used,
                'qualityScore': embedding_result.quality_score,
                'processingTime': embedding_result.processing_time,
                'migrationTimestamp': datetime.now().isoformat()
            },
            'status': 'active',
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
    
    async def _validate_sample(self, sample_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate a sample of migrated documents"""
        validation_results = {
            'total_sample': len(sample_docs),
            'valid_embeddings': 0,
            'valid_metadata': 0,
            'valid_content': 0,
            'issues': []
        }
        
        for doc in sample_docs:
            # Check embedding
            if 'embedding' in doc and isinstance(doc['embedding'], list):
                if len(doc['embedding']) == 1536:  # Expected dimension
                    validation_results['valid_embeddings'] += 1
                else:
                    validation_results['issues'].append(f"Invalid embedding dimension: {len(doc['embedding'])}")
            
            # Check metadata
            if 'metadata' in doc and isinstance(doc['metadata'], dict):
                validation_results['valid_metadata'] += 1
            
            # Check content
            if 'content' in doc and doc['content']:
                validation_results['valid_content'] += 1
        
        return validation_results
    
    async def _validate_embedding_quality(self, sample_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate embedding quality in sample"""
        quality_results = {
            'average_quality': 0.0,
            'quality_distribution': {'excellent': 0, 'good': 0, 'fair': 0, 'poor': 0},
            'issues': []
        }
        
        total_quality = 0
        valid_embeddings = 0
        
        for doc in sample_docs:
            if 'metadata' in doc and 'qualityScore' in doc['metadata']:
                quality_score = doc['metadata']['qualityScore']
                total_quality += quality_score
                valid_embeddings += 1
                
                # Categorize quality
                if quality_score >= 0.9:
                    quality_results['quality_distribution']['excellent'] += 1
                elif quality_score >= 0.7:
                    quality_results['quality_distribution']['good'] += 1
                elif quality_score >= 0.5:
                    quality_results['quality_distribution']['fair'] += 1
                else:
                    quality_results['quality_distribution']['poor'] += 1
        
        if valid_embeddings > 0:
            quality_results['average_quality'] = total_quality / valid_embeddings
        
        return quality_results
    
    async def _check_data_integrity(self) -> Dict[str, Any]:
        """Check data integrity across collections"""
        integrity_results = {
            'missing_references': 0,
            'duplicate_documents': 0,
            'orphaned_embeddings': 0,
            'consistency_issues': []
        }
        
        # Check for duplicates
        pipeline = [
            {"$group": {"_id": "$documentId", "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        duplicates = await self.db.aggregate("vectordocuments", pipeline)
        integrity_results['duplicate_documents'] = len(duplicates)
        
        # Additional integrity checks can be added here
        
        return integrity_results
    
    async def _save_checkpoint(self):
        """Save migration checkpoint"""
        checkpoint_data = {
            'progress': {
                'total_records': self.progress.total_records,
                'processed_records': self.progress.processed_records,
                'successful_records': self.progress.successful_records,
                'failed_records': self.progress.failed_records,
                'current_source': self.progress.current_source
            },
            'config': self.config.__dict__,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            with open(self.checkpoint_file, 'w') as f:
                json.dump(checkpoint_data, f, indent=2)
            logger.info("Checkpoint saved")
        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
    
    async def _load_checkpoint(self):
        """Load migration checkpoint"""
        try:
            with open(self.checkpoint_file, 'r') as f:
                checkpoint_data = json.load(f)
            
            # Restore progress
            progress_data = checkpoint_data['progress']
            self.progress.total_records = progress_data['total_records']
            self.progress.processed_records = progress_data['processed_records']
            self.progress.successful_records = progress_data['successful_records']
            self.progress.failed_records = progress_data['failed_records']
            self.progress.current_source = progress_data['current_source']
            
            logger.info("Checkpoint loaded")
        except FileNotFoundError:
            logger.info("No checkpoint file found, starting fresh")
        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
    
    async def _finalize_migration(self):
        """Finalize migration process"""
        # Update progress
        self.progress.estimated_completion = datetime.now()
        
        # Clean up checkpoint file
        try:
            import os
            if os.path.exists(self.checkpoint_file):
                os.remove(self.checkpoint_file)
        except Exception as e:
            logger.warning(f"Error cleaning up checkpoint file: {e}")
        
        logger.info("Migration finalized")

# Convenience functions
async def create_migrator(config: Optional[MigrationConfig] = None) -> VectorMigrator:
    """Create and initialize a vector migrator"""
    migrator = VectorMigrator(config)
    await migrator.initialize()
    return migrator 