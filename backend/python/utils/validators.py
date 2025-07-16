"""
Data validation utilities for Cryptique Python services
"""

import re
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import pandas as pd
import numpy as np
from cerberus import Validator
from marshmallow import Schema, fields, validate, ValidationError

from .logger import get_logger

logger = get_logger(__name__)

class DataValidator:
    """
    Comprehensive data validator for analytics data
    """
    
    def __init__(self):
        self.validator = Validator()
        self.schemas = self._initialize_schemas()
    
    def _initialize_schemas(self) -> Dict[str, Dict]:
        """Initialize validation schemas"""
        return {
            'analytics': {
                'siteId': {'type': 'string', 'required': True, 'minlength': 1},
                'totalVisitors': {'type': 'integer', 'min': 0},
                'uniqueVisitors': {'type': 'integer', 'min': 0},
                'web3Visitors': {'type': 'integer', 'min': 0},
                'walletsConnected': {'type': 'integer', 'min': 0},
                'totalPageViews': {'type': 'integer', 'min': 0},
                'pageViews': {'type': 'dict'},
                'sessions': {'type': 'list'},
                'userJourneys': {'type': 'list'}
            },
            'session': {
                'sessionId': {'type': 'string', 'required': True},
                'userId': {'type': 'string', 'required': True},
                'siteId': {'type': 'string', 'required': True},
                'duration': {'type': 'integer', 'min': 0},
                'pagesViewed': {'type': 'integer', 'min': 0},
                'isBounce': {'type': 'boolean'},
                'isWeb3User': {'type': 'boolean'},
                'startTime': {'type': 'datetime'},
                'endTime': {'type': 'datetime', 'nullable': True}
            },
            'transaction': {
                'tx_hash': {'type': 'string', 'required': True},
                'contractId': {'type': 'string', 'required': True},
                'from_address': {'type': 'string', 'required': True},
                'to_address': {'type': 'string', 'required': True},
                'value_eth': {'type': 'string'},
                'gas_used': {'type': 'integer', 'min': 0},
                'block_number': {'type': 'integer', 'min': 0},
                'block_time': {'type': 'datetime'},
                'status': {'type': 'string', 'allowed': ['success', 'failed', 'pending']}
            },
            'campaign': {
                'siteId': {'type': 'string', 'required': True},
                'name': {'type': 'string', 'required': True},
                'source': {'type': 'string', 'required': True},
                'medium': {'type': 'string', 'required': True},
                'campaign': {'type': 'string'},
                'stats': {'type': 'dict'}
            }
        }
    
    def validate_document(self, document: Dict[str, Any], schema_name: str) -> Dict[str, Any]:
        """
        Validate a single document against a schema
        
        Args:
            document: Document to validate
            schema_name: Name of the schema to use
            
        Returns:
            Validation result with errors if any
        """
        try:
            if schema_name not in self.schemas:
                return {
                    'valid': False,
                    'errors': [f'Unknown schema: {schema_name}']
                }
            
            schema = self.schemas[schema_name]
            is_valid = self.validator.validate(document, schema)
            
            return {
                'valid': is_valid,
                'errors': list(self.validator.errors.keys()) if not is_valid else [],
                'error_details': self.validator.errors if not is_valid else {}
            }
            
        except Exception as e:
            logger.error(f"Error validating document: {e}")
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    def validate_dataframe(self, df: pd.DataFrame, schema_name: str) -> Dict[str, Any]:
        """
        Validate a pandas DataFrame
        
        Args:
            df: DataFrame to validate
            schema_name: Name of the schema to use
            
        Returns:
            Validation result with statistics
        """
        try:
            if df.empty:
                return {
                    'valid': False,
                    'errors': ['DataFrame is empty'],
                    'statistics': {}
                }
            
            # Convert DataFrame to list of dictionaries
            records = df.to_dict('records')
            
            # Validate each record
            validation_results = []
            for i, record in enumerate(records):
                result = self.validate_document(record, schema_name)
                if not result['valid']:
                    validation_results.append({
                        'row': i,
                        'errors': result['errors']
                    })
            
            # Calculate statistics
            total_records = len(records)
            invalid_records = len(validation_results)
            valid_records = total_records - invalid_records
            
            statistics = {
                'total_records': total_records,
                'valid_records': valid_records,
                'invalid_records': invalid_records,
                'validity_rate': valid_records / total_records if total_records > 0 else 0,
                'missing_values': df.isnull().sum().to_dict(),
                'data_types': df.dtypes.to_dict()
            }
            
            return {
                'valid': invalid_records == 0,
                'errors': validation_results,
                'statistics': statistics
            }
            
        except Exception as e:
            logger.error(f"Error validating DataFrame: {e}")
            return {
                'valid': False,
                'errors': [str(e)],
                'statistics': {}
            }
    
    def validate_embedding(self, embedding: Union[List[float], np.ndarray], expected_dim: int = 1536) -> Dict[str, Any]:
        """
        Validate an embedding vector
        
        Args:
            embedding: Embedding vector to validate
            expected_dim: Expected number of dimensions
            
        Returns:
            Validation result
        """
        try:
            # Convert to numpy array if needed
            if isinstance(embedding, list):
                embedding = np.array(embedding)
            
            # Check if it's a numpy array
            if not isinstance(embedding, np.ndarray):
                return {
                    'valid': False,
                    'errors': ['Embedding must be a list or numpy array']
                }
            
            # Check dimensions
            if len(embedding.shape) != 1:
                return {
                    'valid': False,
                    'errors': ['Embedding must be a 1D array']
                }
            
            if embedding.shape[0] != expected_dim:
                return {
                    'valid': False,
                    'errors': [f'Embedding must have {expected_dim} dimensions, got {embedding.shape[0]}']
                }
            
            # Check for NaN or infinite values
            if np.any(np.isnan(embedding)):
                return {
                    'valid': False,
                    'errors': ['Embedding contains NaN values']
                }
            
            if np.any(np.isinf(embedding)):
                return {
                    'valid': False,
                    'errors': ['Embedding contains infinite values']
                }
            
            # Check magnitude
            magnitude = np.linalg.norm(embedding)
            if magnitude == 0:
                return {
                    'valid': False,
                    'errors': ['Embedding has zero magnitude']
                }
            
            return {
                'valid': True,
                'errors': [],
                'statistics': {
                    'dimensions': embedding.shape[0],
                    'magnitude': magnitude,
                    'mean': np.mean(embedding),
                    'std': np.std(embedding),
                    'min': np.min(embedding),
                    'max': np.max(embedding)
                }
            }
            
        except Exception as e:
            logger.error(f"Error validating embedding: {e}")
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    def validate_site_id(self, site_id: str) -> bool:
        """Validate site ID format"""
        if not isinstance(site_id, str):
            return False
        if len(site_id) < 1 or len(site_id) > 100:
            return False
        # Allow alphanumeric, hyphens, and underscores
        return re.match(r'^[a-zA-Z0-9_-]+$', site_id) is not None
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        if not isinstance(email, str):
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_wallet_address(self, address: str) -> bool:
        """Validate Ethereum wallet address format"""
        if not isinstance(address, str):
            return False
        # Ethereum address pattern (42 characters starting with 0x)
        pattern = r'^0x[a-fA-F0-9]{40}$'
        return re.match(pattern, address) is not None
    
    def validate_transaction_hash(self, tx_hash: str) -> bool:
        """Validate transaction hash format"""
        if not isinstance(tx_hash, str):
            return False
        # Transaction hash pattern (66 characters starting with 0x)
        pattern = r'^0x[a-fA-F0-9]{64}$'
        return re.match(pattern, tx_hash) is not None
    
    def validate_date_range(self, start_date: datetime, end_date: datetime) -> bool:
        """Validate date range"""
        if not isinstance(start_date, datetime) or not isinstance(end_date, datetime):
            return False
        return start_date <= end_date
    
    def validate_numeric_range(self, value: Union[int, float], min_val: Optional[float] = None, max_val: Optional[float] = None) -> bool:
        """Validate numeric value within range"""
        if not isinstance(value, (int, float)):
            return False
        if min_val is not None and value < min_val:
            return False
        if max_val is not None and value > max_val:
            return False
        return True
    
    def validate_batch_size(self, batch_size: int) -> bool:
        """Validate batch size"""
        return isinstance(batch_size, int) and 1 <= batch_size <= 10000
    
    def validate_time_window(self, time_window: int) -> bool:
        """Validate time window in days"""
        return isinstance(time_window, int) and 1 <= time_window <= 365
    
    def validate_probability(self, probability: float) -> bool:
        """Validate probability value"""
        return isinstance(probability, (int, float)) and 0.0 <= probability <= 1.0
    
    def validate_confidence_score(self, confidence: float) -> bool:
        """Validate confidence score"""
        return isinstance(confidence, (int, float)) and 0.0 <= confidence <= 1.0
    
    def sanitize_text(self, text: str) -> str:
        """Sanitize text input"""
        if not isinstance(text, str):
            return ""
        
        # Remove control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        # Limit length
        if len(text) > 10000:
            text = text[:10000]
        
        return text.strip()
    
    def validate_json_structure(self, data: Any, required_keys: List[str]) -> Dict[str, Any]:
        """Validate JSON structure has required keys"""
        try:
            if not isinstance(data, dict):
                return {
                    'valid': False,
                    'errors': ['Data must be a dictionary']
                }
            
            missing_keys = [key for key in required_keys if key not in data]
            
            if missing_keys:
                return {
                    'valid': False,
                    'errors': [f'Missing required keys: {missing_keys}']
                }
            
            return {
                'valid': True,
                'errors': []
            }
            
        except Exception as e:
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    def validate_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Comprehensive data quality assessment
        
        Args:
            df: DataFrame to assess
            
        Returns:
            Data quality metrics
        """
        try:
            if df.empty:
                return {
                    'quality_score': 0.0,
                    'issues': ['DataFrame is empty'],
                    'metrics': {}
                }
            
            metrics = {}
            issues = []
            
            # Completeness
            total_cells = df.size
            missing_cells = df.isnull().sum().sum()
            completeness = 1 - (missing_cells / total_cells) if total_cells > 0 else 0
            metrics['completeness'] = completeness
            
            if completeness < 0.8:
                issues.append(f'Low completeness: {completeness:.1%}')
            
            # Uniqueness
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                uniqueness = df[numeric_cols].nunique().mean() / len(df)
                metrics['uniqueness'] = uniqueness
                
                if uniqueness < 0.1:
                    issues.append(f'Low uniqueness: {uniqueness:.1%}')
            
            # Consistency (check for outliers)
            outlier_ratio = 0
            for col in numeric_cols:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                
                if IQR > 0:
                    outliers = df[(df[col] < Q1 - 1.5 * IQR) | (df[col] > Q3 + 1.5 * IQR)]
                    outlier_ratio += len(outliers) / len(df)
            
            if len(numeric_cols) > 0:
                outlier_ratio /= len(numeric_cols)
                metrics['consistency'] = 1 - outlier_ratio
                
                if outlier_ratio > 0.1:
                    issues.append(f'High outlier ratio: {outlier_ratio:.1%}')
            
            # Validity (check data types)
            validity_issues = 0
            for col in df.columns:
                if col.endswith('_id') or col.endswith('Id'):
                    # ID columns should not have nulls
                    if df[col].isnull().sum() > 0:
                        validity_issues += 1
                        issues.append(f'ID column {col} has null values')
                
                if 'email' in col.lower():
                    # Email columns should have valid emails
                    invalid_emails = df[col].dropna().apply(
                        lambda x: not self.validate_email(str(x))
                    ).sum()
                    if invalid_emails > 0:
                        validity_issues += 1
                        issues.append(f'Column {col} has {invalid_emails} invalid emails')
            
            validity = 1 - (validity_issues / len(df.columns)) if len(df.columns) > 0 else 1
            metrics['validity'] = validity
            
            # Calculate overall quality score
            quality_score = (
                completeness * 0.4 +
                metrics.get('uniqueness', 1.0) * 0.2 +
                metrics.get('consistency', 1.0) * 0.2 +
                validity * 0.2
            )
            
            return {
                'quality_score': quality_score,
                'issues': issues,
                'metrics': metrics,
                'recommendations': self._generate_quality_recommendations(metrics, issues)
            }
            
        except Exception as e:
            logger.error(f"Error assessing data quality: {e}")
            return {
                'quality_score': 0.0,
                'issues': [str(e)],
                'metrics': {}
            }
    
    def _generate_quality_recommendations(self, metrics: Dict[str, float], issues: List[str]) -> List[str]:
        """Generate recommendations based on quality metrics"""
        recommendations = []
        
        if metrics.get('completeness', 1.0) < 0.8:
            recommendations.append("Consider data imputation or collection improvement to increase completeness")
        
        if metrics.get('uniqueness', 1.0) < 0.1:
            recommendations.append("Check for duplicate records or consider data deduplication")
        
        if metrics.get('consistency', 1.0) < 0.8:
            recommendations.append("Investigate outliers and consider data cleaning or transformation")
        
        if metrics.get('validity', 1.0) < 0.9:
            recommendations.append("Implement data validation at the source to improve validity")
        
        if not recommendations:
            recommendations.append("Data quality is good, continue monitoring")
        
        return recommendations

# Marshmallow schemas for API validation

class EmbeddingRequestSchema(Schema):
    """Schema for embedding generation requests"""
    text = fields.Str(required=True, validate=validate.Length(min=1, max=10000))
    model = fields.Str(required=False, validate=validate.OneOf(['gemini', 'openai', 'sentence_transformer']))
    context = fields.Dict(required=False)
    use_cache = fields.Bool(required=False, default=True)

class BatchEmbeddingRequestSchema(Schema):
    """Schema for batch embedding requests"""
    texts = fields.List(fields.Str(), required=True, validate=validate.Length(min=1, max=1000))
    model = fields.Str(required=False, validate=validate.OneOf(['gemini', 'openai', 'sentence_transformer']))
    batch_size = fields.Int(required=False, validate=validate.Range(min=1, max=100))
    use_cache = fields.Bool(required=False, default=True)

class ProcessAnalyticsRequestSchema(Schema):
    """Schema for analytics processing requests"""
    site_id = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    start_date = fields.DateTime(required=False)
    end_date = fields.DateTime(required=False)
    data_types = fields.List(fields.Str(), required=False)

class PredictionRequestSchema(Schema):
    """Schema for ML prediction requests"""
    site_id = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    prediction_type = fields.Str(required=True, validate=validate.OneOf(['churn', 'conversion', 'ltv']))
    time_window = fields.Int(required=False, validate=validate.Range(min=1, max=365), default=30)
    retrain_model = fields.Bool(required=False, default=False)

# Global validator instance
data_validator = DataValidator()

# Convenience functions
def validate_request(data: Dict[str, Any], schema: Schema) -> Dict[str, Any]:
    """Validate request data against schema"""
    try:
        result = schema.load(data)
        return {'valid': True, 'data': result, 'errors': []}
    except ValidationError as e:
        return {'valid': False, 'data': None, 'errors': e.messages}

def get_validator() -> DataValidator:
    """Get global validator instance"""
    return data_validator 