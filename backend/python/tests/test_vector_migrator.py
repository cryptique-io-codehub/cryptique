"""
Comprehensive tests for Vector Migrator service
"""

import pytest
import json
import tempfile
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from pathlib import Path

from services.vector_migrator import (
    VectorMigrator,
    MigrationConfig,
    MigrationProgress,
    MigrationResult,
    MigrationStatus,
    DataSource
)
from services.embedding_generator import EmbeddingModel, EmbeddingResult
from . import SAMPLE_ANALYTICS_DATA, SAMPLE_SESSION_DATA, SAMPLE_TRANSACTION_DATA


class TestVectorMigrator:
    """Test suite for VectorMigrator class"""
    
    @pytest.fixture
    def migration_config(self):
        """Create test migration configuration"""
        return MigrationConfig(
            source_types=[DataSource.ANALYTICS, DataSource.SESSIONS],
            batch_size=10,
            max_workers=2,
            embedding_model=EmbeddingModel.GEMINI,
            validate_data=True,
            optimize_embeddings=True
        )
    
    @pytest.fixture
    async def vector_migrator(self, migration_config, mock_database):
        """Create VectorMigrator instance with mocked dependencies"""
        migrator = VectorMigrator(migration_config)
        migrator.db = mock_database
        
        # Mock data processor
        migrator.data_processor = AsyncMock()
        migrator.data_processor.initialize = AsyncMock()
        
        # Mock embedding generator
        migrator.embedding_generator = AsyncMock()
        migrator.embedding_generator.initialize = AsyncMock()
        migrator.embedding_generator.generate_embedding = AsyncMock(
            return_value=EmbeddingResult(
                success=True,
                embedding=[0.1] * 1536,
                model_used="gemini",
                dimensions=1536,
                quality_score=0.85,
                processing_time=0.5
            )
        )
        
        return migrator
    
    @pytest.mark.asyncio
    async def test_initialization(self, migration_config):
        """Test VectorMigrator initialization"""
        migrator = VectorMigrator(migration_config)
        
        assert migrator.config == migration_config
        assert migrator.db is None
        assert migrator.progress.total_records == 0
        assert migrator.progress.processed_records == 0
        assert migrator.is_running is False
        assert migrator.should_pause is False
        
        # Test initialize method
        with patch('utils.database.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            await migrator.initialize()
            assert migrator.db is not None
    
    @pytest.mark.asyncio
    async def test_migrate_analytics_data_success(self, vector_migrator):
        """Test successful analytics data migration"""
        # Mock database response
        analytics_data = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(5)]
        vector_migrator.db.find_documents.return_value = analytics_data
        
        result = await vector_migrator.migrate_analytics_data(
            site_ids=["test_site_123"],
            batch_size=2
        )
        
        assert result.success is True
        assert result.progress.processed_records > 0
        assert result.processing_time is not None
        assert result.metadata['total_records'] == len(analytics_data)
    
    @pytest.mark.asyncio
    async def test_migrate_analytics_data_no_data(self, vector_migrator):
        """Test analytics data migration with no data"""
        vector_migrator.db.find_documents.return_value = []
        
        result = await vector_migrator.migrate_analytics_data(
            site_ids=["test_site_123"]
        )
        
        assert result.success is True
        assert result.metadata['message'] == 'No data to migrate'
    
    @pytest.mark.asyncio
    async def test_migrate_session_data_success(self, vector_migrator):
        """Test successful session data migration"""
        # Mock database response
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(8)]
        vector_migrator.db.find_documents.return_value = session_data
        
        result = await vector_migrator.migrate_session_data(
            site_ids=["test_site_123"],
            batch_size=3
        )
        
        assert result.success is True
        assert result.progress.processed_records > 0
        assert result.processing_time is not None
        assert result.metadata['total_records'] == len(session_data)
    
    @pytest.mark.asyncio
    async def test_migrate_transaction_data_success(self, vector_migrator):
        """Test successful transaction data migration"""
        # Mock database response
        transaction_data = [SAMPLE_TRANSACTION_DATA.copy() for _ in range(6)]
        vector_migrator.db.find_documents.return_value = transaction_data
        
        result = await vector_migrator.migrate_transaction_data(
            contract_ids=["contract_789"],
            batch_size=2
        )
        
        assert result.success is True
        assert result.progress.processed_records > 0
        assert result.processing_time is not None
        assert result.metadata['total_records'] == len(transaction_data)
    
    @pytest.mark.asyncio
    async def test_migrate_all_data_success(self, vector_migrator):
        """Test successful complete data migration"""
        # Mock database responses for different data types
        analytics_data = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(3)]
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(4)]
        
        vector_migrator.db.find_documents.side_effect = [
            analytics_data,  # Analytics count
            session_data,    # Session count
            analytics_data,  # Analytics data
            session_data     # Session data
        ]
        
        vector_migrator.db.count_documents.side_effect = [
            len(analytics_data),  # Analytics count
            len(session_data)     # Session count
        ]
        
        result = await vector_migrator.migrate_all_data(
            site_ids=["test_site_123"],
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31)
        )
        
        assert result.success is True
        assert result.progress.total_records > 0
        assert result.progress.processed_records >= 0
        assert result.processing_time is not None
    
    @pytest.mark.asyncio
    async def test_validate_migration_success(self, vector_migrator):
        """Test migration validation"""
        # Mock vector documents
        sample_docs = [
            {
                'documentId': 'analytics_1',
                'sourceType': 'analytics',
                'embedding': [0.1] * 1536,
                'metadata': {'qualityScore': 0.85}
            },
            {
                'documentId': 'session_1',
                'sourceType': 'session',
                'embedding': [0.2] * 1536,
                'metadata': {'qualityScore': 0.90}
            }
        ]
        
        vector_migrator.db.count_documents.return_value = len(sample_docs)
        vector_migrator.db.find_documents.return_value = sample_docs
        vector_migrator.db.aggregate.return_value = []  # No duplicates
        
        validation_results = await vector_migrator.validate_migration(sample_size=2)
        
        assert validation_results['total_vector_documents'] == len(sample_docs)
        assert 'sample_validation' in validation_results
        assert 'embedding_quality' in validation_results
        assert 'data_integrity' in validation_results
    
    @pytest.mark.asyncio
    async def test_migration_progress_tracking(self, vector_migrator):
        """Test migration progress tracking"""
        # Test initial progress
        assert vector_migrator.progress.percentage_complete == 0.0
        assert vector_migrator.progress.success_rate == 0.0
        
        # Simulate progress updates
        vector_migrator.progress.total_records = 100
        vector_migrator.progress.processed_records = 50
        vector_migrator.progress.successful_records = 45
        vector_migrator.progress.failed_records = 5
        
        assert vector_migrator.progress.percentage_complete == 50.0
        assert vector_migrator.progress.success_rate == 90.0
    
    @pytest.mark.asyncio
    async def test_checkpoint_save_and_load(self, vector_migrator):
        """Test checkpoint save and load functionality"""
        # Set up progress
        vector_migrator.progress.total_records = 100
        vector_migrator.progress.processed_records = 50
        vector_migrator.progress.successful_records = 45
        vector_migrator.progress.current_source = "analytics"
        
        # Test save checkpoint
        with tempfile.TemporaryDirectory() as temp_dir:
            checkpoint_file = Path(temp_dir) / "test_checkpoint.json"
            vector_migrator.checkpoint_file = str(checkpoint_file)
            
            await vector_migrator._save_checkpoint()
            
            # Verify checkpoint file exists
            assert checkpoint_file.exists()
            
            # Reset progress
            vector_migrator.progress = MigrationProgress()
            
            # Test load checkpoint
            await vector_migrator._load_checkpoint()
            
            # Verify progress is restored
            assert vector_migrator.progress.total_records == 100
            assert vector_migrator.progress.processed_records == 50
            assert vector_migrator.progress.successful_records == 45
            assert vector_migrator.progress.current_source == "analytics"
    
    @pytest.mark.asyncio
    async def test_data_extraction_methods(self, vector_migrator):
        """Test data extraction methods for different data types"""
        # Test analytics content extraction
        analytics_content = await vector_migrator._extract_analytics_content(SAMPLE_ANALYTICS_DATA)
        assert "Site ID: test_site_123" in analytics_content
        assert "Total Visitors: 1000" in analytics_content
        assert "Web3 Visitors: 200" in analytics_content
        
        # Test session content extraction
        session_content = await vector_migrator._extract_session_content(SAMPLE_SESSION_DATA)
        assert "Site ID: test_site_123" in session_content
        assert "User ID: user_456" in session_content
        assert "Duration: 300 seconds" in session_content
        assert "Is Web3 User: True" in session_content
        
        # Test transaction content extraction
        transaction_content = await vector_migrator._extract_transaction_content(SAMPLE_TRANSACTION_DATA)
        assert "Contract ID: contract_789" in transaction_content
        assert "Value ETH: 1.5" in transaction_content
        assert "Status: success" in transaction_content
    
    @pytest.mark.asyncio
    async def test_vector_document_creation(self, vector_migrator):
        """Test vector document creation"""
        # Mock embedding result
        embedding_result = EmbeddingResult(
            success=True,
            embedding=[0.1] * 1536,
            model_used="gemini",
            dimensions=1536,
            quality_score=0.85,
            processing_time=0.5,
            metadata={'processed_text_length': 100}
        )
        
        vector_doc = await vector_migrator._create_vector_document(
            original_record=SAMPLE_ANALYTICS_DATA,
            embedding_result=embedding_result,
            source_type="analytics"
        )
        
        assert vector_doc['documentId'] == f"analytics_{SAMPLE_ANALYTICS_DATA['_id']}"
        assert vector_doc['sourceType'] == "analytics"
        assert vector_doc['siteId'] == SAMPLE_ANALYTICS_DATA['siteId']
        assert vector_doc['embedding'] == embedding_result.embedding
        assert vector_doc['metadata']['qualityScore'] == 0.85
        assert vector_doc['metadata']['embeddingModel'] == "gemini"
        assert vector_doc['status'] == 'active'
    
    @pytest.mark.asyncio
    async def test_batch_processing(self, vector_migrator):
        """Test batch processing functionality"""
        # Create test batch
        batch_data = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(5)]
        for i, item in enumerate(batch_data):
            item['_id'] = f'analytics_{i}'
        
        # Test analytics batch processing
        results = await vector_migrator._process_analytics_batch(batch_data)
        
        assert len(results) == len(batch_data)
        # All should succeed with mocked embedding generator
        assert all(result['success'] for result in results)
    
    @pytest.mark.asyncio
    async def test_migration_error_handling(self, vector_migrator):
        """Test error handling during migration"""
        # Mock database error
        vector_migrator.db.find_documents.side_effect = Exception("Database error")
        
        result = await vector_migrator.migrate_analytics_data(
            site_ids=["test_site_123"]
        )
        
        assert result.success is False
        assert result.metadata['error'] == "Database error"
    
    @pytest.mark.asyncio
    async def test_embedding_generation_failure(self, vector_migrator):
        """Test handling of embedding generation failures"""
        # Mock embedding generator failure
        vector_migrator.embedding_generator.generate_embedding.return_value = EmbeddingResult(
            success=False,
            error="Embedding generation failed"
        )
        
        batch_data = [SAMPLE_ANALYTICS_DATA.copy()]
        results = await vector_migrator._process_analytics_batch(batch_data)
        
        assert len(results) == 1
        assert results[0]['success'] is False
        assert "Embedding generation failed" in results[0]['error']
    
    @pytest.mark.asyncio
    async def test_migration_status_tracking(self, vector_migrator):
        """Test migration status tracking"""
        # Test initial status
        status = await vector_migrator.get_migration_status()
        assert status['is_running'] is False
        assert status['should_pause'] is False
        assert status['progress']['total_records'] == 0
        
        # Simulate running migration
        vector_migrator.is_running = True
        vector_migrator.progress.total_records = 100
        vector_migrator.progress.processed_records = 50
        vector_migrator.progress.start_time = datetime.now()
        
        status = await vector_migrator.get_migration_status()
        assert status['is_running'] is True
        assert status['progress']['percentage_complete'] == 50.0
        assert status['progress']['start_time'] is not None
    
    @pytest.mark.asyncio
    async def test_pause_and_resume_migration(self, vector_migrator):
        """Test pause and resume functionality"""
        # Test pause
        await vector_migrator.pause_migration()
        assert vector_migrator.should_pause is True
        
        # Test resume
        await vector_migrator.resume_migration()
        assert vector_migrator.should_pause is False
    
    @pytest.mark.asyncio
    async def test_data_validation_during_migration(self, vector_migrator):
        """Test data validation during migration"""
        # Create test data with validation issues
        invalid_data = SAMPLE_ANALYTICS_DATA.copy()
        invalid_data['totalVisitors'] = -100  # Invalid negative value
        
        # Test validation
        batch_data = [invalid_data]
        results = await vector_migrator._process_analytics_batch(batch_data)
        
        # Should still process but may have lower quality
        assert len(results) == 1
        # With mocked embedding generator, it should still succeed
        assert results[0]['success'] is True
    
    @pytest.mark.asyncio
    async def test_migration_finalization(self, vector_migrator):
        """Test migration finalization"""
        # Set up completion state
        vector_migrator.progress.total_records = 100
        vector_migrator.progress.processed_records = 100
        vector_migrator.progress.successful_records = 95
        
        # Test finalization
        await vector_migrator._finalize_migration()
        
        assert vector_migrator.progress.estimated_completion is not None


