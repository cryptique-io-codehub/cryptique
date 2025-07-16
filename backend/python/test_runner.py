#!/usr/bin/env python3
"""
Simple test runner to validate core functionality of Cryptique Python services
"""

import asyncio
import sys
import traceback
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
import numpy as np

# Test imports
def test_imports():
    """Test that all core modules can be imported"""
    print("🔍 Testing imports...")
    
    try:
        # Test configuration
        from config import config
        print("✅ Config imported successfully")
        
        # Test utilities
        from utils.logger import setup_logger, get_logger
        from utils.database import DatabaseManager
        from utils.validators import DataValidator
        from utils.metrics import MetricsCollector
        print("✅ Utilities imported successfully")
        
        # Test services
        from services.data_processor import DataProcessor
        from services.embedding_generator import EmbeddingGenerator, EmbeddingModel
        from services.vector_migrator import VectorMigrator, MigrationConfig
        from services.analytics_ml import AnalyticsMLService
        print("✅ Services imported successfully")
        
        # Test API
        from api.main import app
        print("✅ API imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        traceback.print_exc()
        return False

def test_configuration():
    """Test configuration loading"""
    print("\n🔧 Testing configuration...")
    
    try:
        from config import config
        
        # Test database config
        db_config = config.get_mongodb_config()
        assert 'host' in db_config
        print("✅ Database configuration loaded")
        
        # Test embedding config
        embedding_config = config.get_embedding_config()
        assert 'gemini_api_key' in embedding_config
        print("✅ Embedding configuration loaded")
        
        # Test processing config
        processing_config = config.get_processing_config()
        assert 'batch_size' in processing_config
        print("✅ Processing configuration loaded")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        traceback.print_exc()
        return False

def test_utilities():
    """Test utility functions"""
    print("\n🛠️ Testing utilities...")
    
    try:
        # Test logger
        from utils.logger import setup_logger, get_logger
        setup_logger(log_level="INFO", service_name="test-service")
        logger = get_logger("test")
        logger.info("Test log message")
        print("✅ Logger working")
        
        # Test validator
        from utils.validators import DataValidator
        validator = DataValidator()
        test_doc = {'siteId': 'test_site', 'totalVisitors': 100}
        result = validator.validate_document(test_doc, 'analytics')
        assert 'valid' in result
        print("✅ Validator working")
        
        # Test metrics collector
        from utils.metrics import MetricsCollector
        metrics = MetricsCollector()
        metrics.increment_counter('test_counter')
        metrics.set_gauge('test_gauge', 42.0)
        print("✅ Metrics collector working")
        
        return True
        
    except Exception as e:
        print(f"❌ Utilities test failed: {e}")
        traceback.print_exc()
        return False

async def test_data_processor():
    """Test data processor functionality"""
    print("\n📊 Testing data processor...")
    
    try:
        from services.data_processor import DataProcessor, ProcessingResult
        
        # Create mock processor
        processor = DataProcessor()
        
        # Mock database
        mock_db = AsyncMock()
        mock_db.is_connected = True
        mock_db.find_documents = AsyncMock(return_value=[{
            'siteId': 'test_site',
            'totalVisitors': 1000,
            'uniqueVisitors': 800,
            'web3Visitors': 200
        }])
        processor.db = mock_db
        
        # Test data cleaning
        import pandas as pd
        test_data = pd.DataFrame({
            'col1': [1, 2, np.nan, 4, 5],
            'col2': [10, 20, 30, 40, 50]
        })
        
        cleaned_data = await processor._clean_and_validate_data(test_data)
        assert len(cleaned_data) == 5
        assert cleaned_data['col1'].isnull().sum() == 0
        print("✅ Data cleaning working")
        
        # Test quality score calculation
        quality_score = await processor._calculate_quality_score(cleaned_data)
        assert 0 <= quality_score <= 1
        print("✅ Quality scoring working")
        
        return True
        
    except Exception as e:
        print(f"❌ Data processor test failed: {e}")
        traceback.print_exc()
        return False

async def test_embedding_generator():
    """Test embedding generator functionality"""
    print("\n🤖 Testing embedding generator...")
    
    try:
        from services.embedding_generator import EmbeddingGenerator, EmbeddingModel, EmbeddingResult
        
        # Create mock generator
        generator = EmbeddingGenerator()
        
        # Mock database
        mock_db = AsyncMock()
        mock_db.is_connected = True
        generator.db = mock_db
        
        # Test embedding validation
        test_embedding = np.random.normal(0, 1, 1536)
        validation_result = await generator.quality_validator.validate_embedding(
            test_embedding, "test text", EmbeddingModel.GEMINI
        )
        assert validation_result > 0
        print("✅ Embedding validation working")
        
        # Test similarity calculation
        embedding1 = np.array([1.0, 0.0, 0.0])
        embedding2 = np.array([0.0, 1.0, 0.0])
        similarity = await generator.calculate_similarity(embedding1, embedding2)
        assert 0 <= similarity <= 1
        print("✅ Similarity calculation working")
        
        # Test embedding optimization
        embeddings = [np.random.normal(0, 1, 100) for _ in range(5)]
        optimized = await generator.optimize_embeddings(embeddings, "normalize")
        assert len(optimized) == 5
        print("✅ Embedding optimization working")
        
        return True
        
    except Exception as e:
        print(f"❌ Embedding generator test failed: {e}")
        traceback.print_exc()
        return False

async def test_vector_migrator():
    """Test vector migrator functionality"""
    print("\n🔄 Testing vector migrator...")
    
    try:
        from services.vector_migrator import VectorMigrator, MigrationConfig, DataSource
        
        # Create mock migrator
        config = MigrationConfig(
            source_types=[DataSource.ANALYTICS],
            batch_size=10
        )
        migrator = VectorMigrator(config)
        
        # Mock database
        mock_db = AsyncMock()
        mock_db.is_connected = True
        mock_db.find_documents = AsyncMock(return_value=[])
        migrator.db = mock_db
        
        # Test content extraction
        sample_analytics = {
            'siteId': 'test_site',
            'totalVisitors': 1000,
            'uniqueVisitors': 800,
            'web3Visitors': 200
        }
        
        content = await migrator._extract_analytics_content(sample_analytics)
        assert 'Site ID: test_site' in content
        assert 'Total Visitors: 1000' in content
        print("✅ Content extraction working")
        
        # Test progress tracking
        assert migrator.progress.percentage_complete == 0.0
        migrator.progress.total_records = 100
        migrator.progress.processed_records = 50
        assert migrator.progress.percentage_complete == 50.0
        print("✅ Progress tracking working")
        
        return True
        
    except Exception as e:
        print(f"❌ Vector migrator test failed: {e}")
        traceback.print_exc()
        return False

async def test_analytics_ml():
    """Test analytics ML functionality"""
    print("\n🧠 Testing analytics ML...")
    
    try:
        from services.analytics_ml import AnalyticsMLService, MLModelResult
        
        # Create mock ML service
        ml_service = AnalyticsMLService()
        
        # Mock database
        mock_db = AsyncMock()
        mock_db.is_connected = True
        mock_db.find_documents = AsyncMock(return_value=[])
        ml_service.db = mock_db
        
        # Test clustering
        import pandas as pd
        test_features = pd.DataFrame({
            'feature1': np.random.normal(0, 1, 20),
            'feature2': np.random.normal(0, 1, 20),
            'feature3': np.random.normal(0, 1, 20)
        })
        
        optimal_k = await ml_service._find_optimal_clusters(test_features.values, max_k=5)
        assert 2 <= optimal_k <= 5
        print("✅ Clustering working")
        
        # Test statistical calculations
        test_series = pd.Series([10, 12, 11, 9, 13, 8, 14, 12, 11, 10])
        stats = await ml_service._calculate_time_series_stats(test_series)
        assert 'mean' in stats
        assert 'std' in stats
        print("✅ Statistical calculations working")
        
        return True
        
    except Exception as e:
        print(f"❌ Analytics ML test failed: {e}")
        traceback.print_exc()
        return False

def test_api_structure():
    """Test API structure"""
    print("\n🚀 Testing API structure...")
    
    try:
        from fastapi.testclient import TestClient
        from api.main import app
        
        client = TestClient(app)
        
        # Test root endpoint
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Cryptique Python Data Processing API"
        print("✅ Root endpoint working")
        
        # Test models endpoint
        response = client.get("/api/models")
        assert response.status_code == 200
        data = response.json()
        assert "embedding_models" in data
        assert "prediction_types" in data
        print("✅ Models endpoint working")
        
        return True
        
    except Exception as e:
        print(f"❌ API structure test failed: {e}")
        traceback.print_exc()
        return False

async def run_all_tests():
    """Run all tests"""
    print("🧪 Starting Cryptique Python Services Test Suite")
    print("=" * 60)
    
    test_results = []
    
    # Run synchronous tests
    sync_tests = [
        ("Imports", test_imports),
        ("Configuration", test_configuration),
        ("Utilities", test_utilities),
        ("API Structure", test_api_structure)
    ]
    
    for test_name, test_func in sync_tests:
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            test_results.append((test_name, False))
    
    # Run async tests
    async_tests = [
        ("Data Processor", test_data_processor),
        ("Embedding Generator", test_embedding_generator),
        ("Vector Migrator", test_vector_migrator),
        ("Analytics ML", test_analytics_ml)
    ]
    
    for test_name, test_func in async_tests:
        try:
            result = await test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            test_results.append((test_name, False))
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<20} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("-" * 60)
    print(f"Total Tests: {len(test_results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(test_results)*100):.1f}%")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Python services are functional.")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    # Run the test suite
    success = asyncio.run(run_all_tests())
    
    # Exit with appropriate code
    sys.exit(0 if success else 1) 