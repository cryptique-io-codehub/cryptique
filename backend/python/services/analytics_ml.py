"""
Analytics ML Service for Cryptique
Provides ML models for user behavior prediction, anomaly detection, and advanced analytics
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
import pickle
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML imports
from sklearn.ensemble import RandomForestClassifier, IsolationForest, GradientBoostingRegressor
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import silhouette_score, adjusted_rand_score
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import scipy.stats as stats
from scipy.stats import chi2_contingency
import seaborn as sns
import matplotlib.pyplot as plt

from config import config
from utils.logger import get_logger, log_async_performance, LogContext
from utils.database import get_db
from services.data_processor import DataProcessor

logger = get_logger(__name__)

class MLModelType(Enum):
    """ML model types"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    ANOMALY_DETECTION = "anomaly_detection"
    TIME_SERIES = "time_series"

class PredictionType(Enum):
    """Prediction types"""
    CHURN_PREDICTION = "churn_prediction"
    CONVERSION_PREDICTION = "conversion_prediction"
    LTV_PREDICTION = "ltv_prediction"
    ENGAGEMENT_PREDICTION = "engagement_prediction"
    ANOMALY_DETECTION = "anomaly_detection"
    USER_SEGMENTATION = "user_segmentation"

@dataclass
class MLModelResult:
    """Result of ML model training/prediction"""
    success: bool
    model_type: str
    prediction_type: str
    predictions: Optional[np.ndarray] = None
    probabilities: Optional[np.ndarray] = None
    confidence_scores: Optional[np.ndarray] = None
    feature_importance: Optional[Dict[str, float]] = None
    model_metrics: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@dataclass
class AnalyticsInsight:
    """Analytics insight from ML analysis"""
    insight_type: str
    title: str
    description: str
    value: Any
    confidence: float
    significance: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UserSegment:
    """User segment definition"""
    segment_id: str
    name: str
    description: str
    characteristics: Dict[str, Any]
    size: int
    value_score: float
    engagement_score: float
    conversion_rate: float

