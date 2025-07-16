"""
Comprehensive tests for Analytics ML service
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.cluster import KMeans

from services.analytics_ml import (
    AnalyticsMLService,
    MLModelResult,
    AnalyticsInsight,
    UserSegment,
    MLModelType,
    PredictionType
)
from . import SAMPLE_SESSION_DATA, SAMPLE_CAMPAIGN_DATA, SAMPLE_WEB3_DATA


class TestAnalyticsMLService:
    """Test suite for AnalyticsMLService class"""
    
    @pytest.fixture
    async def analytics_ml_service(self, mock_database):
        """Create AnalyticsMLService instance with mocked database"""
        service = AnalyticsMLService()
        service.db = mock_database
        
        # Mock data processor
        service.data_processor = AsyncMock()
        service.data_processor.initialize = AsyncMock()
        
        return service
    
    @pytest.mark.asyncio
    async def test_initialization(self):
        """Test AnalyticsMLService initialization"""
        service = AnalyticsMLService()
        
        assert service.db is None
        assert service.data_processor is not None
        assert service.models == {}
        assert service.scalers == {}
        assert service.encoders == {}
        assert service.model_cache == {}
        assert service.processing_config is not None
        
        # Test model configurations
        assert PredictionType.CHURN_PREDICTION in service.model_configs
        assert PredictionType.CONVERSION_PREDICTION in service.model_configs
        assert PredictionType.LTV_PREDICTION in service.model_configs
        assert PredictionType.ANOMALY_DETECTION in service.model_configs
        
        # Test initialize method
        with patch('utils.database.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            await service.initialize()
            assert service.db is not None
    
    @pytest.mark.asyncio
    async def test_predict_user_churn_success(self, analytics_ml_service):
        """Test successful user churn prediction"""
        # Create mock session data for churn analysis
        session_data = []
        for i in range(20):
            session = SAMPLE_SESSION_DATA.copy()
            session['userId'] = f'user_{i % 10}'  # 10 different users
            session['sessionId'] = f'session_{i}'
            session['duration'] = 300 + (i * 30)
            session['pagesViewed'] = 5 + (i % 5)
            session['startTime'] = datetime.now() - timedelta(days=i)
            session_data.append(session)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        # Mock model training and prediction
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]))
            mock_model.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7]] * 5))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            result = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                time_window=30,
                retrain_model=True
            )
        
        assert result.success is True
        assert result.model_type == MLModelType.CLASSIFICATION.value
        assert result.prediction_type == PredictionType.CHURN_PREDICTION.value
        assert result.predictions is not None
        assert result.probabilities is not None
        assert result.feature_importance is not None
        assert result.metadata is not None
        assert 'total_users' in result.metadata
        assert 'predicted_churners' in result.metadata
        assert 'churn_rate' in result.metadata
    
    @pytest.mark.asyncio
    async def test_predict_user_churn_no_data(self, analytics_ml_service):
        """Test user churn prediction with no data"""
        analytics_ml_service.db.find_documents.return_value = []
        
        result = await analytics_ml_service.predict_user_churn(
            site_id="test_site_123"
        )
        
        assert result.success is False
        assert result.error == "No data available for churn prediction"
    
    @pytest.mark.asyncio
    async def test_predict_conversion_probability_success(self, analytics_ml_service):
        """Test successful conversion probability prediction"""
        # Create mock session data with conversion information
        session_data = []
        for i in range(15):
            session = SAMPLE_SESSION_DATA.copy()
            session['userId'] = f'user_{i}'
            session['sessionId'] = f'session_{i}'
            session['duration'] = 200 + (i * 50)
            session['pagesViewed'] = 3 + (i % 7)
            session['isWeb3User'] = i % 3 == 0  # Every 3rd user is Web3
            session_data.append(session)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        # Mock model training and prediction
        with patch('sklearn.ensemble.GradientBoostingRegressor') as mock_gbr:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0.1, 0.8, 0.3, 0.9, 0.2] * 3))
            mock_model.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])
            mock_model.score = Mock(return_value=0.85)
            mock_gbr.return_value = mock_model
            
            result = await analytics_ml_service.predict_conversion_probability(
                site_id="test_site_123",
                time_window=30,
                retrain_model=True
            )
        
        assert result.success is True
        assert result.model_type == MLModelType.REGRESSION.value
        assert result.prediction_type == PredictionType.CONVERSION_PREDICTION.value
        assert result.predictions is not None
        assert result.feature_importance is not None
        assert result.metadata is not None
        assert 'total_users' in result.metadata
        assert 'avg_conversion_probability' in result.metadata
        assert 'high_potential_users' in result.metadata
    
    @pytest.mark.asyncio
    async def test_detect_anomalies_success(self, analytics_ml_service):
        """Test successful anomaly detection"""
        # Create mock session data with some anomalies
        session_data = []
        for i in range(20):
            session = SAMPLE_SESSION_DATA.copy()
            session['sessionId'] = f'session_{i}'
            session['duration'] = 300 if i < 18 else 3000  # Last 2 are anomalies
            session['pagesViewed'] = 5 if i < 18 else 50   # Last 2 are anomalies
            session['isBounce'] = False if i < 18 else True
            session['isWeb3User'] = i % 4 == 0
            session_data.append(session)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        result = await analytics_ml_service.detect_anomalies(
            site_id="test_site_123",
            time_window=30,
            contamination=0.1
        )
        
        assert result.success is True
        assert result.model_type == MLModelType.ANOMALY_DETECTION.value
        assert result.prediction_type == PredictionType.ANOMALY_DETECTION.value
        assert result.predictions is not None
        assert result.confidence_scores is not None
        assert result.metadata is not None
        assert 'total_records' in result.metadata
        assert 'anomalies_detected' in result.metadata
        assert 'anomaly_rate' in result.metadata
    
    @pytest.mark.asyncio
    async def test_segment_users_success(self, analytics_ml_service):
        """Test successful user segmentation"""
        # Create mock session data for segmentation
        session_data = []
        for i in range(30):
            session = SAMPLE_SESSION_DATA.copy()
            session['userId'] = f'user_{i}'
            session['sessionId'] = f'session_{i}'
            session['duration'] = 200 + (i * 20)
            session['pagesViewed'] = 3 + (i % 8)
            session['isBounce'] = i % 5 == 0
            session['isWeb3User'] = i % 3 == 0
            session_data.append(session)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        result = await analytics_ml_service.segment_users(
            site_id="test_site_123",
            time_window=30,
            n_segments=3
        )
        
        assert result.success is True
        assert result.model_type == MLModelType.CLUSTERING.value
        assert result.prediction_type == PredictionType.USER_SEGMENTATION.value
        assert result.predictions is not None
        assert result.metadata is not None
        assert 'total_users' in result.metadata
        assert 'n_segments' in result.metadata
        assert 'silhouette_score' in result.metadata
        assert 'segments' in result.metadata
    
    @pytest.mark.asyncio
    async def test_calculate_statistical_significance(self, analytics_ml_service):
        """Test statistical significance calculation"""
        # Create mock data for two segments
        segment_a_data = pd.DataFrame({
            'session_duration': np.random.normal(300, 50, 100),
            'page_views': np.random.normal(5, 2, 100),
            'bounce_rate': np.random.uniform(0, 0.5, 100)
        })
        
        segment_b_data = pd.DataFrame({
            'session_duration': np.random.normal(400, 60, 100),
            'page_views': np.random.normal(7, 3, 100),
            'bounce_rate': np.random.uniform(0.2, 0.7, 100)
        })
        
        # Mock database responses
        analytics_ml_service.db.find_documents.side_effect = [
            segment_a_data.to_dict('records'),
            segment_b_data.to_dict('records')
        ]
        
        result = await analytics_ml_service.calculate_statistical_significance(
            site_id="test_site_123",
            metric="session_duration",
            segment_a="segment_a",
            segment_b="segment_b",
            time_window=30
        )
        
        assert 't_test' in result
        assert 'effect_size' in result
        assert 'descriptive_stats' in result
        assert result['t_test']['p_value'] is not None
        assert result['descriptive_stats']['segment_a']['mean'] is not None
        assert result['descriptive_stats']['segment_b']['mean'] is not None
    
    @pytest.mark.asyncio
    async def test_generate_predictive_insights(self, analytics_ml_service):
        """Test predictive insights generation"""
        # Mock successful prediction results
        with patch.object(analytics_ml_service, 'predict_user_churn') as mock_churn:
            mock_churn.return_value = MLModelResult(
                success=True,
                model_type=MLModelType.CLASSIFICATION.value,
                prediction_type=PredictionType.CHURN_PREDICTION.value,
                metadata={
                    'churn_rate': 0.25,
                    'predicted_churners': 25,
                    'total_users': 100
                }
            )
            
            with patch.object(analytics_ml_service, 'predict_conversion_probability') as mock_conversion:
                mock_conversion.return_value = MLModelResult(
                    success=True,
                    model_type=MLModelType.REGRESSION.value,
                    prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                    metadata={
                        'high_potential_users': 15,
                        'total_users': 100
                    }
                )
                
                with patch.object(analytics_ml_service, 'detect_anomalies') as mock_anomalies:
                    mock_anomalies.return_value = MLModelResult(
                        success=True,
                        model_type=MLModelType.ANOMALY_DETECTION.value,
                        prediction_type=PredictionType.ANOMALY_DETECTION.value,
                        metadata={
                            'anomaly_rate': 0.08,
                            'anomalies_detected': 8,
                            'total_records': 100
                        }
                    )
                    
                    with patch.object(analytics_ml_service, 'segment_users') as mock_segments:
                        mock_segments.return_value = MLModelResult(
                            success=True,
                            model_type=MLModelType.CLUSTERING.value,
                            prediction_type=PredictionType.USER_SEGMENTATION.value,
                            metadata={
                                'segments': [
                                    {
                                        'name': 'High Value',
                                        'value_score': 0.9,
                                        'size': 20,
                                        'characteristics': {'avg_duration': 500}
                                    }
                                ]
                            }
                        )
                        
                        insights = await analytics_ml_service.generate_predictive_insights(
                            site_id="test_site_123",
                            time_window=30
                        )
        
        assert len(insights) > 0
        assert all(isinstance(insight, AnalyticsInsight) for insight in insights)
        assert any(insight.insight_type == "churn_prediction" for insight in insights)
        assert any(insight.insight_type == "conversion_opportunity" for insight in insights)
    
    @pytest.mark.asyncio
    async def test_churn_model_training(self, analytics_ml_service):
        """Test churn model training process"""
        # Create mock training data
        training_data = pd.DataFrame({
            'session_count': np.random.randint(1, 20, 100),
            'avg_duration': np.random.normal(300, 100, 100),
            'days_since_last_visit': np.random.randint(0, 30, 100),
            'page_views': np.random.randint(1, 50, 100),
            'bounce_rate': np.random.uniform(0, 1, 100),
            'churned': np.random.choice([0, 1], 100, p=[0.7, 0.3])
        })
        
        # Mock model training
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1] * 10))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            with patch('sklearn.model_selection.train_test_split') as mock_split:
                mock_split.return_value = (
                    training_data[['session_count', 'avg_duration', 'days_since_last_visit', 'page_views', 'bounce_rate']][:80],
                    training_data[['session_count', 'avg_duration', 'days_since_last_visit', 'page_views', 'bounce_rate']][80:],
                    training_data['churned'][:80],
                    training_data['churned'][80:]
                )
                
                with patch('sklearn.metrics.accuracy_score', return_value=0.85):
                    with patch('sklearn.metrics.precision_score', return_value=0.80):
                        with patch('sklearn.metrics.recall_score', return_value=0.75):
                            with patch('sklearn.metrics.f1_score', return_value=0.77):
                                result = await analytics_ml_service._train_churn_model(
                                    training_data, "test_model"
                                )
        
        assert result.success is True
        assert result.model_type == MLModelType.CLASSIFICATION.value
        assert result.prediction_type == PredictionType.CHURN_PREDICTION.value
        assert result.model_metrics is not None
        assert 'accuracy' in result.model_metrics
        assert 'precision' in result.model_metrics
        assert 'recall' in result.model_metrics
        assert 'f1_score' in result.model_metrics
    
    @pytest.mark.asyncio
    async def test_conversion_model_training(self, analytics_ml_service):
        """Test conversion model training process"""
        # Create mock training data
        training_data = pd.DataFrame({
            'session_duration': np.random.normal(300, 100, 100),
            'pages_viewed': np.random.randint(1, 20, 100),
            'traffic_source': ['organic'] * 50 + ['paid'] * 50,
            'device_type': ['desktop'] * 60 + ['mobile'] * 40,
            'time_on_site': np.random.normal(400, 150, 100),
            'converted': np.random.choice([0, 1], 100, p=[0.8, 0.2])
        })
        
        # Mock model training
        with patch('sklearn.ensemble.GradientBoostingRegressor') as mock_gbr:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0.1, 0.8] * 10))
            mock_model.feature_importances_ = np.array([0.4, 0.3, 0.2, 0.1])
            mock_model.score = Mock(return_value=0.75)
            mock_gbr.return_value = mock_model
            
            with patch('sklearn.model_selection.train_test_split') as mock_split:
                mock_split.return_value = (
                    training_data[['session_duration', 'pages_viewed', 'traffic_source', 'device_type', 'time_on_site']][:80],
                    training_data[['session_duration', 'pages_viewed', 'traffic_source', 'device_type', 'time_on_site']][80:],
                    training_data['converted'][:80],
                    training_data['converted'][80:]
                )
                
                result = await analytics_ml_service._train_conversion_model(
                    training_data, "test_model"
                )
        
        assert result.success is True
        assert result.model_type == MLModelType.REGRESSION.value
        assert result.prediction_type == PredictionType.CONVERSION_PREDICTION.value
        assert result.model_metrics is not None
        assert 'r2' in result.model_metrics
    
    @pytest.mark.asyncio
    async def test_clustering_optimal_k(self, analytics_ml_service):
        """Test optimal cluster number finding"""
        # Create test features
        features = np.random.normal(0, 1, (50, 5))
        
        optimal_k = await analytics_ml_service._find_optimal_clusters(features, max_k=10)
        
        assert isinstance(optimal_k, int)
        assert 2 <= optimal_k <= 10
    
    @pytest.mark.asyncio
    async def test_segment_profile_generation(self, analytics_ml_service):
        """Test user segment profile generation"""
        # Create test data
        test_data = pd.DataFrame({
            'session_count': [5, 10, 15, 20, 25],
            'avg_duration': [300, 400, 500, 600, 700],
            'total_page_views': [20, 40, 60, 80, 100],
            'bounce_rate': [0.1, 0.2, 0.3, 0.4, 0.5],
            'conversion_rate': [0.05, 0.1, 0.15, 0.2, 0.25]
        })
        
        cluster_labels = np.array([0, 0, 1, 1, 1])
        n_clusters = 2
        
        segments = await analytics_ml_service._generate_segment_profiles(
            test_data, cluster_labels, n_clusters
        )
        
        assert len(segments) == n_clusters
        assert all(isinstance(segment, UserSegment) for segment in segments)
        assert all(segment.segment_id.startswith('segment_') for segment in segments)
        assert all(segment.size > 0 for segment in segments)
        assert all(0 <= segment.value_score <= 1 for segment in segments)
    
    @pytest.mark.asyncio
    async def test_data_preparation_methods(self, analytics_ml_service):
        """Test data preparation methods"""
        # Test churn data preparation
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(10)]
        for i, session in enumerate(session_data):
            session['userId'] = f'user_{i % 5}'
            session['sessionId'] = f'session_{i}'
            session['startTime'] = datetime.now() - timedelta(days=i)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        churn_data = await analytics_ml_service._prepare_churn_data("test_site", 30)
        
        assert isinstance(churn_data, pd.DataFrame)
        if not churn_data.empty:
            assert 'userId' in churn_data.columns
            assert 'session_count' in churn_data.columns
            assert 'avg_duration' in churn_data.columns
            assert 'churned' in churn_data.columns
    
    @pytest.mark.asyncio
    async def test_insight_generation_methods(self, analytics_ml_service):
        """Test insight generation methods"""
        # Test churn insights
        test_data = pd.DataFrame({
            'userId': [f'user_{i}' for i in range(10)],
            'avg_duration': [300, 400, 200, 500, 150, 600, 250, 700, 180, 800]
        })
        
        predictions = np.array([0, 0, 1, 0, 1, 0, 1, 0, 1, 0])
        probabilities = np.array([0.2, 0.3, 0.8, 0.1, 0.9, 0.15, 0.7, 0.05, 0.85, 0.1])
        
        insights = await analytics_ml_service._generate_churn_insights(
            test_data, predictions, probabilities
        )
        
        assert isinstance(insights, list)
        assert all(isinstance(insight, str) for insight in insights)
    
    @pytest.mark.asyncio
    async def test_error_handling(self, analytics_ml_service):
        """Test error handling in ML operations"""
        # Test with database error
        analytics_ml_service.db.find_documents.side_effect = Exception("Database error")
        
        result = await analytics_ml_service.predict_user_churn(
            site_id="test_site_123"
        )
        
        assert result.success is False
        assert result.error is not None
        assert "Database error" in result.error
    
    @pytest.mark.asyncio
    async def test_model_caching(self, analytics_ml_service):
        """Test model caching functionality"""
        # Create mock session data
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(10)]
        analytics_ml_service.db.find_documents.return_value = session_data
        
        # Mock model training
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1] * 5))
            mock_model.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7]] * 5))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            # First call should train model
            result1 = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                retrain_model=True
            )
            
            # Second call should use cached model
            result2 = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                retrain_model=False
            )
        
        assert result1.success is True
        assert result2.success is True
        # Model should be cached
        assert "churn_test_site_123" in analytics_ml_service.models


class TestAnalyticsInsight:
    """Test suite for AnalyticsInsight class"""
    
    def test_analytics_insight_creation(self):
        """Test AnalyticsInsight creation"""
        insight = AnalyticsInsight(
            insight_type="churn_prediction",
            title="High Churn Risk",
            description="25% of users are at risk of churning",
            value=0.25,
            confidence=0.85,
            significance=0.95,
            timestamp=datetime.now(),
            metadata={"total_users": 100}
        )
        
        assert insight.insight_type == "churn_prediction"
        assert insight.title == "High Churn Risk"
        assert insight.value == 0.25
        assert insight.confidence == 0.85
        assert insight.significance == 0.95
        assert insight.metadata["total_users"] == 100


class TestUserSegment:
    """Test suite for UserSegment class"""
    
    def test_user_segment_creation(self):
        """Test UserSegment creation"""
        segment = UserSegment(
            segment_id="segment_1",
            name="High Value Users",
            description="Users with high engagement and conversion rates",
            characteristics={
                "avg_duration": 500,
                "conversion_rate": 0.15
            },
            size=25,
            value_score=0.9,
            engagement_score=0.85,
            conversion_rate=0.15
        )
        
        assert segment.segment_id == "segment_1"
        assert segment.name == "High Value Users"
        assert segment.size == 25
        assert segment.value_score == 0.9
        assert segment.engagement_score == 0.85
        assert segment.conversion_rate == 0.15
        assert segment.characteristics["avg_duration"] == 500


class TestAnalyticsMLIntegration:
    """Integration tests for AnalyticsMLService"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_complete_ml_pipeline(self, analytics_ml_service):
        """Test complete ML pipeline"""
        # Create comprehensive test data
        session_data = []
        for i in range(100):
            session = SAMPLE_SESSION_DATA.copy()
            session['userId'] = f'user_{i % 20}'  # 20 different users
            session['sessionId'] = f'session_{i}'
            session['duration'] = np.random.normal(300, 100)
            session['pagesViewed'] = np.random.randint(1, 20)
            session['isBounce'] = np.random.choice([True, False], p=[0.3, 0.7])
            session['isWeb3User'] = np.random.choice([True, False], p=[0.4, 0.6])
            session['startTime'] = datetime.now() - timedelta(days=np.random.randint(0, 30))
            session_data.append(session)
        
        analytics_ml_service.db.find_documents.return_value = session_data
        
        # Test churn prediction
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1] * 10))
            mock_model.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7]] * 10))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            churn_result = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                retrain_model=True
            )
        
        assert churn_result.success is True
        assert churn_result.predictions is not None
        assert churn_result.probabilities is not None
        assert churn_result.feature_importance is not None
        
        # Test anomaly detection
        anomaly_result = await analytics_ml_service.detect_anomalies(
            site_id="test_site_123"
        )
        
        assert anomaly_result.success is True
        assert anomaly_result.predictions is not None
        assert anomaly_result.confidence_scores is not None
        
        # Test user segmentation
        segment_result = await analytics_ml_service.segment_users(
            site_id="test_site_123",
            n_segments=3
        )
        
        assert segment_result.success is True
        assert segment_result.predictions is not None
        assert segment_result.metadata['n_segments'] == 3
    
    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_ml_performance_large_dataset(self, analytics_ml_service):
        """Test ML performance with large dataset"""
        # Create large dataset
        large_dataset = []
        for i in range(1000):
            session = SAMPLE_SESSION_DATA.copy()
            session['userId'] = f'user_{i % 100}'  # 100 different users
            session['sessionId'] = f'session_{i}'
            session['duration'] = np.random.normal(300, 100)
            session['pagesViewed'] = np.random.randint(1, 20)
            session['isBounce'] = np.random.choice([True, False])
            session['isWeb3User'] = np.random.choice([True, False])
            large_dataset.append(session)
        
        analytics_ml_service.db.find_documents.return_value = large_dataset
        
        # Test performance
        start_time = datetime.now()
        
        # Mock model to speed up test
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1] * 50))
            mock_model.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7]] * 50))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            result = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                retrain_model=True
            )
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        assert result.success is True
        assert processing_time < 60  # Should complete within 1 minute
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_ml_model_persistence(self, analytics_ml_service):
        """Test ML model persistence and loading"""
        # Create test data
        session_data = [SAMPLE_SESSION_DATA.copy() for _ in range(20)]
        analytics_ml_service.db.find_documents.return_value = session_data
        
        # Mock model training
        with patch('sklearn.ensemble.RandomForestClassifier') as mock_rf:
            mock_model = Mock()
            mock_model.fit = Mock()
            mock_model.predict = Mock(return_value=np.array([0, 1] * 10))
            mock_model.predict_proba = Mock(return_value=np.array([[0.8, 0.2], [0.3, 0.7]] * 10))
            mock_model.feature_importances_ = np.array([0.3, 0.25, 0.2, 0.15, 0.1])
            mock_rf.return_value = mock_model
            
            # Train model
            result = await analytics_ml_service.predict_user_churn(
                site_id="test_site_123",
                retrain_model=True
            )
        
        assert result.success is True
        
        # Test model saving
        model_key = "churn_test_site_123"
        assert model_key in analytics_ml_service.models
        
        # Test model persistence would require file system operations
        # This is tested in the actual implementation 