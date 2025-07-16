"""
Pytest configuration and fixtures for Cryptique Python tests
"""

import pytest
import asyncio
import pandas as pd
import numpy as np
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from typing import Dict, List, Any

from . import (
    TEST_CONFIG, 
    SAMPLE_ANALYTICS_DATA, 
    SAMPLE_SESSION_DATA, 
    SAMPLE_TRANSACTION_DATA,
    SAMPLE_EMBEDDING_TEXT,
    SAMPLE_EMBEDDING_VECTOR
)

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_config():
    """Test configuration fixture"""
    return TEST_CONFIG.copy()

@pytest.fixture
def sample_analytics_data():
    """Sample analytics data fixture"""
    return SAMPLE_ANALYTICS_DATA.copy()

@pytest.fixture
def sample_session_data():
    """Sample session data fixture"""
    return SAMPLE_SESSION_DATA.copy()

@pytest.fixture
def sample_transaction_data():
    """Sample transaction data fixture"""
    return SAMPLE_TRANSACTION_DATA.copy()

@pytest.fixture
def sample_embedding_text():
    """Sample embedding text fixture"""
    return SAMPLE_EMBEDDING_TEXT

@pytest.fixture
def sample_embedding_vector():
    """Sample embedding vector fixture"""
    return SAMPLE_EMBEDDING_VECTOR.copy()

@pytest.fixture
def mock_database():
    """Mock database fixture"""
    db_mock = AsyncMock()
    db_mock.is_connected = True
    db_mock.find_documents = AsyncMock(return_value=[])
    db_mock.find_one_document = AsyncMock(return_value=None)
    db_mock.insert_document = AsyncMock(return_value="test_id")
    db_mock.insert_documents = AsyncMock(return_value=["test_id_1", "test_id_2"])
    db_mock.update_document = AsyncMock(return_value=1)
    db_mock.delete_document = AsyncMock(return_value=1)
    db_mock.count_documents = AsyncMock(return_value=100)
    db_mock.aggregate = AsyncMock(return_value=[])
    db_mock.vector_search = AsyncMock(return_value=[])
    return db_mock