class TestMigrationConfig:
    """Test suite for MigrationConfig class"""
    
    def test_default_config(self):
        """Test default migration configuration"""
        config = MigrationConfig()
        
        assert config.source_types == []
        assert config.batch_size == 100
        assert config.max_workers == 4
        assert config.embedding_model == EmbeddingModel.GEMINI
        assert config.validate_data is True
        assert config.optimize_embeddings is True
        assert config.backup_original is True
        assert config.resume_from_checkpoint is True
    
    def test_custom_config(self):
        """Test custom migration configuration"""
        config = MigrationConfig(
            source_types=[DataSource.ANALYTICS, DataSource.SESSIONS],
            batch_size=50,
            max_workers=2,
            embedding_model=EmbeddingModel.OPENAI,
            validate_data=False,
            optimize_embeddings=False
        )
        
        assert len(config.source_types) == 2
        assert config.batch_size == 50
        assert config.max_workers == 2
        assert config.embedding_model == EmbeddingModel.OPENAI
        assert config.validate_data is False
        assert config.optimize_embeddings is False


class TestMigrationProgress:
    """Test suite for MigrationProgress class"""
    
    def test_initial_progress(self):
        """Test initial progress state"""
        progress = MigrationProgress()
        
        assert progress.total_records == 0
        assert progress.processed_records == 0
        assert progress.successful_records == 0
        assert progress.failed_records == 0
        assert progress.skipped_records == 0
        assert progress.current_source is None
        assert progress.start_time is None
        assert progress.estimated_completion is None
        assert progress.errors == []
    
    def test_progress_calculations(self):
        """Test progress calculation properties"""
        progress = MigrationProgress()
        progress.total_records = 100
        progress.processed_records = 50
        progress.successful_records = 45
        progress.failed_records = 5
        
        assert progress.percentage_complete == 50.0
        assert progress.success_rate == 90.0
    
    def test_progress_edge_cases(self):
        """Test progress calculation edge cases"""
        progress = MigrationProgress()
        
        # Test with zero total records
        assert progress.percentage_complete == 0.0
        assert progress.success_rate == 0.0
        
        # Test with zero processed records
        progress.total_records = 100
        assert progress.percentage_complete == 0.0
        assert progress.success_rate == 0.0