class AnalyticsMLService:
    """
    Advanced ML service for analytics with prediction and insight generation
    """
    
    def __init__(self):
        self.db = None
        self.data_processor = DataProcessor()
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.model_cache = {}
        self.processing_config = config.get_processing_config()
        
        # Model configurations
        self.model_configs = {
            PredictionType.CHURN_PREDICTION: {
                'model_class': RandomForestClassifier,
                'params': {'n_estimators': 100, 'max_depth': 10, 'random_state': 42},
                'features': ['session_count', 'avg_duration', 'days_since_last_visit', 'page_views', 'bounce_rate']
            },
            PredictionType.CONVERSION_PREDICTION: {
                'model_class': GradientBoostingRegressor,
                'params': {'n_estimators': 100, 'learning_rate': 0.1, 'random_state': 42},
                'features': ['session_duration', 'pages_viewed', 'traffic_source', 'device_type', 'time_on_site']
            },
            PredictionType.LTV_PREDICTION: {
                'model_class': GradientBoostingRegressor,
                'params': {'n_estimators': 150, 'learning_rate': 0.05, 'random_state': 42},
                'features': ['total_sessions', 'avg_session_duration', 'total_transactions', 'avg_transaction_value']
            },
            PredictionType.ANOMALY_DETECTION: {
                'model_class': IsolationForest,
                'params': {'contamination': 0.1, 'random_state': 42},
                'features': ['session_duration', 'page_views', 'bounce_rate', 'conversion_rate']
            }
        }
    
    async def initialize(self):
        """Initialize the ML service"""
        self.db = await get_db()
        await self.data_processor.initialize()
        
        # Load pre-trained models if available
        await self._load_saved_models()
        
        logger.info("Analytics ML service initialized")
    
    @log_async_performance
    async def predict_user_churn(
        self,
        site_id: str,
        time_window: int = 30,
        retrain_model: bool = False
    ) -> MLModelResult:
        """
        Predict user churn probability
        
        Args:
            site_id: Site identifier
            time_window: Time window for analysis in days
            retrain_model: Whether to retrain the model
            
        Returns:
            MLModelResult with churn predictions
        """
        try:
            with LogContext(f"Predicting user churn for site {site_id}"):
                # Prepare data
                data = await self._prepare_churn_data(site_id, time_window)
                
                if data.empty:
                    return MLModelResult(
                        success=False,
                        model_type=MLModelType.CLASSIFICATION.value,
                        prediction_type=PredictionType.CHURN_PREDICTION.value,
                        error="No data available for churn prediction"
                    )
                
                # Train or load model
                model_key = f"churn_{site_id}"
                if retrain_model or model_key not in self.models:
                    model_result = await self._train_churn_model(data, model_key)
                    if not model_result.success:
                        return model_result
                
                # Make predictions
                features = data[self.model_configs[PredictionType.CHURN_PREDICTION]['features']]
                predictions = self.models[model_key].predict(features)
                probabilities = self.models[model_key].predict_proba(features)
                
                # Calculate feature importance
                feature_importance = dict(zip(
                    features.columns,
                    self.models[model_key].feature_importances_
                ))
                
                # Generate insights
                insights = await self._generate_churn_insights(data, predictions, probabilities)
                
                return MLModelResult(
                    success=True,
                    model_type=MLModelType.CLASSIFICATION.value,
                    prediction_type=PredictionType.CHURN_PREDICTION.value,
                    predictions=predictions,
                    probabilities=probabilities[:, 1],  # Probability of churn
                    feature_importance=feature_importance,
                    metadata={
                        'total_users': len(data),
                        'predicted_churners': np.sum(predictions),
                        'churn_rate': np.mean(predictions),
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in churn prediction: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.CLASSIFICATION.value,
                prediction_type=PredictionType.CHURN_PREDICTION.value,
                error=str(e)
            )
    
    @log_async_performance
    async def predict_conversion_probability(
        self,
        site_id: str,
        time_window: int = 30,
        retrain_model: bool = False
    ) -> MLModelResult:
        """
        Predict conversion probability for users
        
        Args:
            site_id: Site identifier
            time_window: Time window for analysis in days
            retrain_model: Whether to retrain the model
            
        Returns:
            MLModelResult with conversion predictions
        """
        try:
            with LogContext(f"Predicting conversions for site {site_id}"):
                # Prepare data
                data = await self._prepare_conversion_data(site_id, time_window)
                
                if data.empty:
                    return MLModelResult(
                        success=False,
                        model_type=MLModelType.REGRESSION.value,
                        prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                        error="No data available for conversion prediction"
                    )
                
                # Train or load model
                model_key = f"conversion_{site_id}"
                if retrain_model or model_key not in self.models:
                    model_result = await self._train_conversion_model(data, model_key)
                    if not model_result.success:
                        return model_result
                
                # Make predictions
                features = data[self.model_configs[PredictionType.CONVERSION_PREDICTION]['features']]
                predictions = self.models[model_key].predict(features)
                
                # Calculate feature importance
                feature_importance = dict(zip(
                    features.columns,
                    self.models[model_key].feature_importances_
                ))
                
                # Generate insights
                insights = await self._generate_conversion_insights(data, predictions)
                
                return MLModelResult(
                    success=True,
                    model_type=MLModelType.REGRESSION.value,
                    prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                    predictions=predictions,
                    feature_importance=feature_importance,
                    metadata={
                        'total_users': len(data),
                        'avg_conversion_probability': np.mean(predictions),
                        'high_potential_users': np.sum(predictions > 0.7),
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in conversion prediction: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.REGRESSION.value,
                prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                error=str(e)
            )
    
    @log_async_performance
    async def detect_anomalies(
        self,
        site_id: str,
        time_window: int = 30,
        contamination: float = 0.1
    ) -> MLModelResult:
        """
        Detect anomalies in user behavior
        
        Args:
            site_id: Site identifier
            time_window: Time window for analysis in days
            contamination: Expected proportion of anomalies
            
        Returns:
            MLModelResult with anomaly detection results
        """
        try:
            with LogContext(f"Detecting anomalies for site {site_id}"):
                # Prepare data
                data = await self._prepare_anomaly_data(site_id, time_window)
                
                if data.empty:
                    return MLModelResult(
                        success=False,
                        model_type=MLModelType.ANOMALY_DETECTION.value,
                        prediction_type=PredictionType.ANOMALY_DETECTION.value,
                        error="No data available for anomaly detection"
                    )
                
                # Train anomaly detection model
                model = IsolationForest(
                    contamination=contamination,
                    random_state=42
                )
                
                features = data[self.model_configs[PredictionType.ANOMALY_DETECTION]['features']]
                predictions = model.fit_predict(features)
                anomaly_scores = model.decision_function(features)
                
                # Convert predictions (-1 for anomaly, 1 for normal) to boolean
                is_anomaly = predictions == -1
                
                # Generate insights
                insights = await self._generate_anomaly_insights(data, is_anomaly, anomaly_scores)
                
                return MLModelResult(
                    success=True,
                    model_type=MLModelType.ANOMALY_DETECTION.value,
                    prediction_type=PredictionType.ANOMALY_DETECTION.value,
                    predictions=is_anomaly,
                    confidence_scores=np.abs(anomaly_scores),
                    metadata={
                        'total_records': len(data),
                        'anomalies_detected': np.sum(is_anomaly),
                        'anomaly_rate': np.mean(is_anomaly),
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.ANOMALY_DETECTION.value,
                prediction_type=PredictionType.ANOMALY_DETECTION.value,
                error=str(e)
            )
    
    @log_async_performance
    async def segment_users(
        self,
        site_id: str,
        time_window: int = 30,
        n_segments: int = 5
    ) -> MLModelResult:
        """
        Segment users based on behavior patterns
        
        Args:
            site_id: Site identifier
            time_window: Time window for analysis in days
            n_segments: Number of segments to create
            
        Returns:
            MLModelResult with user segmentation results
        """
        try:
            with LogContext(f"Segmenting users for site {site_id}"):
                # Prepare data
                data = await self._prepare_segmentation_data(site_id, time_window)
                
                if data.empty:
                    return MLModelResult(
                        success=False,
                        model_type=MLModelType.CLUSTERING.value,
                        prediction_type=PredictionType.USER_SEGMENTATION.value,
                        error="No data available for user segmentation"
                    )
                
                # Perform clustering
                features = data[['session_count', 'avg_duration', 'total_page_views', 'bounce_rate', 'conversion_rate']]
                
                # Standardize features
                scaler = StandardScaler()
                features_scaled = scaler.fit_transform(features)
                
                # Find optimal number of clusters
                optimal_k = await self._find_optimal_clusters(features_scaled, max_k=min(n_segments, len(data)//10))
                
                # Perform clustering
                kmeans = KMeans(n_clusters=optimal_k, random_state=42)
                cluster_labels = kmeans.fit_predict(features_scaled)
                
                # Calculate silhouette score
                silhouette_avg = silhouette_score(features_scaled, cluster_labels)
                
                # Generate segment profiles
                segments = await self._generate_segment_profiles(data, cluster_labels, optimal_k)
                
                # Generate insights
                insights = await self._generate_segmentation_insights(segments)
                
                return MLModelResult(
                    success=True,
                    model_type=MLModelType.CLUSTERING.value,
                    prediction_type=PredictionType.USER_SEGMENTATION.value,
                    predictions=cluster_labels,
                    metadata={
                        'total_users': len(data),
                        'n_segments': optimal_k,
                        'silhouette_score': silhouette_avg,
                        'segments': segments,
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in user segmentation: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.CLUSTERING.value,
                prediction_type=PredictionType.USER_SEGMENTATION.value,
                error=str(e)
            )
    
    @log_async_performance
    async def calculate_statistical_significance(
        self,
        site_id: str,
        metric: str,
        segment_a: str,
        segment_b: str,
        time_window: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate statistical significance between segments
        
        Args:
            site_id: Site identifier
            metric: Metric to compare
            segment_a: First segment identifier
            segment_b: Second segment identifier
            time_window: Time window for analysis
            
        Returns:
            Statistical significance results
        """
        try:
            with LogContext(f"Calculating statistical significance for {metric}"):
                # Get data for both segments
                data_a = await self._get_segment_data(site_id, segment_a, time_window)
                data_b = await self._get_segment_data(site_id, segment_b, time_window)
                
                if data_a.empty or data_b.empty:
                    return {'error': 'Insufficient data for statistical analysis'}
                
                # Extract metric values
                values_a = data_a[metric].dropna()
                values_b = data_b[metric].dropna()
                
                # Perform statistical tests
                results = {}
                
                # T-test for continuous variables
                if metric in ['session_duration', 'page_views', 'bounce_rate']:
                    t_stat, p_value = stats.ttest_ind(values_a, values_b)
                    results['t_test'] = {
                        't_statistic': t_stat,
                        'p_value': p_value,
                        'significant': p_value < 0.05
                    }
                
                # Chi-square test for categorical variables
                if metric in ['device_type', 'traffic_source']:
                    contingency_table = pd.crosstab(
                        pd.concat([data_a[metric], data_b[metric]]),
                        pd.concat([
                            pd.Series(['A'] * len(data_a)),
                            pd.Series(['B'] * len(data_b))
                        ])
                    )
                    chi2, p_value, dof, expected = chi2_contingency(contingency_table)
                    results['chi_square'] = {
                        'chi2_statistic': chi2,
                        'p_value': p_value,
                        'degrees_of_freedom': dof,
                        'significant': p_value < 0.05
                    }
                
                # Effect size calculation
                if metric in ['session_duration', 'page_views', 'bounce_rate']:
                    cohens_d = (values_a.mean() - values_b.mean()) / np.sqrt(
                        ((len(values_a) - 1) * values_a.var() + (len(values_b) - 1) * values_b.var()) /
                        (len(values_a) + len(values_b) - 2)
                    )
                    results['effect_size'] = {
                        'cohens_d': cohens_d,
                        'magnitude': self._interpret_effect_size(cohens_d)
                    }
                
                # Descriptive statistics
                results['descriptive_stats'] = {
                    'segment_a': {
                        'mean': values_a.mean(),
                        'std': values_a.std(),
                        'count': len(values_a)
                    },
                    'segment_b': {
                        'mean': values_b.mean(),
                        'std': values_b.std(),
                        'count': len(values_b)
                    }
                }
                
                return results
                
        except Exception as e:
            logger.error(f"Error in statistical significance calculation: {e}")
            return {'error': str(e)}
    
    @log_async_performance
    async def generate_predictive_insights(
        self,
        site_id: str,
        time_window: int = 30
    ) -> List[AnalyticsInsight]:
        """
        Generate predictive insights using ML models
        
        Args:
            site_id: Site identifier
            time_window: Time window for analysis
            
        Returns:
            List of predictive insights
        """
        try:
            with LogContext(f"Generating predictive insights for site {site_id}"):
                insights = []
                
                # Churn prediction insights
                churn_result = await self.predict_user_churn(site_id, time_window)
                if churn_result.success:
                    churn_rate = churn_result.metadata['churn_rate']
                    insights.append(AnalyticsInsight(
                        insight_type="churn_prediction",
                        title="User Churn Risk",
                        description=f"{churn_rate:.1%} of users are at risk of churning",
                        value=churn_rate,
                        confidence=0.85,
                        significance=0.95 if churn_rate > 0.2 else 0.7,
                        timestamp=datetime.now(),
                        metadata={
                            'predicted_churners': churn_result.metadata['predicted_churners'],
                            'total_users': churn_result.metadata['total_users']
                        }
                    ))
                
                # Conversion prediction insights
                conversion_result = await self.predict_conversion_probability(site_id, time_window)
                if conversion_result.success:
                    high_potential = conversion_result.metadata['high_potential_users']
                    total_users = conversion_result.metadata['total_users']
                    insights.append(AnalyticsInsight(
                        insight_type="conversion_opportunity",
                        title="High-Potential Users",
                        description=f"{high_potential} users have high conversion probability",
                        value=high_potential,
                        confidence=0.8,
                        significance=0.9 if high_potential > total_users * 0.1 else 0.6,
                        timestamp=datetime.now(),
                        metadata={
                            'total_users': total_users,
                            'percentage': high_potential / total_users if total_users > 0 else 0
                        }
                    ))
                
                # Anomaly detection insights
                anomaly_result = await self.detect_anomalies(site_id, time_window)
                if anomaly_result.success:
                    anomaly_rate = anomaly_result.metadata['anomaly_rate']
                    if anomaly_rate > 0.05:  # More than 5% anomalies
                        insights.append(AnalyticsInsight(
                            insight_type="anomaly_alert",
                            title="Unusual User Behavior Detected",
                            description=f"{anomaly_rate:.1%} of user sessions show anomalous behavior",
                            value=anomaly_rate,
                            confidence=0.9,
                            significance=0.95,
                            timestamp=datetime.now(),
                            metadata={
                                'anomalies_detected': anomaly_result.metadata['anomalies_detected'],
                                'total_records': anomaly_result.metadata['total_records']
                            }
                        ))
                
                # User segmentation insights
                segment_result = await self.segment_users(site_id, time_window)
                if segment_result.success:
                    segments = segment_result.metadata['segments']
                    best_segment = max(segments, key=lambda x: x['value_score'])
                    insights.append(AnalyticsInsight(
                        insight_type="user_segmentation",
                        title="High-Value User Segment Identified",
                        description=f"Segment '{best_segment['name']}' shows highest value potential",
                        value=best_segment['value_score'],
                        confidence=0.8,
                        significance=0.85,
                        timestamp=datetime.now(),
                        metadata={
                            'segment_size': best_segment['size'],
                            'characteristics': best_segment['characteristics']
                        }
                    ))
                
                return insights
                
        except Exception as e:
            logger.error(f"Error generating predictive insights: {e}")
            return []
    
    # Private methods
    
    async def _prepare_churn_data(self, site_id: str, time_window: int) -> pd.DataFrame:
        """Prepare data for churn prediction"""
        # Get session data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        sessions = await self.db.find_documents(
            "sessions",
            {
                "siteId": site_id,
                "startTime": {"$gte": start_date, "$lte": end_date}
            }
        )
        
        if not sessions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(sessions)
        
        # Create user-level features
        user_features = df.groupby('userId').agg({
            'sessionId': 'count',
            'duration': 'mean',
            'pagesViewed': 'mean',
            'isBounce': 'mean',
            'startTime': ['min', 'max']
        }).reset_index()
        
        # Flatten column names
        user_features.columns = ['userId', 'session_count', 'avg_duration', 'avg_pages', 'bounce_rate', 'first_visit', 'last_visit']
        
        # Calculate days since last visit
        user_features['days_since_last_visit'] = (datetime.now() - pd.to_datetime(user_features['last_visit'])).dt.days
        
        # Define churn (no activity in last 7 days)
        user_features['churned'] = user_features['days_since_last_visit'] > 7
        
        return user_features
    
    async def _prepare_conversion_data(self, site_id: str, time_window: int) -> pd.DataFrame:
        """Prepare data for conversion prediction"""
        # Get session data with conversion information
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        sessions = await self.db.find_documents(
            "sessions",
            {
                "siteId": site_id,
                "startTime": {"$gte": start_date, "$lte": end_date}
            }
        )
        
        if not sessions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(sessions)
        
        # Create features
        df['session_duration'] = df['duration']
        df['pages_viewed'] = df['pagesViewed']
        df['time_on_site'] = df['duration']
        df['converted'] = df['isWeb3User'].astype(int)  # Use Web3 user as conversion proxy
        
        # Encode categorical features
        if 'device' in df.columns:
            df['device_type'] = df['device'].apply(lambda x: x.get('type', 'unknown') if isinstance(x, dict) else 'unknown')
        else:
            df['device_type'] = 'unknown'
        
        # Traffic source from UTM data
        if 'utmData' in df.columns:
            df['traffic_source'] = df['utmData'].apply(lambda x: x.get('source', 'direct') if isinstance(x, dict) else 'direct')
        else:
            df['traffic_source'] = 'direct'
        
        return df
    
    async def _prepare_anomaly_data(self, site_id: str, time_window: int) -> pd.DataFrame:
        """Prepare data for anomaly detection"""
        # Get session data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        sessions = await self.db.find_documents(
            "sessions",
            {
                "siteId": site_id,
                "startTime": {"$gte": start_date, "$lte": end_date}
            }
        )
        
        if not sessions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(sessions)
        
        # Create features for anomaly detection
        df['session_duration'] = df['duration']
        df['page_views'] = df['pagesViewed']
        df['bounce_rate'] = df['isBounce'].astype(int)
        df['conversion_rate'] = df['isWeb3User'].astype(int)
        
        return df
    
    async def _prepare_segmentation_data(self, site_id: str, time_window: int) -> pd.DataFrame:
        """Prepare data for user segmentation"""
        # Get session data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        sessions = await self.db.find_documents(
            "sessions",
            {
                "siteId": site_id,
                "startTime": {"$gte": start_date, "$lte": end_date}
            }
        )
        
        if not sessions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(sessions)
        
        # Create user-level features
        user_features = df.groupby('userId').agg({
            'sessionId': 'count',
            'duration': 'mean',
            'pagesViewed': 'sum',
            'isBounce': 'mean',
            'isWeb3User': 'max'
        }).reset_index()
        
        # Rename columns
        user_features.columns = ['userId', 'session_count', 'avg_duration', 'total_page_views', 'bounce_rate', 'conversion_rate']
        
        return user_features
    
    async def _train_churn_model(self, data: pd.DataFrame, model_key: str) -> MLModelResult:
        """Train churn prediction model"""
        try:
            # Prepare features and target
            features = data[self.model_configs[PredictionType.CHURN_PREDICTION]['features']]
            target = data['churned']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                features, target, test_size=0.2, random_state=42, stratify=target
            )
            
            # Train model
            model = self.model_configs[PredictionType.CHURN_PREDICTION]['model_class'](
                **self.model_configs[PredictionType.CHURN_PREDICTION]['params']
            )
            model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = model.predict(X_test)
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred),
                'recall': recall_score(y_test, y_pred),
                'f1_score': f1_score(y_test, y_pred)
            }
            
            # Save model
            self.models[model_key] = model
            
            return MLModelResult(
                success=True,
                model_type=MLModelType.CLASSIFICATION.value,
                prediction_type=PredictionType.CHURN_PREDICTION.value,
                model_metrics=metrics
            )
            
        except Exception as e:
            logger.error(f"Error training churn model: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.CLASSIFICATION.value,
                prediction_type=PredictionType.CHURN_PREDICTION.value,
                error=str(e)
            )
    
    async def _train_conversion_model(self, data: pd.DataFrame, model_key: str) -> MLModelResult:
        """Train conversion prediction model"""
        try:
            # Prepare features and target
            features = data[self.model_configs[PredictionType.CONVERSION_PREDICTION]['features']]
            target = data['converted']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                features, target, test_size=0.2, random_state=42
            )
            
            # Train model
            model = self.model_configs[PredictionType.CONVERSION_PREDICTION]['model_class'](
                **self.model_configs[PredictionType.CONVERSION_PREDICTION]['params']
            )
            model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = model.predict(X_test)
            metrics = {
                'mse': np.mean((y_test - y_pred) ** 2),
                'rmse': np.sqrt(np.mean((y_test - y_pred) ** 2)),
                'mae': np.mean(np.abs(y_test - y_pred)),
                'r2': model.score(X_test, y_test)
            }
            
            # Save model
            self.models[model_key] = model
            
            return MLModelResult(
                success=True,
                model_type=MLModelType.REGRESSION.value,
                prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                model_metrics=metrics
            )
            
        except Exception as e:
            logger.error(f"Error training conversion model: {e}")
            return MLModelResult(
                success=False,
                model_type=MLModelType.REGRESSION.value,
                prediction_type=PredictionType.CONVERSION_PREDICTION.value,
                error=str(e)
            )
    
    async def _find_optimal_clusters(self, features: np.ndarray, max_k: int = 10) -> int:
        """Find optimal number of clusters using elbow method"""
        if max_k < 2:
            return 2
        
        inertias = []
        k_range = range(2, min(max_k + 1, len(features)))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42)
            kmeans.fit(features)
            inertias.append(kmeans.inertia_)
        
        # Find elbow point
        if len(inertias) > 2:
            diffs = np.diff(inertias)
            diff2 = np.diff(diffs)
            if len(diff2) > 0:
                elbow_idx = np.argmax(diff2) + 2
                return k_range[elbow_idx]
        
        return 3  # Default
    
    async def _generate_segment_profiles(
        self,
        data: pd.DataFrame,
        cluster_labels: np.ndarray,
        n_clusters: int
    ) -> List[UserSegment]:
        """Generate user segment profiles"""
        segments = []
        
        for i in range(n_clusters):
            cluster_data = data[cluster_labels == i]
            
            segment = UserSegment(
                segment_id=f"segment_{i}",
                name=f"Segment {i + 1}",
                description=f"User segment with {len(cluster_data)} users",
                characteristics={
                    'avg_sessions': cluster_data['session_count'].mean(),
                    'avg_duration': cluster_data['avg_duration'].mean(),
                    'avg_page_views': cluster_data['total_page_views'].mean(),
                    'bounce_rate': cluster_data['bounce_rate'].mean(),
                    'conversion_rate': cluster_data['conversion_rate'].mean()
                },
                size=len(cluster_data),
                value_score=self._calculate_segment_value_score(cluster_data),
                engagement_score=self._calculate_engagement_score(cluster_data),
                conversion_rate=cluster_data['conversion_rate'].mean()
            )
            
            segments.append(segment)
        
        return segments
    
    def _calculate_segment_value_score(self, segment_data: pd.DataFrame) -> float:
        """Calculate value score for a segment"""
        # Combine multiple metrics into a value score
        session_score = min(segment_data['session_count'].mean() / 10, 1.0)
        duration_score = min(segment_data['avg_duration'].mean() / 300, 1.0)
        page_score = min(segment_data['total_page_views'].mean() / 50, 1.0)
        conversion_score = segment_data['conversion_rate'].mean()
        
        return (session_score * 0.3 + duration_score * 0.2 + page_score * 0.2 + conversion_score * 0.3)
    
    def _calculate_engagement_score(self, segment_data: pd.DataFrame) -> float:
        """Calculate engagement score for a segment"""
        # Inverse of bounce rate plus session metrics
        engagement = (1 - segment_data['bounce_rate'].mean()) * 0.5
        engagement += min(segment_data['avg_duration'].mean() / 300, 1.0) * 0.3
        engagement += min(segment_data['total_page_views'].mean() / 20, 1.0) * 0.2
        
        return engagement
    
    async def _generate_churn_insights(
        self,
        data: pd.DataFrame,
        predictions: np.ndarray,
        probabilities: np.ndarray
    ) -> List[str]:
        """Generate insights from churn predictions"""
        insights = []
        
        churn_rate = np.mean(predictions)
        high_risk_users = np.sum(probabilities > 0.8)
        
        if churn_rate > 0.3:
            insights.append(f"High churn risk: {churn_rate:.1%} of users predicted to churn")
        
        if high_risk_users > 0:
            insights.append(f"{high_risk_users} users have >80% churn probability")
        
        # Feature importance insights
        avg_duration_churned = data[predictions == 1]['avg_duration'].mean()
        avg_duration_retained = data[predictions == 0]['avg_duration'].mean()
        
        if avg_duration_churned < avg_duration_retained:
            insights.append("Users with shorter session durations are more likely to churn")
        
        return insights
    
    async def _generate_conversion_insights(
        self,
        data: pd.DataFrame,
        predictions: np.ndarray
    ) -> List[str]:
        """Generate insights from conversion predictions"""
        insights = []
        
        high_potential = np.sum(predictions > 0.7)
        avg_conversion_prob = np.mean(predictions)
        
        if high_potential > 0:
            insights.append(f"{high_potential} users have high conversion potential (>70%)")
        
        insights.append(f"Average conversion probability: {avg_conversion_prob:.1%}")
        
        return insights
    
    async def _generate_anomaly_insights(
        self,
        data: pd.DataFrame,
        is_anomaly: np.ndarray,
        anomaly_scores: np.ndarray
    ) -> List[str]:
        """Generate insights from anomaly detection"""
        insights = []
        
        anomaly_count = np.sum(is_anomaly)
        if anomaly_count > 0:
            insights.append(f"{anomaly_count} anomalous sessions detected")
            
            # Analyze anomaly characteristics
            anomaly_data = data[is_anomaly]
            normal_data = data[~is_anomaly]
            
            if anomaly_data['session_duration'].mean() > normal_data['session_duration'].mean() * 2:
                insights.append("Anomalies show unusually long session durations")
            
            if anomaly_data['page_views'].mean() > normal_data['page_views'].mean() * 2:
                insights.append("Anomalies show unusually high page views")
        
        return insights
    
    async def _generate_segmentation_insights(self, segments: List[UserSegment]) -> List[str]:
        """Generate insights from user segmentation"""
        insights = []
        
        # Find best and worst segments
        best_segment = max(segments, key=lambda x: x.value_score)
        worst_segment = min(segments, key=lambda x: x.value_score)
        
        insights.append(f"Highest value segment: {best_segment.name} (score: {best_segment.value_score:.2f})")
        insights.append(f"Lowest value segment: {worst_segment.name} (score: {worst_segment.value_score:.2f})")
        
        # Segment size insights
        largest_segment = max(segments, key=lambda x: x.size)
        insights.append(f"Largest segment: {largest_segment.name} ({largest_segment.size} users)")
        
        return insights
    
    async def _get_segment_data(self, site_id: str, segment_id: str, time_window: int) -> pd.DataFrame:
        """Get data for a specific segment"""
        # This would typically involve querying pre-computed segment data
        # For now, return sample data
        return pd.DataFrame()
    
    def _interpret_effect_size(self, cohens_d: float) -> str:
        """Interpret Cohen's d effect size"""
        abs_d = abs(cohens_d)
        if abs_d < 0.2:
            return "negligible"
        elif abs_d < 0.5:
            return "small"
        elif abs_d < 0.8:
            return "medium"
        else:
            return "large"
    
    async def _load_saved_models(self):
        """Load pre-trained models from disk"""
        models_dir = Path("models")
        if models_dir.exists():
            for model_file in models_dir.glob("*.pkl"):
                try:
                    with open(model_file, 'rb') as f:
                        model = pickle.load(f)
                    self.models[model_file.stem] = model
                    logger.info(f"Loaded model: {model_file.stem}")
                except Exception as e:
                    logger.warning(f"Error loading model {model_file}: {e}")
    
    async def save_model(self, model_key: str, model_path: Optional[str] = None):
        """Save a trained model to disk"""
        if model_key not in self.models:
            raise ValueError(f"Model {model_key} not found")
        
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        model_path = model_path or f"models/{model_key}.pkl"
        
        try:
            with open(model_path, 'wb') as f:
                pickle.dump(self.models[model_key], f)
            logger.info(f"Model saved: {model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise

# Global ML service instance
analytics_ml_service = AnalyticsMLService()

# Convenience functions
async def get_analytics_ml_service() -> AnalyticsMLService:
    """Get analytics ML service instance"""
    if not analytics_ml_service.db:
        await analytics_ml_service.initialize()
    return analytics_ml_service 