@pytest.fixture
def mock_gemini_embedding():
    """Mock Gemini embedding response"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        mock_instance = Mock()
        mock_instance.embed_content.return_value = {
            'embedding': SAMPLE_EMBEDDING_VECTOR
        }
        mock_model.return_value = mock_instance
        yield mock_instance

@pytest.fixture
def mock_openai_embedding():
    """Mock OpenAI embedding response"""
    with patch('openai.Embedding.create') as mock_create:
        mock_create.return_value = {
            'data': [{'embedding': SAMPLE_EMBEDDING_VECTOR}]
        }
        yield mock_create

@pytest.fixture
def sample_dataframe():
    """Sample pandas DataFrame for testing"""
    data = {
        'userId': ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'],
        'sessionId': ['session_1', 'session_2', 'session_3', 'session_4', 'session_5'],
        'siteId': ['site_1'] * 5,
        'duration': [300, 450, 120, 600, 180],
        'pagesViewed': [5, 8, 2, 12, 3],
        'isBounce': [False, False, True, False, True],
        'isWeb3User': [True, False, False, True, False],
        'createdAt': [datetime.now() - timedelta(days=i) for i in range(5)]
    }
    return pd.DataFrame(data)

@pytest.fixture
def sample_time_series_data():
    """Sample time series data for testing"""
    dates = pd.date_range('2024-01-01', periods=30, freq='D')
    values = np.random.normal(100, 15, 30) + np.sin(np.arange(30) * 2 * np.pi / 7) * 10
    return pd.DataFrame({
        'timestamp': dates,
        'value': values,
        'metric': ['page_views'] * 30
    })

@pytest.fixture
def sample_user_journey_data():
    """Sample user journey data for testing"""
    return pd.DataFrame({
        'userId': ['user_1', 'user_1', 'user_2', 'user_2', 'user_3'],
        'sessionId': ['session_1', 'session_2', 'session_3', 'session_4', 'session_5'],
        'duration': [300, 450, 120, 600, 180],
        'pagesViewed': [5, 8, 2, 12, 3],
        'isBounce': [False, False, True, False, True],
        'isWeb3User': [True, True, False, False, False],
        'startTime': [datetime.now() - timedelta(hours=i) for i in range(5)]
    })

@pytest.fixture
def sample_campaign_data():
    """Sample campaign data for testing"""
    return pd.DataFrame({
        'userId': ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'],
        'campaign': ['google_ads', 'facebook', 'twitter', 'google_ads', 'organic'],
        'source': ['google', 'facebook', 'twitter', 'google', 'direct'],
        'medium': ['cpc', 'social', 'social', 'cpc', 'organic'],
        'converted': [True, False, True, False, True],
        'duration': [300, 450, 120, 600, 180],
        'createdAt': [datetime.now() - timedelta(days=i) for i in range(5)]
    })

@pytest.fixture
def sample_web3_data():
    """Sample Web3 transaction data for testing"""
    return pd.DataFrame({
        'tx_hash': [f'0x{i:064x}' for i in range(5)],
        'from_address': [f'0x{i:040x}' for i in range(5)],
        'to_address': [f'0x{i+100:040x}' for i in range(5)],
        'value_eth': [1.5, 2.0, 0.5, 3.0, 1.0],
        'gas_used': [21000, 45000, 30000, 60000, 25000],
        'block_number': [18500000 + i for i in range(5)],
        'block_time': [datetime.now() - timedelta(hours=i) for i in range(5)],
        'status': ['success'] * 5,
        'contract_address': [f'0x{i+200:040x}' for i in range(5)]
    })

@pytest.fixture
def mock_ml_model():
    """Mock ML model fixture"""
    model_mock = Mock()
    model_mock.fit = Mock()
    model_mock.predict = Mock(return_value=np.array([0, 1, 0, 1, 0]))
    model_mock.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7], [0.9, 0.1], [0.4, 0.6], [0.7, 0.3]]))
    model_mock.feature_importances_ = np.array([0.3, 0.2, 0.25, 0.15, 0.1])
    model_mock.score = Mock(return_value=0.85)
    return model_mock

@pytest.fixture
def mock_embedding_generator():
    """Mock embedding generator fixture"""
    generator_mock = AsyncMock()
    generator_mock.db = Mock()
    generator_mock.generate_embedding = AsyncMock()
    generator_mock.generate_batch_embeddings = AsyncMock()
    generator_mock.calculate_similarity = AsyncMock(return_value=0.85)
    generator_mock.find_similar_embeddings = AsyncMock(return_value=[(0, 0.95), (1, 0.87)])
    return generator_mock

@pytest.fixture
def mock_data_processor():
    """Mock data processor fixture"""
    processor_mock = AsyncMock()
    processor_mock.db = Mock()
    processor_mock.process_analytics_data = AsyncMock()
    processor_mock.analyze_user_journeys = AsyncMock()
    processor_mock.perform_time_series_analysis = AsyncMock()
    processor_mock.analyze_campaign_attribution = AsyncMock()
    processor_mock.analyze_web3_patterns = AsyncMock()
    return processor_mock

@pytest.fixture
def mock_vector_migrator():
    """Mock vector migrator fixture"""
    migrator_mock = AsyncMock()
    migrator_mock.db = Mock()
    migrator_mock.migrate_all_data = AsyncMock()
    migrator_mock.migrate_analytics_data = AsyncMock()
    migrator_mock.migrate_session_data = AsyncMock()
    migrator_mock.migrate_transaction_data = AsyncMock()
    migrator_mock.validate_migration = AsyncMock()
    return migrator_mock

@pytest.fixture
def mock_analytics_ml():
    """Mock analytics ML service fixture"""
    ml_mock = AsyncMock()
    ml_mock.db = Mock()
    ml_mock.predict_user_churn = AsyncMock()
    ml_mock.predict_conversion_probability = AsyncMock()
    ml_mock.detect_anomalies = AsyncMock()
    ml_mock.segment_users = AsyncMock()
    ml_mock.generate_predictive_insights = AsyncMock()
    return ml_mock

@pytest.fixture
def mock_fastapi_client():
    """Mock FastAPI test client"""
    from fastapi.testclient import TestClient
    from api.main import app
    return TestClient(app)

# Helper functions for tests
def create_mock_embedding_result(success=True, embedding=None, error=None):
    """Create mock embedding result"""
    from services.embedding_generator import EmbeddingResult
    return EmbeddingResult(
        success=success,
        embedding=np.array(embedding) if embedding else np.array(SAMPLE_EMBEDDING_VECTOR),
        model_used="gemini",
        dimensions=1536,
        quality_score=0.85,
        processing_time=0.5,
        metadata={'test': True},
        error=error
    )

def create_mock_processing_result(success=True, data=None, error=None):
    """Create mock processing result"""
    from services.data_processor import ProcessingResult
    return ProcessingResult(
        success=success,
        data=data,
        metadata={'test': True},
        quality_score=0.9,
        errors=[error] if error else None,
        processing_time=1.0
    )

def create_mock_ml_result(success=True, predictions=None, error=None):
    """Create mock ML result"""
    from services.analytics_ml import MLModelResult
    return MLModelResult(
        success=success,
        model_type="classification",
        prediction_type="churn_prediction",
        predictions=np.array(predictions) if predictions else np.array([0, 1, 0, 1, 0]),
        probabilities=np.array([0.2, 0.7, 0.1, 0.6, 0.3]),
        feature_importance={'feature1': 0.3, 'feature2': 0.2},
        model_metrics={'accuracy': 0.85},
        metadata={'test': True},
        error=error
    )

def create_mock_migration_result(success=True, error=None):
    """Create mock migration result"""
    from services.vector_migrator import MigrationResult, MigrationProgress
    progress = MigrationProgress(
        total_records=100,
        processed_records=100,
        successful_records=95,
        failed_records=5,
        current_source="analytics"
    )
    return MigrationResult(
        success=success,
        progress=progress,
        processing_time=10.0,
        metadata={'test': True}
    )

# Test markers
pytest.mark.unit = pytest.mark.filterwarnings("ignore::DeprecationWarning")
pytest.mark.integration = pytest.mark.filterwarnings("ignore::DeprecationWarning")
pytest.mark.slow = pytest.mark.filterwarnings("ignore::DeprecationWarning") 