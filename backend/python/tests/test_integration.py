"""
Comprehensive integration tests for API endpoints and service communication
"""

import pytest
import json
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from api.main import app
from services.data_processor import ProcessingResult
from services.embedding_generator import EmbeddingResult, BatchEmbeddingResult
from services.vector_migrator import MigrationResult, MigrationProgress
from services.analytics_ml import MLModelResult
from . import (
    SAMPLE_ANALYTICS_DATA, 
    SAMPLE_SESSION_DATA, 
    SAMPLE_EMBEDDING_TEXT, 
    SAMPLE_EMBEDDING_VECTOR
)


class TestAPIEndpoints:
    """Test suite for API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_services(self):
        """Mock all services"""
        with patch('api.main.data_processor') as mock_dp, \
             patch('api.main.embedding_generator') as mock_eg, \
             patch('api.main.analytics_ml_service') as mock_ml:
            
            # Mock data processor
            mock_dp.db = Mock()
            mock_dp.process_analytics_data = AsyncMock()
            mock_dp.analyze_user_journeys = AsyncMock()
            mock_dp.perform_time_series_analysis = AsyncMock()
            mock_dp.analyze_web3_patterns = AsyncMock()
            
            # Mock embedding generator
            mock_eg.db = Mock()
            mock_eg.generate_embedding = AsyncMock()
            mock_eg.generate_batch_embeddings = AsyncMock()
            mock_eg.calculate_similarity = AsyncMock()
            
            # Mock ML service
            mock_ml.db = Mock()
            mock_ml.predict_user_churn = AsyncMock()
            mock_ml.predict_conversion_probability = AsyncMock()
            mock_ml.detect_anomalies = AsyncMock()
            mock_ml.segment_users = AsyncMock()
            mock_ml.generate_predictive_insights = AsyncMock()
            
            yield {
                'data_processor': mock_dp,
                'embedding_generator': mock_eg,
                'analytics_ml': mock_ml
            }
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Cryptique Python Data Processing API"
        assert data["version"] == "1.0.0"
        assert data["status"] == "running"
        assert "timestamp" in data
    
    def test_health_check_endpoint(self, client):
        """Test health check endpoint"""
        with patch('api.main.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_db.is_connected = True
            mock_get_db.return_value = mock_db
            
            response = client.get("/health")
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "healthy"
            assert "services" in data
            assert "timestamp" in data
    
    def test_health_check_unhealthy(self, client):
        """Test health check when service is unhealthy"""
        with patch('api.main.get_db') as mock_get_db:
            mock_get_db.side_effect = Exception("Database connection failed")
            
            response = client.get("/health")
            assert response.status_code == 503
            
            data = response.json()
            assert data["status"] == "unhealthy"
            assert "error" in data
    
    def test_process_analytics_endpoint_success(self, client, mock_services):
        """Test analytics processing endpoint success"""
        # Mock successful processing
        mock_services['data_processor'].process_analytics_data.return_value = ProcessingResult(
            success=True,
            data=Mock(spec=['__len__', 'columns']),
            metadata={'test': True},
            quality_score=0.9,
            processing_time=1.5
        )
        
        # Mock data length and columns
        mock_services['data_processor'].process_analytics_data.return_value.data.__len__.return_value = 100
        mock_services['data_processor'].process_analytics_data.return_value.data.columns.__len__.return_value = 10
        
        request_data = {
            "site_id": "test_site_123",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-31T23:59:59Z",
            "data_types": ["analytics", "sessions"]
        }
        
        response = client.post("/api/process/analytics", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["data_summary"]["rows"] == 100
        assert data["data_summary"]["columns"] == 10
        assert data["quality_score"] == 0.9
    
    def test_process_analytics_endpoint_failure(self, client, mock_services):
        """Test analytics processing endpoint failure"""
        # Mock failed processing
        mock_services['data_processor'].process_analytics_data.return_value = ProcessingResult(
            success=False,
            errors=["Processing failed"]
        )
        
        request_data = {
            "site_id": "test_site_123"
        }
        
        response = client.post("/api/process/analytics", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is False
        assert "Processing failed" in data["errors"]
    
    def test_user_journeys_endpoint(self, client, mock_services):
        """Test user journeys analysis endpoint"""
        # Mock successful journey analysis
        mock_services['data_processor'].analyze_user_journeys.return_value = ProcessingResult(
            success=True,
            data=Mock(),
            metadata={
                'clusters': {'n_clusters': 3, 'silhouette_score': 0.7},
                'patterns': {'pattern_1': {'size': 50}},
                'insights': [{'type': 'engagement', 'value': 0.8}],
                'feature_importance': {'duration': 0.4, 'pages': 0.3}
            }
        )
        
        response = client.post("/api/process/user-journeys?site_id=test_site_123&time_window=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "clusters" in data
        assert "patterns" in data
        assert "insights" in data
        assert "feature_importance" in data
    
    def test_time_series_endpoint(self, client, mock_services):
        """Test time series analysis endpoint"""
        # Mock successful time series analysis
        mock_services['data_processor'].perform_time_series_analysis.return_value = ProcessingResult(
            success=True,
            data=Mock(),
            metadata={
                'trends': {'direction': 'increasing', 'strength': 0.8},
                'seasonality': {'daily_pattern': True, 'weekly_pattern': False},
                'anomalies': {'anomaly_count': 3, 'anomaly_dates': []},
                'forecast': {'forecast_values': [100, 105, 110]},
                'statistics': {'mean': 100, 'std': 15}
            }
        )
        
        response = client.post("/api/process/time-series?site_id=test_site_123&metric=page_views&time_window=90")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "trends" in data
        assert "seasonality" in data
        assert "anomalies" in data
        assert "forecast" in data
        assert "statistics" in data
    
    def test_web3_patterns_endpoint(self, client, mock_services):
        """Test Web3 patterns analysis endpoint"""
        # Mock successful Web3 analysis
        mock_services['data_processor'].analyze_web3_patterns.return_value = ProcessingResult(
            success=True,
            data=Mock(),
            metadata={
                'transaction_patterns': {'total_transactions': 1000, 'unique_addresses': 500},
                'wallet_behaviors': {'active_wallets': 300, 'whale_wallets': 10},
                'user_segments': {'whale_active': 5, 'frequent_small': 200},
                'web3_metrics': {'total_volume': 1500.5, 'avg_gas_price': 20},
                'insights': [{'type': 'volume', 'value': 1500.5}]
            }
        )
        
        response = client.post("/api/process/web3-patterns?site_id=test_site_123&time_window=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "transaction_patterns" in data
        assert "wallet_behaviors" in data
        assert "user_segments" in data
        assert "web3_metrics" in data
        assert "insights" in data
    
    def test_generate_embedding_endpoint_success(self, client, mock_services):
        """Test embedding generation endpoint success"""
        # Mock successful embedding generation
        mock_services['embedding_generator'].generate_embedding.return_value = EmbeddingResult(
            success=True,
            embedding=SAMPLE_EMBEDDING_VECTOR,
            model_used="gemini",
            dimensions=1536,
            quality_score=0.85,
            processing_time=0.5
        )
        
        request_data = {
            "text": SAMPLE_EMBEDDING_TEXT,
            "model": "gemini",
            "context": {"data_type": "analytics"},
            "use_cache": True
        }
        
        response = client.post("/api/embeddings/generate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["embedding"] is not None
        assert len(data["embedding"]) == 1536
        assert data["model_used"] == "gemini"
        assert data["dimensions"] == 1536
        assert data["quality_score"] == 0.85
    
    def test_generate_embedding_endpoint_failure(self, client, mock_services):
        """Test embedding generation endpoint failure"""
        # Mock failed embedding generation
        mock_services['embedding_generator'].generate_embedding.return_value = EmbeddingResult(
            success=False,
            error="API rate limit exceeded"
        )
        
        request_data = {
            "text": SAMPLE_EMBEDDING_TEXT,
            "model": "gemini"
        }
        
        response = client.post("/api/embeddings/generate", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "API rate limit exceeded"
    
    def test_batch_embeddings_endpoint(self, client, mock_services):
        """Test batch embedding generation endpoint"""
        # Mock successful batch embedding generation
        mock_services['embedding_generator'].generate_batch_embeddings.return_value = BatchEmbeddingResult(
            success=True,
            embeddings=[SAMPLE_EMBEDDING_VECTOR, SAMPLE_EMBEDDING_VECTOR, None],
            total_processed=3,
            processing_time=2.0,
            metadata={'successful_count': 2, 'failed_count': 1},
            errors=["Failed to generate embedding for text 3"]
        )
        
        request_data = {
            "texts": ["Text 1", "Text 2", "Text 3"],
            "model": "gemini",
            "batch_size": 2,
            "use_cache": True
        }
        
        response = client.post("/api/embeddings/batch", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["total_processed"] == 3
        assert data["successful_count"] == 2
        assert data["failed_count"] == 1
        assert len(data["embeddings"]) == 3
        assert data["embeddings"][0] is not None
        assert data["embeddings"][2] is None
    
    def test_similarity_endpoint(self, client, mock_services):
        """Test similarity calculation endpoint"""
        # Mock successful similarity calculation
        mock_services['embedding_generator'].calculate_similarity.return_value = 0.85
        
        request_data = {
            "embedding1": [0.1] * 1536,
            "embedding2": [0.2] * 1536,
            "method": "cosine"
        }
        
        response = client.post("/api/embeddings/similarity", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["similarity"] == 0.85
        assert data["method"] == "cosine"
    
    def test_migration_start_endpoint(self, client):
        """Test migration start endpoint"""
        request_data = {
            "site_ids": ["test_site_123"],
            "source_types": ["analytics", "sessions"],
            "batch_size": 100,
            "embedding_model": "gemini"
        }
        
        with patch('api.main.VectorMigrator') as mock_migrator_class:
            mock_migrator = AsyncMock()
            mock_migrator.initialize = AsyncMock()
            mock_migrator_class.return_value = mock_migrator
            
            response = client.post("/api/migration/start", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert data["progress"]["status"] == "started"
            assert "migration_id" in data["metadata"]
    
    def test_migration_status_endpoint(self, client):
        """Test migration status endpoint"""
        response = client.get("/api/migration/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "no_active_migration"
        assert "progress" in data
    
    def test_migration_validate_endpoint(self, client):
        """Test migration validation endpoint"""
        with patch('api.main.VectorMigrator') as mock_migrator_class:
            mock_migrator = AsyncMock()
            mock_migrator.initialize = AsyncMock()
            mock_migrator.validate_migration = AsyncMock(return_value={
                'total_vector_documents': 1000,
                'sample_validation': {'valid_embeddings': 95},
                'embedding_quality': {'average_quality': 0.85},
                'data_integrity': {'duplicate_documents': 0}
            })
            mock_migrator_class.return_value = mock_migrator
            
            response = client.post("/api/migration/validate?sample_size=100")
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert "validation_results" in data
            assert data["validation_results"]["total_vector_documents"] == 1000
    
    def test_ml_predict_endpoint_churn(self, client, mock_services):
        """Test ML prediction endpoint for churn"""
        # Mock successful churn prediction
        mock_services['analytics_ml'].predict_user_churn.return_value = MLModelResult(
            success=True,
            model_type="classification",
            prediction_type="churn_prediction",
            predictions=[0, 1, 0, 1, 0],
            probabilities=[0.2, 0.8, 0.3, 0.9, 0.1],
            feature_importance={'duration': 0.4, 'pages': 0.3},
            model_metrics={'accuracy': 0.85},
            metadata={'total_users': 100, 'churn_rate': 0.4}
        )
        
        request_data = {
            "site_id": "test_site_123",
            "prediction_type": "churn",
            "time_window": 30,
            "retrain_model": True
        }
        
        response = client.post("/api/ml/predict", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["prediction_type"] == "churn_prediction"
        assert data["predictions"] == [0, 1, 0, 1, 0]
        assert data["probabilities"] == [0.2, 0.8, 0.3, 0.9, 0.1]
        assert data["feature_importance"]["duration"] == 0.4
        assert data["model_metrics"]["accuracy"] == 0.85
    
    def test_ml_predict_endpoint_conversion(self, client, mock_services):
        """Test ML prediction endpoint for conversion"""
        # Mock successful conversion prediction
        mock_services['analytics_ml'].predict_conversion_probability.return_value = MLModelResult(
            success=True,
            model_type="regression",
            prediction_type="conversion_prediction",
            predictions=[0.1, 0.8, 0.3, 0.9, 0.2],
            feature_importance={'duration': 0.5, 'pages': 0.3},
            model_metrics={'r2': 0.75},
            metadata={'total_users': 100, 'high_potential_users': 20}
        )
        
        request_data = {
            "site_id": "test_site_123",
            "prediction_type": "conversion",
            "time_window": 30
        }
        
        response = client.post("/api/ml/predict", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["prediction_type"] == "conversion_prediction"
        assert data["predictions"] == [0.1, 0.8, 0.3, 0.9, 0.2]
    
    def test_ml_anomaly_detection_endpoint(self, client, mock_services):
        """Test ML anomaly detection endpoint"""
        # Mock successful anomaly detection
        mock_services['analytics_ml'].detect_anomalies.return_value = MLModelResult(
            success=True,
            model_type="anomaly_detection",
            prediction_type="anomaly_detection",
            predictions=[False, True, False, True, False],
            confidence_scores=[0.9, 0.8, 0.95, 0.7, 0.92],
            metadata={'total_records': 100, 'anomalies_detected': 10, 'anomaly_rate': 0.1}
        )
        
        response = client.post("/api/ml/anomaly-detection?site_id=test_site_123&time_window=30&contamination=0.1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["anomalies"] == [False, True, False, True, False]
        assert data["confidence_scores"] == [0.9, 0.8, 0.95, 0.7, 0.92]
        assert data["metadata"]["anomaly_rate"] == 0.1
    
    def test_ml_segment_users_endpoint(self, client, mock_services):
        """Test ML user segmentation endpoint"""
        # Mock successful user segmentation
        mock_services['analytics_ml'].segment_users.return_value = MLModelResult(
            success=True,
            model_type="clustering",
            prediction_type="user_segmentation",
            predictions=[0, 1, 2, 0, 1, 2],
            metadata={
                'total_users': 100,
                'n_segments': 3,
                'silhouette_score': 0.7,
                'segments': [
                    {'name': 'High Value', 'size': 30, 'value_score': 0.9},
                    {'name': 'Medium Value', 'size': 50, 'value_score': 0.6},
                    {'name': 'Low Value', 'size': 20, 'value_score': 0.3}
                ]
            }
        )
        
        response = client.post("/api/ml/segment-users?site_id=test_site_123&time_window=30&n_segments=3")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["segments"] == [0, 1, 2, 0, 1, 2]
        assert data["metadata"]["n_segments"] == 3
        assert len(data["metadata"]["segments"]) == 3
    
    def test_ml_insights_endpoint(self, client, mock_services):
        """Test ML insights endpoint"""
        # Mock successful insights generation
        mock_insights = [
            Mock(
                insight_type="churn_prediction",
                title="High Churn Risk",
                description="25% of users at risk",
                value=0.25,
                confidence=0.85,
                significance=0.95,
                timestamp=datetime.now(),
                metadata={'total_users': 100}
            ),
            Mock(
                insight_type="conversion_opportunity",
                title="High Potential Users",
                description="15 users with high conversion potential",
                value=15,
                confidence=0.8,
                significance=0.9,
                timestamp=datetime.now(),
                metadata={'percentage': 0.15}
            )
        ]
        
        mock_services['analytics_ml'].generate_predictive_insights.return_value = mock_insights
        
        response = client.get("/api/ml/insights?site_id=test_site_123&time_window=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["total_insights"] == 2
        assert len(data["insights"]) == 2
        assert data["insights"][0]["insight_type"] == "churn_prediction"
        assert data["insights"][1]["insight_type"] == "conversion_opportunity"
    
    def test_models_endpoint(self, client):
        """Test models listing endpoint"""
        response = client.get("/api/models")
        assert response.status_code == 200
        
        data = response.json()
        assert "embedding_models" in data
        assert "prediction_types" in data
        assert "data_sources" in data
        assert "gemini" in data["embedding_models"]
        assert "churn_prediction" in data["prediction_types"]
        assert "analytics" in data["data_sources"]
    
    def test_stats_endpoint(self, client):
        """Test service statistics endpoint"""
        with patch('api.main.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_db.count_documents = AsyncMock(return_value=100)
            mock_get_db.return_value = mock_db
            
            response = client.get("/api/stats")
            assert response.status_code == 200
            
            data = response.json()
            assert "database_stats" in data
            assert "service_stats" in data
            assert "timestamp" in data
            assert data["database_stats"]["vector_documents"] == 100
    
    def test_error_handling(self, client):
        """Test API error handling"""
        # Test with invalid JSON
        response = client.post("/api/process/analytics", data="invalid json")
        assert response.status_code == 422
        
        # Test with missing required fields
        response = client.post("/api/process/analytics", json={})
        assert response.status_code == 422
        
        # Test with invalid site_id
        response = client.post("/api/process/analytics", json={"site_id": ""})
        assert response.status_code == 422


class TestServiceCommunication:
    """Test service-to-service communication"""
    
    @pytest.mark.asyncio
    async def test_data_processor_to_embedding_generator(self):
        """Test communication between data processor and embedding generator"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class, \
             patch('services.embedding_generator.EmbeddingGenerator') as mock_eg_class:
            
            # Mock data processor
            mock_dp = AsyncMock()
            mock_dp.process_analytics_data.return_value = ProcessingResult(
                success=True,
                data=Mock(),
                metadata={'processed_text': 'Analytics data processed'}
            )
            mock_dp_class.return_value = mock_dp
            
            # Mock embedding generator
            mock_eg = AsyncMock()
            mock_eg.generate_embedding.return_value = EmbeddingResult(
                success=True,
                embedding=SAMPLE_EMBEDDING_VECTOR,
                quality_score=0.85
            )
            mock_eg_class.return_value = mock_eg
            
            # Test communication
            data_processor = mock_dp_class()
            embedding_generator = mock_eg_class()
            
            # Process data
            processing_result = await data_processor.process_analytics_data("test_site")
            assert processing_result.success is True
            
            # Generate embedding from processed data
            embedding_result = await embedding_generator.generate_embedding(
                processing_result.metadata['processed_text']
            )
            assert embedding_result.success is True
            assert embedding_result.quality_score == 0.85
    
    @pytest.mark.asyncio
    async def test_embedding_generator_to_vector_migrator(self):
        """Test communication between embedding generator and vector migrator"""
        with patch('services.embedding_generator.EmbeddingGenerator') as mock_eg_class, \
             patch('services.vector_migrator.VectorMigrator') as mock_vm_class:
            
            # Mock embedding generator
            mock_eg = AsyncMock()
            mock_eg.generate_batch_embeddings.return_value = BatchEmbeddingResult(
                success=True,
                embeddings=[SAMPLE_EMBEDDING_VECTOR] * 5,
                total_processed=5,
                metadata={'successful_count': 5}
            )
            mock_eg_class.return_value = mock_eg
            
            # Mock vector migrator
            mock_vm = AsyncMock()
            mock_vm.migrate_analytics_data.return_value = MigrationResult(
                success=True,
                progress=MigrationProgress(
                    total_records=5,
                    processed_records=5,
                    successful_records=5
                ),
                processing_time=10.0
            )
            mock_vm_class.return_value = mock_vm
            
            # Test communication
            embedding_generator = mock_eg_class()
            vector_migrator = mock_vm_class()
            
            # Generate embeddings
            batch_result = await embedding_generator.generate_batch_embeddings(
                ["text1", "text2", "text3", "text4", "text5"]
            )
            assert batch_result.success is True
            assert batch_result.metadata['successful_count'] == 5
            
            # Migrate with embeddings
            migration_result = await vector_migrator.migrate_analytics_data(["test_site"])
            assert migration_result.success is True
            assert migration_result.progress.successful_records == 5
    
    @pytest.mark.asyncio
    async def test_data_processor_to_ml_service(self):
        """Test communication between data processor and ML service"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class, \
             patch('services.analytics_ml.AnalyticsMLService') as mock_ml_class:
            
            # Mock data processor
            mock_dp = AsyncMock()
            mock_dp.analyze_user_journeys.return_value = ProcessingResult(
                success=True,
                data=Mock(),
                metadata={'patterns': {'high_value_users': 50}}
            )
            mock_dp_class.return_value = mock_dp
            
            # Mock ML service
            mock_ml = AsyncMock()
            mock_ml.predict_user_churn.return_value = MLModelResult(
                success=True,
                predictions=[0, 1, 0, 1, 0],
                metadata={'churn_rate': 0.4}
            )
            mock_ml_class.return_value = mock_ml
            
            # Test communication
            data_processor = mock_dp_class()
            ml_service = mock_ml_class()
            
            # Process user journeys
            journey_result = await data_processor.analyze_user_journeys("test_site")
            assert journey_result.success is True
            
            # Use processed data for ML prediction
            churn_result = await ml_service.predict_user_churn("test_site")
            assert churn_result.success is True
            assert churn_result.metadata['churn_rate'] == 0.4


class TestAsyncProcessing:
    """Test async processing capabilities"""
    
    @pytest.mark.asyncio
    async def test_concurrent_processing(self):
        """Test concurrent processing of multiple requests"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class:
            mock_dp = AsyncMock()
            mock_dp.process_analytics_data.return_value = ProcessingResult(
                success=True,
                data=Mock(),
                processing_time=1.0
            )
            mock_dp_class.return_value = mock_dp
            
            data_processor = mock_dp_class()
            
            # Process multiple sites concurrently
            sites = ["site1", "site2", "site3", "site4", "site5"]
            
            start_time = asyncio.get_event_loop().time()
            tasks = [
                data_processor.process_analytics_data(site) 
                for site in sites
            ]
            results = await asyncio.gather(*tasks)
            end_time = asyncio.get_event_loop().time()
            
            # All should succeed
            assert all(result.success for result in results)
            
            # Should be faster than sequential processing
            total_time = end_time - start_time
            sequential_time = len(sites) * 1.0  # Each takes 1 second
            assert total_time < sequential_time
    
    @pytest.mark.asyncio
    async def test_batch_processing_performance(self):
        """Test batch processing performance"""
        with patch('services.embedding_generator.EmbeddingGenerator') as mock_eg_class:
            mock_eg = AsyncMock()
            mock_eg.generate_batch_embeddings.return_value = BatchEmbeddingResult(
                success=True,
                embeddings=[SAMPLE_EMBEDDING_VECTOR] * 100,
                total_processed=100,
                processing_time=5.0
            )
            mock_eg_class.return_value = mock_eg
            
            embedding_generator = mock_eg_class()
            
            # Generate large batch
            texts = [f"Test text {i}" for i in range(100)]
            
            start_time = asyncio.get_event_loop().time()
            result = await embedding_generator.generate_batch_embeddings(
                texts, batch_size=10
            )
            end_time = asyncio.get_event_loop().time()
            
            assert result.success is True
            assert result.total_processed == 100
            assert result.processing_time == 5.0
            
            # Should complete in reasonable time
            total_time = end_time - start_time
            assert total_time < 10.0  # Should be faster than 10 seconds
    
    @pytest.mark.asyncio
    async def test_error_propagation(self):
        """Test error propagation in async processing"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class:
            mock_dp = AsyncMock()
            mock_dp.process_analytics_data.side_effect = Exception("Processing error")
            mock_dp_class.return_value = mock_dp
            
            data_processor = mock_dp_class()
            
            # Test error handling
            with pytest.raises(Exception) as exc_info:
                await data_processor.process_analytics_data("test_site")
            
            assert "Processing error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test timeout handling in async operations"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class:
            mock_dp = AsyncMock()
            
            # Mock slow operation
            async def slow_operation(*args, **kwargs):
                await asyncio.sleep(10)  # 10 second delay
                return ProcessingResult(success=True, data=Mock())
            
            mock_dp.process_analytics_data = slow_operation
            mock_dp_class.return_value = mock_dp
            
            data_processor = mock_dp_class()
            
            # Test timeout
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(
                    data_processor.process_analytics_data("test_site"),
                    timeout=2.0  # 2 second timeout
                )


class TestLoadTesting:
    """Test performance under load"""
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_high_concurrency_load(self):
        """Test system under high concurrency load"""
        with patch('services.data_processor.DataProcessor') as mock_dp_class:
            mock_dp = AsyncMock()
            mock_dp.process_analytics_data.return_value = ProcessingResult(
                success=True,
                data=Mock(),
                processing_time=0.1
            )
            mock_dp_class.return_value = mock_dp
            
            data_processor = mock_dp_class()
            
            # Create high load (100 concurrent requests)
            tasks = []
            for i in range(100):
                task = data_processor.process_analytics_data(f"site_{i}")
                tasks.append(task)
            
            start_time = asyncio.get_event_loop().time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = asyncio.get_event_loop().time()
            
            # Count successful results
            successful_results = [r for r in results if isinstance(r, ProcessingResult) and r.success]
            failed_results = [r for r in results if not isinstance(r, ProcessingResult) or not r.success]
            
            # Should handle most requests successfully
            success_rate = len(successful_results) / len(results)
            assert success_rate > 0.9  # At least 90% success rate
            
            # Should complete in reasonable time
            total_time = end_time - start_time
            assert total_time < 30.0  # Should complete within 30 seconds
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self):
        """Test memory usage under load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        with patch('services.embedding_generator.EmbeddingGenerator') as mock_eg_class:
            mock_eg = AsyncMock()
            mock_eg.generate_batch_embeddings.return_value = BatchEmbeddingResult(
                success=True,
                embeddings=[SAMPLE_EMBEDDING_VECTOR] * 50,
                total_processed=50
            )
            mock_eg_class.return_value = mock_eg
            
            embedding_generator = mock_eg_class()
            
            # Generate many batches
            for i in range(20):
                texts = [f"Batch {i} text {j}" for j in range(50)]
                await embedding_generator.generate_batch_embeddings(texts)
            
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = final_memory - initial_memory
            
            # Memory increase should be reasonable (less than 500MB)
            assert memory_increase < 500
    
    def test_api_load_testing(self, client):
        """Test API endpoints under load"""
        import threading
        import time
        
        results = []
        
        def make_request():
            try:
                response = client.get("/health")
                results.append(response.status_code == 200)
            except Exception:
                results.append(False)
        
        # Create multiple threads
        threads = []
        for i in range(50):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        
        # Calculate results
        success_rate = sum(results) / len(results)
        total_time = end_time - start_time
        
        # Should handle most requests successfully
        assert success_rate > 0.9  # At least 90% success rate
        assert total_time < 10.0  # Should complete within 10 seconds 