class TestDataSource:
    """Test suite for DataSource enum"""
    
    def test_data_source_values(self):
        """Test DataSource enum values"""
        assert DataSource.ANALYTICS.value == "analytics"
        assert DataSource.SESSIONS.value == "sessions"
        assert DataSource.CAMPAIGNS.value == "campaigns"
        assert DataSource.TRANSACTIONS.value == "transactions"
        assert DataSource.SMART_CONTRACTS.value == "smart_contracts"
        assert DataSource.GRANULAR_EVENTS.value == "granular_events"
    
    def test_data_source_iteration(self):
        """Test DataSource enum iteration"""
        sources = list(DataSource)
        assert len(sources) == 6
        assert DataSource.ANALYTICS in sources
        assert DataSource.SESSIONS in sources


class TestVectorMigratorIntegration:
    """Integration tests for VectorMigrator"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_full_migration_pipeline(self, vector_migrator):
        """Test complete migration pipeline"""
        # Create comprehensive test data
        analytics_data = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(10)]
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(15)]
        
        for i, item in enumerate(analytics_data):
            item['_id'] = f'analytics_{i}'
        for i, item in enumerate(session_data):
            item['_id'] = f'session_{i}'
        
        # Mock database responses
        vector_migrator.db.find_documents.side_effect = [
            analytics_data,  # Analytics data
            session_data     # Session data
        ]
        
        vector_migrator.db.count_documents.side_effect = [
            len(analytics_data),  # Analytics count
            len(session_data)     # Session count
        ]
        
        # Test migration
        result = await vector_migrator.migrate_all_data(
            site_ids=["test_site_123"]
        )
        
        assert result.success is True
        assert result.progress.total_records > 0
        assert result.processing_time is not None
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_migration_with_validation(self, vector_migrator):
        """Test migration with validation enabled"""
        # Enable validation
        vector_migrator.config.validate_data = True
        
        # Create test data
        analytics_data = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(5)]
        vector_migrator.db.find_documents.return_value = analytics_data
        
        # Test migration
        result = await vector_migrator.migrate_analytics_data(
            site_ids=["test_site_123"]
        )
        
        assert result.success is True
        assert result.progress.processed_records > 0
    
    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_large_dataset_migration(self, vector_migrator):
        """Test migration with large dataset"""
        # Create large dataset
        large_dataset = [SAMPLE_ANALYTICS_DATA.copy() for _ in range(100)]
        for i, item in enumerate(large_dataset):
            item['_id'] = f'large_analytics_{i}'
        
        vector_migrator.db.find_documents.return_value = large_dataset
        
        # Test migration performance
        result = await vector_migrator.migrate_analytics_data(
            site_ids=["test_site_123"],
            batch_size=10
        )
        
        assert result.success is True
        assert result.progress.processed_records == len(large_dataset)
        assert result.processing_time is not None
        assert result.processing_time < 300  # Should complete within 5 minutes
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_migration_recovery(self, vector_migrator):
        """Test migration recovery from checkpoint"""
        # Simulate partial migration
        vector_migrator.progress.total_records = 100
        vector_migrator.progress.processed_records = 50
        vector_migrator.progress.successful_records = 45
        
        # Save checkpoint
        with tempfile.TemporaryDirectory() as temp_dir:
            checkpoint_file = Path(temp_dir) / "recovery_checkpoint.json"
            vector_migrator.checkpoint_file = str(checkpoint_file)
            
            await vector_migrator._save_checkpoint()
            
            # Create new migrator instance
            new_migrator = VectorMigrator(vector_migrator.config)
            new_migrator.checkpoint_file = str(checkpoint_file)
            
            # Load checkpoint
            await new_migrator._load_checkpoint()
            
            # Verify recovery
            assert new_migrator.progress.total_records == 100
            assert new_migrator.progress.processed_records == 50
            assert new_migrator.progress.successful_records == 45 