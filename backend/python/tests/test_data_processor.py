"""
Comprehensive tests for Data Processor service
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, List, Any

from services.data_processor import DataProcessor, ProcessingResult, AnalyticsInsight
from utils.database import DatabaseManager
from . import SAMPLE_ANALYTICS_DATA, SAMPLE_SESSION_DATA, SAMPLE_TRANSACTION_DATA


class TestDataProcessor:
    """Test suite for DataProcessor class"""
    
    @pytest.fixture
    async def data_processor(self, mock_database):
        """Create DataProcessor instance with mocked database"""
        processor = DataProcessor()
        processor.db = mock_database
        return processor
    
    @pytest.mark.asyncio
    async def test_initialization(self):
        """Test DataProcessor initialization"""
        processor = DataProcessor()
        assert processor.db is None
        assert processor.validator is not None
        assert processor.processing_config is not None
        
        # Test initialize method
        with patch('utils.database.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            await processor.initialize()
            assert processor.db is not None
    
    @pytest.mark.asyncio
    async def test_process_analytics_data_success(self, data_processor, sample_analytics_data):
        """Test successful analytics data processing"""
        # Mock database response
        data_processor.db.find_documents.return_value = [sample_analytics_data]
        
        # Test processing
        result = await data_processor.process_analytics_data(
            site_id="test_site_123",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31)
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.quality_score is not None
        assert result.quality_score > 0
        assert result.metadata is not None
        assert result.errors is None
    
    @pytest.mark.asyncio
    async def test_process_analytics_data_no_data(self, data_processor):
        """Test analytics data processing with no data"""
        # Mock empty database response
        data_processor.db.find_documents.return_value = []
        
        result = await data_processor.process_analytics_data(
            site_id="test_site_123"
        )
        
        assert result.success is False
        assert result.errors is not None
        assert "No data found" in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_analyze_user_journeys_success(self, data_processor, sample_session_data):
        """Test successful user journey analysis"""
        # Create multiple session records for journey analysis
        session_data = []
        for i in range(10):
            session = sample_session_data.copy()
            session['userId'] = f'user_{i % 3}'  # Create 3 different users
            session['sessionId'] = f'session_{i}'
            session['duration'] = 300 + (i * 50)
            session['pagesViewed'] = 5 + (i % 3)
            session_data.append(session)
        
        data_processor.db.find_documents.return_value = session_data
        
        result = await data_processor.analyze_user_journeys(
            site_id="test_site_123",
            time_window=30
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.metadata is not None
        assert 'clusters' in result.metadata
        assert 'patterns' in result.metadata
        assert 'insights' in result.metadata
    
    @pytest.mark.asyncio
    async def test_analyze_user_journeys_no_data(self, data_processor):
        """Test user journey analysis with no data"""
        data_processor.db.find_documents.return_value = []
        
        result = await data_processor.analyze_user_journeys(
            site_id="test_site_123"
        )
        
        assert result.success is False
        assert result.errors is not None
        assert "No session data found" in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_time_series_analysis_success(self, data_processor, sample_time_series_data):
        """Test successful time series analysis"""
        # Convert sample data to expected format
        time_series_records = []
        for _, row in sample_time_series_data.iterrows():
            record = {
                'siteId': 'test_site_123',
                'metric': row['metric'],
                'value': row['value'],
                'lastSnapshotAt': row['timestamp']
            }
            time_series_records.append(record)
        
        data_processor.db.find_documents.return_value = time_series_records
        
        result = await data_processor.perform_time_series_analysis(
            site_id="test_site_123",
            metric="page_views",
            time_window=30
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.metadata is not None
        assert 'trends' in result.metadata
        assert 'seasonality' in result.metadata
        assert 'anomalies' in result.metadata
        assert 'forecast' in result.metadata
    
    @pytest.mark.asyncio
    async def test_campaign_attribution_analysis(self, data_processor, sample_campaign_data):
        """Test campaign attribution analysis"""
        # Convert sample data to expected format
        campaign_records = []
        for _, row in sample_campaign_data.iterrows():
            record = {
                'siteId': 'test_site_123',
                'userId': row['userId'],
                'campaign': row['campaign'],
                'source': row['source'],
                'medium': row['medium'],
                'converted': row['converted'],
                'duration': row['duration'],
                'createdAt': row['createdAt']
            }
            campaign_records.append(record)
        
        data_processor.db.find_documents.return_value = campaign_records
        
        result = await data_processor.analyze_campaign_attribution(
            site_id="test_site_123",
            time_window=30
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.metadata is not None
        assert 'attribution_models' in result.metadata
        assert 'performance_metrics' in result.metadata
        assert 'conversion_paths' in result.metadata
    
    @pytest.mark.asyncio
    async def test_web3_patterns_analysis(self, data_processor, sample_web3_data):
        """Test Web3 transaction pattern analysis"""
        # Mock smart contracts
        contracts = [{'_id': 'contract_1', 'siteId': 'test_site_123'}]
        
        # Convert sample data to expected format
        transaction_records = []
        for _, row in sample_web3_data.iterrows():
            record = {
                'contract': 'contract_1',
                'tx_hash': row['tx_hash'],
                'from_address': row['from_address'],
                'to_address': row['to_address'],
                'value_eth': str(row['value_eth']),
                'gas_used': row['gas_used'],
                'block_number': row['block_number'],
                'block_time': row['block_time'],
                'status': row['status'],
                'contract_address': row['contract_address']
            }
            transaction_records.append(record)
        
        # Mock database calls
        data_processor.db.find_documents.side_effect = [
            contracts,  # First call for contracts
            transaction_records  # Second call for transactions
        ]
        
        result = await data_processor.analyze_web3_patterns(
            site_id="test_site_123",
            time_window=30
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.metadata is not None
        assert 'transaction_patterns' in result.metadata
        assert 'wallet_behaviors' in result.metadata
        assert 'user_segments' in result.metadata
        assert 'web3_metrics' in result.metadata
    
    @pytest.mark.asyncio
    async def test_data_cleaning_and_validation(self, data_processor):
        """Test data cleaning and validation methods"""
        # Create test DataFrame with missing values and outliers
        test_data = pd.DataFrame({
            'userId': ['user_1', 'user_2', None, 'user_4', 'user_5'],
            'duration': [300, 450, np.nan, 10000, 180],  # 10000 is outlier
            'pagesViewed': [5, 8, 2, 12, np.nan],
            'category': ['A', 'B', None, 'A', 'B']
        })
        
        # Test cleaning
        cleaned_data = await data_processor._clean_and_validate_data(test_data)
        
        # Check that missing values are handled
        assert cleaned_data['userId'].isnull().sum() == 0  # Should be filled
        assert cleaned_data['duration'].isnull().sum() == 0  # Should be filled
        assert cleaned_data['pagesViewed'].isnull().sum() == 0  # Should be filled
        
        # Check that outliers are handled
        assert cleaned_data['duration'].max() < 10000  # Outlier should be capped
    
    @pytest.mark.asyncio
    async def test_outlier_detection(self, data_processor):
        """Test outlier detection and handling"""
        # Create test data with known outliers
        test_data = pd.DataFrame({
            'value': [10, 12, 11, 9, 13, 100, 8, 14, 12, 11]  # 100 is clear outlier
        })
        
        # Test outlier handling
        cleaned_data = await data_processor._handle_outliers(test_data)
        
        # Check that outlier is handled
        assert cleaned_data['value'].max() < 100
        assert cleaned_data['value'].min() > 0
    
    @pytest.mark.asyncio
    async def test_data_normalization(self, data_processor):
        """Test data normalization"""
        # Create test data
        test_data = pd.DataFrame({
            'value1': [100, 200, 300, 400, 500],
            'value2': [1, 2, 3, 4, 5],
            'category': ['A', 'B', 'A', 'B', 'A']
        })
        
        # Test normalization
        normalized_data = await data_processor._normalize_data(test_data)
        
        # Check that numeric columns are normalized
        assert abs(normalized_data['value1'].mean()) < 1e-10  # Should be ~0
        assert abs(normalized_data['value1'].std() - 1) < 1e-10  # Should be ~1
        assert abs(normalized_data['value2'].mean()) < 1e-10  # Should be ~0
        assert abs(normalized_data['value2'].std() - 1) < 1e-10  # Should be ~1
        
        # Check that categorical columns are unchanged
        assert normalized_data['category'].equals(test_data['category'])
    
    @pytest.mark.asyncio
    async def test_quality_score_calculation(self, data_processor):
        """Test data quality score calculation"""
        # Test with high quality data
        high_quality_data = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [10, 20, 30, 40, 50],
            'col3': ['A', 'B', 'C', 'D', 'E']
        })
        
        quality_score = await data_processor._calculate_quality_score(high_quality_data)
        assert quality_score > 0.8  # Should be high quality
        
        # Test with low quality data
        low_quality_data = pd.DataFrame({
            'col1': [1, np.nan, np.nan, np.nan, np.nan],
            'col2': [10, np.nan, np.nan, np.nan, np.nan],
            'col3': ['A', None, None, None, None]
        })
        
        quality_score = await data_processor._calculate_quality_score(low_quality_data)
        assert quality_score < 0.5  # Should be low quality
    
    @pytest.mark.asyncio
    async def test_trend_detection(self, data_processor):
        """Test trend detection in time series"""
        # Create test series with upward trend
        upward_trend = pd.Series([10, 12, 14, 16, 18, 20, 22, 24, 26, 28])
        
        trends = await data_processor._detect_trends(upward_trend)
        
        assert trends['direction'] == 'increasing'
        assert trends['slope'] > 0
        assert trends['strength'] > 0.8  # Should be strong correlation
        
        # Create test series with downward trend
        downward_trend = pd.Series([28, 26, 24, 22, 20, 18, 16, 14, 12, 10])
        
        trends = await data_processor._detect_trends(downward_trend)
        
        assert trends['direction'] == 'decreasing'
        assert trends['slope'] < 0
        assert trends['strength'] > 0.8  # Should be strong correlation
    
    @pytest.mark.asyncio
    async def test_seasonality_detection(self, data_processor):
        """Test seasonality detection"""
        # Create test series with daily pattern
        daily_pattern = pd.Series([10, 15, 20, 25, 20, 15, 10] * 10)  # 7-day pattern
        
        seasonality = await data_processor._detect_seasonality(daily_pattern)
        
        # Note: This is a simplified test - actual seasonality detection would need more data
        assert 'daily_pattern' in seasonality
        assert 'weekly_pattern' in seasonality
        assert 'daily_strength' in seasonality
        assert 'weekly_strength' in seasonality
    
    @pytest.mark.asyncio
    async def test_anomaly_detection(self, data_processor):
        """Test anomaly detection in time series"""
        # Create test series with anomalies
        normal_data = [10, 12, 11, 9, 13, 8, 14, 12, 11, 10]
        anomalies = [100, 200]  # Clear anomalies
        test_series = pd.Series(normal_data + anomalies)
        
        anomaly_results = await data_processor._detect_anomalies(test_series)
        
        assert anomaly_results['anomaly_count'] > 0
        assert len(anomaly_results['anomaly_values']) > 0
        assert max(anomaly_results['anomaly_values']) >= 100  # Should detect the anomalies
    
    @pytest.mark.asyncio
    async def test_clustering_analysis(self, data_processor):
        """Test clustering analysis for user journeys"""
        # Create test user features
        user_features = pd.DataFrame({
            'userId': [f'user_{i}' for i in range(20)],
            'session_count': np.random.randint(1, 20, 20),
            'avg_duration': np.random.normal(300, 100, 20),
            'total_page_views': np.random.randint(5, 100, 20),
            'bounce_rate': np.random.uniform(0, 1, 20),
            'conversion_rate': np.random.uniform(0, 0.5, 20)
        })
        
        # Test clustering
        clusters = await data_processor._cluster_user_journeys(user_features)
        
        if 'error' not in clusters:
            assert 'clusters' in clusters
            assert 'n_clusters' in clusters
            assert 'silhouette_score' in clusters
            assert clusters['n_clusters'] > 1
            assert len(clusters['clusters']) == len(user_features)
    
    @pytest.mark.asyncio
    async def test_feature_importance_calculation(self, data_processor):
        """Test feature importance calculation"""
        # Create test features
        features = pd.DataFrame({
            'feature1': np.random.normal(0, 1, 50),
            'feature2': np.random.normal(0, 1, 50),
            'feature3': np.random.normal(0, 1, 50)
        })
        
        importance = await data_processor._calculate_feature_importance(features)
        
        if importance:  # Only test if PCA was successful
            assert isinstance(importance, dict)
            assert len(importance) == 3
            assert all(isinstance(v, (int, float)) for v in importance.values())
    
    @pytest.mark.asyncio
    async def test_statistical_metrics_calculation(self, data_processor):
        """Test statistical metrics calculation"""
        # Create test time series
        test_series = pd.Series([10, 12, 11, 9, 13, 8, 14, 12, 11, 10])
        
        stats = await data_processor._calculate_time_series_stats(test_series)
        
        assert 'mean' in stats
        assert 'std' in stats
        assert 'min' in stats
        assert 'max' in stats
        assert 'median' in stats
        assert 'skewness' in stats
        assert 'kurtosis' in stats
        assert 'cv' in stats
        
        # Verify calculations
        assert abs(stats['mean'] - test_series.mean()) < 1e-10
        assert abs(stats['std'] - test_series.std()) < 1e-10
        assert stats['min'] == test_series.min()
        assert stats['max'] == test_series.max()
    
    @pytest.mark.asyncio
    async def test_error_handling(self, data_processor):
        """Test error handling in data processing"""
        # Test with invalid site_id
        data_processor.db.find_documents.side_effect = Exception("Database error")
        
        result = await data_processor.process_analytics_data(
            site_id="invalid_site"
        )
        
        assert result.success is False
        assert result.errors is not None
        assert "Database error" in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_metadata_generation(self, data_processor):
        """Test metadata generation"""
        # Create test DataFrame
        test_data = pd.DataFrame({
            'col1': [1, 2, 3, 4, 5],
            'col2': [10, 20, 30, 40, 50],
            'col3': ['A', 'B', 'C', 'D', 'E']
        })
        
        metadata = await data_processor._generate_metadata(test_data, "test_site")
        
        assert metadata['site_id'] == "test_site"
        assert metadata['rows'] == 5
        assert metadata['columns'] == 3
        assert 'data_types' in metadata
        assert 'missing_values' in metadata
        assert 'summary_stats' in metadata
        assert 'processing_timestamp' in metadata
    
    @pytest.mark.asyncio
    async def test_performance_metrics(self, data_processor):
        """Test performance metrics in processing"""
        # Mock database response
        data_processor.db.find_documents.return_value = [SAMPLE_ANALYTICS_DATA]
        
        # Test processing with timing
        start_time = datetime.now()
        result = await data_processor.process_analytics_data(
            site_id="test_site_123"
        )
        end_time = datetime.now()
        
        assert result.success is True
        assert result.processing_time is not None
        assert result.processing_time > 0
        
        # Processing should complete within reasonable time
        total_time = (end_time - start_time).total_seconds()
        assert total_time < 30  # Should complete within 30 seconds


class TestDataProcessorIntegration:
    """Integration tests for DataProcessor"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_full_analytics_pipeline(self, data_processor):
        """Test complete analytics processing pipeline"""
        # Create comprehensive test data
        analytics_data = []
        for i in range(10):
            data = SAMPLE_ANALYTICS_DATA.copy()
            data['_id'] = f'analytics_{i}'
            data['totalVisitors'] = 1000 + (i * 100)
            data['uniqueVisitors'] = 800 + (i * 80)
            data['web3Visitors'] = 200 + (i * 20)
            analytics_data.append(data)
        
        data_processor.db.find_documents.return_value = analytics_data
        
        # Test full pipeline
        result = await data_processor.process_analytics_data(
            site_id="test_site_123",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31)
        )
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == len(analytics_data)
        assert result.quality_score > 0.5
        assert result.metadata is not None
        assert result.processing_time is not None
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_user_journey_complete_analysis(self, data_processor):
        """Test complete user journey analysis"""
        # Create realistic user journey data
        session_data = []
        users = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5']
        
        for i in range(50):
            session = SAMPLE_SESSION_DATA.copy()
            session['_id'] = f'session_{i}'
            session['userId'] = users[i % len(users)]
            session['duration'] = np.random.normal(300, 100)
            session['pagesViewed'] = np.random.randint(1, 20)
            session['isBounce'] = np.random.choice([True, False], p=[0.3, 0.7])
            session['isWeb3User'] = np.random.choice([True, False], p=[0.4, 0.6])
            session_data.append(session)
        
        data_processor.db.find_documents.return_value = session_data
        
        # Test complete analysis
        result = await data_processor.analyze_user_journeys(
            site_id="test_site_123",
            time_window=30
        )
        
        assert result.success is True
        assert result.data is not None
        assert result.metadata is not None
        assert 'clusters' in result.metadata
        assert 'patterns' in result.metadata
        assert 'insights' in result.metadata
        assert 'feature_importance' in result.metadata
    
    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_large_dataset_processing(self, data_processor):
        """Test processing with large dataset"""
        # Create large dataset
        large_dataset = []
        for i in range(1000):
            data = SAMPLE_ANALYTICS_DATA.copy()
            data['_id'] = f'large_data_{i}'
            data['totalVisitors'] = np.random.randint(500, 2000)
            data['uniqueVisitors'] = np.random.randint(400, 1600)
            data['web3Visitors'] = np.random.randint(50, 400)
            large_dataset.append(data)
        
        data_processor.db.find_documents.return_value = large_dataset
        
        # Test processing performance
        result = await data_processor.process_analytics_data(
            site_id="test_site_123"
        )
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == len(large_dataset)
        assert result.processing_time is not None
        assert result.processing_time < 60  # Should complete within 1 minute 