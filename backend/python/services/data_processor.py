"""
Advanced Analytics Data Processor for Cryptique
Handles data cleaning, normalization, statistical analysis, and trend detection
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
from scipy import stats
from scipy.signal import find_peaks
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

from config import config
from utils.logger import get_logger, log_async_performance, LogContext
from utils.database import get_db
from utils.validators import DataValidator

logger = get_logger(__name__)

class DataQuality(Enum):
    """Data quality levels"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INVALID = "invalid"

@dataclass
class ProcessingResult:
    """Result of data processing operation"""
    success: bool
    data: Optional[pd.DataFrame] = None
    metadata: Optional[Dict[str, Any]] = None
    quality_score: Optional[float] = None
    errors: Optional[List[str]] = None
    processing_time: Optional[float] = None

@dataclass
class AnalyticsInsight:
    """Analytics insight structure"""
    type: str
    title: str
    description: str
    value: Any
    confidence: float
    timestamp: datetime
    metadata: Dict[str, Any]

class DataProcessor:
    """
    Advanced analytics data processor with ML capabilities
    """
    
    def __init__(self):
        self.db = None
        self.validator = DataValidator()
        self.scaler = StandardScaler()
        self.min_max_scaler = MinMaxScaler()
        self.processing_config = config.get_processing_config()
        
    async def initialize(self):
        """Initialize the data processor"""
        self.db = await get_db()
        logger.info("Data processor initialized")
    
    @log_async_performance
    async def process_analytics_data(
        self,
        site_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        data_types: Optional[List[str]] = None
    ) -> ProcessingResult:
        """
        Process analytics data for a specific site
        
        Args:
            site_id: Site identifier
            start_date: Start date for data processing
            end_date: End date for data processing
            data_types: Types of data to process
            
        Returns:
            ProcessingResult with processed data
        """
        try:
            with LogContext(f"Processing analytics data for site {site_id}"):
                # Fetch raw analytics data
                raw_data = await self._fetch_analytics_data(
                    site_id, start_date, end_date, data_types
                )
                
                if not raw_data:
                    return ProcessingResult(
                        success=False,
                        errors=["No data found for the specified criteria"]
                    )
                
                # Convert to DataFrame
                df = pd.DataFrame(raw_data)
                
                # Data cleaning and validation
                cleaned_data = await self._clean_and_validate_data(df)
                
                # Detect and handle outliers
                if self.processing_config['outlier_detection']:
                    cleaned_data = await self._handle_outliers(cleaned_data)
                
                # Normalize data
                normalized_data = await self._normalize_data(cleaned_data)
                
                # Calculate quality score
                quality_score = await self._calculate_quality_score(normalized_data)
                
                # Generate metadata
                metadata = await self._generate_metadata(normalized_data, site_id)
                
                return ProcessingResult(
                    success=True,
                    data=normalized_data,
                    metadata=metadata,
                    quality_score=quality_score
                )
                
        except Exception as e:
            logger.error(f"Error processing analytics data: {e}")
            return ProcessingResult(
                success=False,
                errors=[str(e)]
            )
    
    @log_async_performance
    async def analyze_user_journeys(
        self,
        site_id: str,
        time_window: int = 30
    ) -> ProcessingResult:
        """
        Analyze user journeys with ML clustering
        
        Args:
            site_id: Site identifier
            time_window: Time window in days
            
        Returns:
            ProcessingResult with journey analysis
        """
        try:
            with LogContext(f"Analyzing user journeys for site {site_id}"):
                # Fetch session data
                end_date = datetime.now()
                start_date = end_date - timedelta(days=time_window)
                
                sessions = await self._fetch_session_data(site_id, start_date, end_date)
                
                if not sessions:
                    return ProcessingResult(
                        success=False,
                        errors=["No session data found"]
                    )
                
                # Convert to DataFrame
                df = pd.DataFrame(sessions)
                
                # Feature engineering for user journeys
                journey_features = await self._extract_journey_features(df)
                
                # Perform clustering analysis
                clusters = await self._cluster_user_journeys(journey_features)
                
                # Analyze journey patterns
                patterns = await self._analyze_journey_patterns(df, clusters)
                
                # Generate insights
                insights = await self._generate_journey_insights(patterns)
                
                return ProcessingResult(
                    success=True,
                    data=df,
                    metadata={
                        'clusters': clusters,
                        'patterns': patterns,
                        'insights': insights,
                        'feature_importance': await self._calculate_feature_importance(journey_features)
                    }
                )
                
        except Exception as e:
            logger.error(f"Error analyzing user journeys: {e}")
            return ProcessingResult(
                success=False,
                errors=[str(e)]
            )
    
    @log_async_performance
    async def perform_time_series_analysis(
        self,
        site_id: str,
        metric: str,
        time_window: int = 90
    ) -> ProcessingResult:
        """
        Perform time series analysis on analytics metrics
        
        Args:
            site_id: Site identifier
            metric: Metric to analyze
            time_window: Time window in days
            
        Returns:
            ProcessingResult with time series analysis
        """
        try:
            with LogContext(f"Time series analysis for {metric} on site {site_id}"):
                # Fetch time series data
                time_series_data = await self._fetch_time_series_data(
                    site_id, metric, time_window
                )
                
                if not time_series_data:
                    return ProcessingResult(
                        success=False,
                        errors=["No time series data found"]
                    )
                
                # Convert to DataFrame with proper datetime index
                df = pd.DataFrame(time_series_data)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)
                df.sort_index(inplace=True)
                
                # Detect trends
                trends = await self._detect_trends(df[metric])
                
                # Detect seasonality
                seasonality = await self._detect_seasonality(df[metric])
                
                # Detect anomalies
                anomalies = await self._detect_anomalies(df[metric])
                
                # Forecast future values
                forecast = await self._forecast_metric(df[metric])
                
                # Calculate statistical metrics
                stats_metrics = await self._calculate_time_series_stats(df[metric])
                
                return ProcessingResult(
                    success=True,
                    data=df,
                    metadata={
                        'trends': trends,
                        'seasonality': seasonality,
                        'anomalies': anomalies,
                        'forecast': forecast,
                        'statistics': stats_metrics
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in time series analysis: {e}")
            return ProcessingResult(
                success=False,
                errors=[str(e)]
            )
    
    @log_async_performance
    async def analyze_campaign_attribution(
        self,
        site_id: str,
        time_window: int = 30
    ) -> ProcessingResult:
        """
        Analyze campaign attribution using advanced modeling
        
        Args:
            site_id: Site identifier
            time_window: Time window in days
            
        Returns:
            ProcessingResult with attribution analysis
        """
        try:
            with LogContext(f"Campaign attribution analysis for site {site_id}"):
                # Fetch campaign and conversion data
                campaign_data = await self._fetch_campaign_data(site_id, time_window)
                
                if not campaign_data:
                    return ProcessingResult(
                        success=False,
                        errors=["No campaign data found"]
                    )
                
                # Convert to DataFrame
                df = pd.DataFrame(campaign_data)
                
                # Apply attribution models
                attribution_models = await self._apply_attribution_models(df)
                
                # Calculate campaign performance metrics
                performance_metrics = await self._calculate_campaign_metrics(df)
                
                # Analyze conversion paths
                conversion_paths = await self._analyze_conversion_paths(df)
                
                # Generate attribution insights
                insights = await self._generate_attribution_insights(
                    attribution_models, performance_metrics, conversion_paths
                )
                
                return ProcessingResult(
                    success=True,
                    data=df,
                    metadata={
                        'attribution_models': attribution_models,
                        'performance_metrics': performance_metrics,
                        'conversion_paths': conversion_paths,
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in campaign attribution analysis: {e}")
            return ProcessingResult(
                success=False,
                errors=[str(e)]
            )
    
    @log_async_performance
    async def analyze_web3_patterns(
        self,
        site_id: str,
        time_window: int = 30
    ) -> ProcessingResult:
        """
        Analyze Web3 transaction patterns and behaviors
        
        Args:
            site_id: Site identifier
            time_window: Time window in days
            
        Returns:
            ProcessingResult with Web3 analysis
        """
        try:
            with LogContext(f"Web3 pattern analysis for site {site_id}"):
                # Fetch Web3 transaction data
                web3_data = await self._fetch_web3_data(site_id, time_window)
                
                if not web3_data:
                    return ProcessingResult(
                        success=False,
                        errors=["No Web3 data found"]
                    )
                
                # Convert to DataFrame
                df = pd.DataFrame(web3_data)
                
                # Analyze transaction patterns
                tx_patterns = await self._analyze_transaction_patterns(df)
                
                # Analyze wallet behaviors
                wallet_behaviors = await self._analyze_wallet_behaviors(df)
                
                # Detect Web3 user segments
                user_segments = await self._segment_web3_users(df)
                
                # Calculate Web3 metrics
                web3_metrics = await self._calculate_web3_metrics(df)
                
                # Generate Web3 insights
                insights = await self._generate_web3_insights(
                    tx_patterns, wallet_behaviors, user_segments, web3_metrics
                )
                
                return ProcessingResult(
                    success=True,
                    data=df,
                    metadata={
                        'transaction_patterns': tx_patterns,
                        'wallet_behaviors': wallet_behaviors,
                        'user_segments': user_segments,
                        'web3_metrics': web3_metrics,
                        'insights': insights
                    }
                )
                
        except Exception as e:
            logger.error(f"Error in Web3 pattern analysis: {e}")
            return ProcessingResult(
                success=False,
                errors=[str(e)]
            )
    
    # Private helper methods
    
    async def _fetch_analytics_data(
        self,
        site_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        data_types: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """Fetch analytics data from database"""
        filter_dict = {"siteId": site_id}
        
        if start_date and end_date:
            filter_dict["createdAt"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        
        # Fetch from analytics collection
        analytics_data = await self.db.find_documents("analytics", filter_dict)
        
        # Fetch related session data
        sessions = await self.db.find_documents("sessions", filter_dict)
        
        # Combine data
        combined_data = []
        for analytics in analytics_data:
            analytics['data_type'] = 'analytics'
            combined_data.append(analytics)
        
        for session in sessions:
            session['data_type'] = 'session'
            combined_data.append(session)
        
        return combined_data
    
    async def _fetch_session_data(
        self,
        site_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch session data for journey analysis"""
        filter_dict = {
            "siteId": site_id,
            "startTime": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        return await self.db.find_documents("sessions", filter_dict)
    
    async def _fetch_time_series_data(
        self,
        site_id: str,
        metric: str,
        time_window: int
    ) -> List[Dict[str, Any]]:
        """Fetch time series data for analysis"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        # Aggregate data by hour/day depending on time window
        aggregation_level = "hourly" if time_window <= 7 else "daily"
        collection_name = f"{aggregation_level}stats"
        
        filter_dict = {
            "siteId": site_id,
            "lastSnapshotAt": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        return await self.db.find_documents(collection_name, filter_dict)
    
    async def _fetch_campaign_data(
        self,
        site_id: str,
        time_window: int
    ) -> List[Dict[str, Any]]:
        """Fetch campaign data for attribution analysis"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        filter_dict = {
            "siteId": site_id,
            "createdAt": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        return await self.db.find_documents("campaigns", filter_dict)
    
    async def _fetch_web3_data(
        self,
        site_id: str,
        time_window: int
    ) -> List[Dict[str, Any]]:
        """Fetch Web3 transaction data"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_window)
        
        # Get contracts for this site
        contracts = await self.db.find_documents(
            "smartcontracts",
            {"siteId": site_id}
        )
        
        if not contracts:
            return []
        
        contract_ids = [contract["_id"] for contract in contracts]
        
        filter_dict = {
            "contract": {"$in": contract_ids},
            "block_time": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        return await self.db.find_documents("transactions", filter_dict)
    
    async def _clean_and_validate_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and validate data"""
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Handle missing values
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
        
        # Handle categorical missing values
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            df[col] = df[col].fillna('unknown')
        
        # Validate data types
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove rows with all NaN values
        df = df.dropna(how='all')
        
        return df
    
    async def _handle_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect and handle outliers using IQR method"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Cap outliers instead of removing them
            df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
        
        return df
    
    async def _normalize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize numerical data"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_columns) > 0:
            df[numeric_columns] = self.scaler.fit_transform(df[numeric_columns])
        
        return df
    
    async def _calculate_quality_score(self, df: pd.DataFrame) -> float:
        """Calculate data quality score"""
        total_cells = df.size
        missing_cells = df.isnull().sum().sum()
        
        completeness = 1 - (missing_cells / total_cells)
        
        # Additional quality metrics
        uniqueness = df.nunique().mean() / len(df)
        consistency = 1.0  # Placeholder for consistency checks
        
        quality_score = (completeness * 0.5 + uniqueness * 0.3 + consistency * 0.2)
        
        return min(quality_score, 1.0)
    
    async def _generate_metadata(self, df: pd.DataFrame, site_id: str) -> Dict[str, Any]:
        """Generate metadata for processed data"""
        return {
            'site_id': site_id,
            'rows': len(df),
            'columns': len(df.columns),
            'data_types': df.dtypes.to_dict(),
            'missing_values': df.isnull().sum().to_dict(),
            'summary_stats': df.describe().to_dict(),
            'processing_timestamp': datetime.now().isoformat()
        }
    
    async def _extract_journey_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract features for user journey analysis"""
        # Group by user
        user_features = df.groupby('userId').agg({
            'duration': ['mean', 'sum', 'count'],
            'pagesViewed': ['mean', 'sum'],
            'isBounce': 'mean',
            'isWeb3User': 'first'
        }).reset_index()
        
        # Flatten column names
        user_features.columns = ['_'.join(col).strip() if col[1] else col[0] 
                                for col in user_features.columns.values]
        
        return user_features
    
    async def _cluster_user_journeys(self, features: pd.DataFrame) -> Dict[str, Any]:
        """Cluster user journeys using KMeans"""
        # Prepare features for clustering
        numeric_features = features.select_dtypes(include=[np.number])
        
        if len(numeric_features) < 2:
            return {'error': 'Insufficient features for clustering'}
        
        # Determine optimal number of clusters
        optimal_k = await self._find_optimal_clusters(numeric_features)
        
        # Perform clustering
        kmeans = KMeans(n_clusters=optimal_k, random_state=42)
        clusters = kmeans.fit_predict(numeric_features)
        
        # Calculate silhouette score
        silhouette_avg = silhouette_score(numeric_features, clusters)
        
        return {
            'clusters': clusters.tolist(),
            'n_clusters': optimal_k,
            'silhouette_score': silhouette_avg,
            'cluster_centers': kmeans.cluster_centers_.tolist()
        }
    
    async def _find_optimal_clusters(self, features: pd.DataFrame) -> int:
        """Find optimal number of clusters using elbow method"""
        max_k = min(10, len(features) // 2)
        if max_k < 2:
            return 2
        
        inertias = []
        k_range = range(2, max_k + 1)
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42)
            kmeans.fit(features)
            inertias.append(kmeans.inertia_)
        
        # Find elbow point
        if len(inertias) > 2:
            diffs = np.diff(inertias)
            diff2 = np.diff(diffs)
            elbow_idx = np.argmax(diff2) + 2
            return k_range[elbow_idx]
        
        return 3  # Default
    
    async def _analyze_journey_patterns(
        self,
        df: pd.DataFrame,
        clusters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze patterns in user journeys"""
        if 'error' in clusters:
            return clusters
        
        # Add cluster labels to dataframe
        user_clusters = pd.DataFrame({
            'userId': df['userId'].unique(),
            'cluster': clusters['clusters']
        })
        
        df_with_clusters = df.merge(user_clusters, on='userId')
        
        # Analyze patterns by cluster
        patterns = {}
        for cluster_id in range(clusters['n_clusters']):
            cluster_data = df_with_clusters[df_with_clusters['cluster'] == cluster_id]
            
            patterns[f'cluster_{cluster_id}'] = {
                'size': len(cluster_data),
                'avg_duration': cluster_data['duration'].mean(),
                'avg_pages': cluster_data['pagesViewed'].mean(),
                'bounce_rate': cluster_data['isBounce'].mean(),
                'web3_rate': cluster_data['isWeb3User'].mean()
            }
        
        return patterns
    
    async def _generate_journey_insights(self, patterns: Dict[str, Any]) -> List[AnalyticsInsight]:
        """Generate insights from journey patterns"""
        insights = []
        
        for cluster_name, cluster_data in patterns.items():
            if isinstance(cluster_data, dict):
                # High-value user cluster
                if cluster_data['avg_duration'] > 300 and cluster_data['avg_pages'] > 5:
                    insights.append(AnalyticsInsight(
                        type="user_segment",
                        title="High-Engagement User Segment",
                        description=f"Cluster {cluster_name} shows high engagement with {cluster_data['avg_duration']:.1f}s avg duration",
                        value=cluster_data,
                        confidence=0.85,
                        timestamp=datetime.now(),
                        metadata={"cluster": cluster_name}
                    ))
                
                # Web3 conversion opportunity
                if cluster_data['web3_rate'] > 0.5:
                    insights.append(AnalyticsInsight(
                        type="conversion_opportunity",
                        title="Web3 Conversion Opportunity",
                        description=f"Cluster {cluster_name} has {cluster_data['web3_rate']:.1%} Web3 user rate",
                        value=cluster_data['web3_rate'],
                        confidence=0.75,
                        timestamp=datetime.now(),
                        metadata={"cluster": cluster_name}
                    ))
        
        return insights
    
    async def _calculate_feature_importance(self, features: pd.DataFrame) -> Dict[str, float]:
        """Calculate feature importance for journey analysis"""
        numeric_features = features.select_dtypes(include=[np.number])
        
        if len(numeric_features.columns) < 2:
            return {}
        
        # Use PCA to determine feature importance
        pca = PCA()
        pca.fit(numeric_features)
        
        # Calculate feature importance based on first principal component
        feature_importance = {}
        for i, feature in enumerate(numeric_features.columns):
            feature_importance[feature] = abs(pca.components_[0][i])
        
        return feature_importance
    
    async def _detect_trends(self, series: pd.Series) -> Dict[str, Any]:
        """Detect trends in time series data"""
        # Calculate moving averages
        ma_short = series.rolling(window=7).mean()
        ma_long = series.rolling(window=30).mean()
        
        # Determine trend direction
        recent_trend = "increasing" if ma_short.iloc[-1] > ma_long.iloc[-1] else "decreasing"
        
        # Calculate trend strength using linear regression
        x = np.arange(len(series))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, series)
        
        return {
            'direction': recent_trend,
            'slope': slope,
            'strength': abs(r_value),
            'significance': p_value < 0.05,
            'r_squared': r_value ** 2
        }
    
    async def _detect_seasonality(self, series: pd.Series) -> Dict[str, Any]:
        """Detect seasonality patterns"""
        # Simple seasonality detection using autocorrelation
        autocorr_daily = series.autocorr(lag=24) if len(series) > 24 else 0
        autocorr_weekly = series.autocorr(lag=168) if len(series) > 168 else 0
        
        return {
            'daily_pattern': autocorr_daily > 0.3,
            'weekly_pattern': autocorr_weekly > 0.3,
            'daily_strength': autocorr_daily,
            'weekly_strength': autocorr_weekly
        }
    
    async def _detect_anomalies(self, series: pd.Series) -> Dict[str, Any]:
        """Detect anomalies in time series"""
        # Use z-score method for anomaly detection
        z_scores = np.abs(stats.zscore(series))
        threshold = 3
        
        anomalies = series[z_scores > threshold]
        
        return {
            'anomaly_count': len(anomalies),
            'anomaly_dates': anomalies.index.tolist(),
            'anomaly_values': anomalies.values.tolist(),
            'threshold': threshold
        }
    
    async def _forecast_metric(self, series: pd.Series) -> Dict[str, Any]:
        """Simple forecasting using moving average"""
        # Calculate trend and seasonal components
        window = min(30, len(series) // 4)
        if window < 2:
            return {'error': 'Insufficient data for forecasting'}
        
        moving_avg = series.rolling(window=window).mean()
        trend = moving_avg.iloc[-1] - moving_avg.iloc[-window]
        
        # Simple forecast for next 7 days
        last_value = series.iloc[-1]
        forecast_values = []
        
        for i in range(7):
            forecast_value = last_value + (trend * (i + 1))
            forecast_values.append(forecast_value)
        
        return {
            'forecast_values': forecast_values,
            'trend': trend,
            'confidence_interval': [0.8, 1.2]  # Simplified confidence interval
        }
    
    async def _calculate_time_series_stats(self, series: pd.Series) -> Dict[str, Any]:
        """Calculate statistical metrics for time series"""
        return {
            'mean': series.mean(),
            'std': series.std(),
            'min': series.min(),
            'max': series.max(),
            'median': series.median(),
            'skewness': stats.skew(series),
            'kurtosis': stats.kurtosis(series),
            'cv': series.std() / series.mean() if series.mean() != 0 else 0
        }
    
    async def _apply_attribution_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Apply different attribution models"""
        # First-touch attribution
        first_touch = df.groupby('userId').first()['campaign'].value_counts()
        
        # Last-touch attribution
        last_touch = df.groupby('userId').last()['campaign'].value_counts()
        
        # Linear attribution (simplified)
        linear = df['campaign'].value_counts() / df.groupby('userId').size().sum()
        
        return {
            'first_touch': first_touch.to_dict(),
            'last_touch': last_touch.to_dict(),
            'linear': linear.to_dict()
        }
    
    async def _calculate_campaign_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate campaign performance metrics"""
        campaign_metrics = {}
        
        for campaign in df['campaign'].unique():
            campaign_data = df[df['campaign'] == campaign]
            
            campaign_metrics[campaign] = {
                'clicks': len(campaign_data),
                'conversions': campaign_data['converted'].sum() if 'converted' in campaign_data.columns else 0,
                'conversion_rate': campaign_data['converted'].mean() if 'converted' in campaign_data.columns else 0,
                'avg_session_duration': campaign_data['duration'].mean(),
                'bounce_rate': campaign_data['isBounce'].mean()
            }
        
        return campaign_metrics
    
    async def _analyze_conversion_paths(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze conversion paths"""
        # Group by user and analyze path to conversion
        user_paths = df.groupby('userId').agg({
            'campaign': list,
            'converted': 'last'
        }).reset_index()
        
        # Analyze common conversion paths
        conversion_paths = {}
        for _, row in user_paths.iterrows():
            if row['converted']:
                path = ' -> '.join(row['campaign'])
                conversion_paths[path] = conversion_paths.get(path, 0) + 1
        
        return {
            'common_paths': dict(sorted(conversion_paths.items(), key=lambda x: x[1], reverse=True)[:10]),
            'avg_touchpoints': user_paths['campaign'].apply(len).mean()
        }
    
    async def _generate_attribution_insights(
        self,
        attribution_models: Dict[str, Any],
        performance_metrics: Dict[str, Any],
        conversion_paths: Dict[str, Any]
    ) -> List[AnalyticsInsight]:
        """Generate attribution insights"""
        insights = []
        
        # Best performing campaign
        best_campaign = max(performance_metrics.items(), key=lambda x: x[1]['conversion_rate'])
        insights.append(AnalyticsInsight(
            type="campaign_performance",
            title="Best Performing Campaign",
            description=f"Campaign '{best_campaign[0]}' has the highest conversion rate",
            value=best_campaign[1]['conversion_rate'],
            confidence=0.9,
            timestamp=datetime.now(),
            metadata={"campaign": best_campaign[0]}
        ))
        
        return insights
    
    async def _analyze_transaction_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze Web3 transaction patterns"""
        return {
            'total_transactions': len(df),
            'unique_addresses': df['from_address'].nunique(),
            'avg_transaction_value': df['value_eth'].astype(float).mean(),
            'transaction_frequency': df.groupby('from_address').size().describe().to_dict(),
            'peak_hours': df.groupby(df['block_time'].dt.hour).size().idxmax()
        }
    
    async def _analyze_wallet_behaviors(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze wallet behaviors"""
        wallet_stats = df.groupby('from_address').agg({
            'value_eth': ['count', 'sum', 'mean'],
            'gas_used': 'mean',
            'block_time': ['min', 'max']
        }).reset_index()
        
        return {
            'active_wallets': len(wallet_stats),
            'whale_wallets': len(wallet_stats[wallet_stats[('value_eth', 'sum')] > 10]),
            'frequent_traders': len(wallet_stats[wallet_stats[('value_eth', 'count')] > 10])
        }
    
    async def _segment_web3_users(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Segment Web3 users based on behavior"""
        # Create user features
        user_features = df.groupby('from_address').agg({
            'value_eth': ['count', 'sum', 'mean'],
            'gas_used': 'mean'
        }).reset_index()
        
        # Flatten column names
        user_features.columns = ['_'.join(col).strip() if col[1] else col[0] 
                                for col in user_features.columns.values]
        
        # Simple segmentation based on transaction value and frequency
        segments = {}
        for _, user in user_features.iterrows():
            if user['value_eth_sum'] > 10 and user['value_eth_count'] > 10:
                segment = 'whale_active'
            elif user['value_eth_sum'] > 10:
                segment = 'whale_passive'
            elif user['value_eth_count'] > 10:
                segment = 'frequent_small'
            else:
                segment = 'casual'
            
            segments[segment] = segments.get(segment, 0) + 1
        
        return segments
    
    async def _calculate_web3_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate Web3-specific metrics"""
        return {
            'total_volume': df['value_eth'].astype(float).sum(),
            'avg_gas_price': df['gas_used'].mean(),
            'transaction_success_rate': (df['status'] == 'success').mean() if 'status' in df.columns else 1.0,
            'unique_contracts': df['contract_address'].nunique(),
            'daily_active_wallets': df.groupby(df['block_time'].dt.date)['from_address'].nunique().mean()
        }
    
    async def _generate_web3_insights(
        self,
        tx_patterns: Dict[str, Any],
        wallet_behaviors: Dict[str, Any],
        user_segments: Dict[str, Any],
        web3_metrics: Dict[str, Any]
    ) -> List[AnalyticsInsight]:
        """Generate Web3-specific insights"""
        insights = []
        
        # High-value transaction insight
        if web3_metrics['total_volume'] > 1000:
            insights.append(AnalyticsInsight(
                type="web3_volume",
                title="High Transaction Volume",
                description=f"Total transaction volume: {web3_metrics['total_volume']:.2f} ETH",
                value=web3_metrics['total_volume'],
                confidence=0.95,
                timestamp=datetime.now(),
                metadata={"metric": "total_volume"}
            ))
        
        # Whale activity insight
        if wallet_behaviors['whale_wallets'] > 0:
            insights.append(AnalyticsInsight(
                type="whale_activity",
                title="Whale Activity Detected",
                description=f"{wallet_behaviors['whale_wallets']} whale wallets detected",
                value=wallet_behaviors['whale_wallets'],
                confidence=0.9,
                timestamp=datetime.now(),
                metadata={"whales": wallet_behaviors['whale_wallets']}
            ))
        
        return insights 