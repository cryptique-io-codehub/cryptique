"""
Configuration module for Cryptique Python Data Processing Services
"""

import os
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConfig(BaseSettings):
    """Database configuration settings"""
    
    # MongoDB settings
    mongodb_uri: str = Field(
        default="mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server",
        env="MONGODB_URI"
    )
    database_name: str = Field(default="Cryptique-Test-Server", env="DATABASE_NAME")
    
    # Vector database settings
    vector_collection: str = Field(default="vectordocuments", env="VECTOR_COLLECTION")
    vector_index_name: str = Field(default="vector_index", env="VECTOR_INDEX_NAME")
    
    # Connection settings
    max_pool_size: int = Field(default=50, env="DB_MAX_POOL_SIZE")
    min_pool_size: int = Field(default=5, env="DB_MIN_POOL_SIZE")
    connect_timeout: int = Field(default=10000, env="DB_CONNECT_TIMEOUT")
    
    class Config:
        env_file = ".env"

class AIConfig(BaseSettings):
    """AI/ML configuration settings"""
    
    # Gemini API settings
    gemini_api_key: str = Field(
        default="AIzaSyCGeKpBs18-Ie7uAIYEiT3Yyop6Jd9HBo0",
        env="GEMINI_API_KEY"
    )
    gemini_model: str = Field(default="text-embedding-004", env="GEMINI_MODEL")
    
    # OpenAI settings (optional)
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="text-embedding-3-large", env="OPENAI_MODEL")
    
    # Embedding settings
    embedding_dimensions: int = Field(default=1536, env="EMBEDDING_DIMENSIONS")
    batch_size: int = Field(default=100, env="EMBEDDING_BATCH_SIZE")
    max_retries: int = Field(default=3, env="EMBEDDING_MAX_RETRIES")
    rate_limit_delay: float = Field(default=1.0, env="RATE_LIMIT_DELAY")
    
    # Local model settings
    use_local_models: bool = Field(default=False, env="USE_LOCAL_MODELS")
    local_model_path: str = Field(default="./models", env="LOCAL_MODEL_PATH")
    
    class Config:
        env_file = ".env"

class ProcessingConfig(BaseSettings):
    """Data processing configuration settings"""
    
    # Batch processing
    batch_size: int = Field(default=1000, env="PROCESSING_BATCH_SIZE")
    max_workers: int = Field(default=4, env="MAX_WORKERS")
    chunk_size: int = Field(default=1000, env="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, env="CHUNK_OVERLAP")
    
    # Data validation
    validation_threshold: float = Field(default=0.8, env="VALIDATION_THRESHOLD")
    outlier_detection: bool = Field(default=True, env="OUTLIER_DETECTION")
    outlier_threshold: float = Field(default=2.0, env="OUTLIER_THRESHOLD")
    
    # Time series analysis
    time_series_window: int = Field(default=30, env="TIME_SERIES_WINDOW")
    seasonality_detection: bool = Field(default=True, env="SEASONALITY_DETECTION")
    
    # ML settings
    random_state: int = Field(default=42, env="RANDOM_STATE")
    test_size: float = Field(default=0.2, env="TEST_SIZE")
    cross_validation_folds: int = Field(default=5, env="CV_FOLDS")
    
    class Config:
        env_file = ".env"

class ServiceConfig(BaseSettings):
    """Service configuration settings"""
    
    # API settings
    host: str = Field(default="0.0.0.0", env="SERVICE_HOST")
    port: int = Field(default=8000, env="SERVICE_PORT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="logs/service.log", env="LOG_FILE")
    
    # Performance
    max_concurrent_requests: int = Field(default=100, env="MAX_CONCURRENT_REQUESTS")
    request_timeout: int = Field(default=300, env="REQUEST_TIMEOUT")
    
    # Monitoring
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=8001, env="METRICS_PORT")
    
    class Config:
        env_file = ".env"

class RedisConfig(BaseSettings):
    """Redis configuration for caching and task queues"""
    
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_db: int = Field(default=0, env="REDIS_DB")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Cache settings
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    max_cache_size: int = Field(default=10000, env="MAX_CACHE_SIZE")
    
    class Config:
        env_file = ".env"

class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.ai = AIConfig()
        self.processing = ProcessingConfig()
        self.service = ServiceConfig()
        self.redis = RedisConfig()
    
    def get_mongodb_config(self) -> Dict[str, Any]:
        """Get MongoDB connection configuration"""
        return {
            "host": self.database.mongodb_uri,
            "maxPoolSize": self.database.max_pool_size,
            "minPoolSize": self.database.min_pool_size,
            "connectTimeoutMS": self.database.connect_timeout,
            "serverSelectionTimeoutMS": 5000,
            "socketTimeoutMS": 45000,
        }
    
    def get_embedding_config(self) -> Dict[str, Any]:
        """Get embedding generation configuration"""
        return {
            "gemini_api_key": self.ai.gemini_api_key,
            "gemini_model": self.ai.gemini_model,
            "openai_api_key": self.ai.openai_api_key,
            "openai_model": self.ai.openai_model,
            "dimensions": self.ai.embedding_dimensions,
            "batch_size": self.ai.batch_size,
            "max_retries": self.ai.max_retries,
            "rate_limit_delay": self.ai.rate_limit_delay,
        }
    
    def get_processing_config(self) -> Dict[str, Any]:
        """Get data processing configuration"""
        return {
            "batch_size": self.processing.batch_size,
            "max_workers": self.processing.max_workers,
            "chunk_size": self.processing.chunk_size,
            "chunk_overlap": self.processing.chunk_overlap,
            "validation_threshold": self.processing.validation_threshold,
            "outlier_detection": self.processing.outlier_detection,
            "outlier_threshold": self.processing.outlier_threshold,
            "random_state": self.processing.random_state,
        }

# Global configuration instance
config = Config()

# Environment-specific configurations
ENVIRONMENTS = {
    "development": {
        "debug": True,
        "log_level": "DEBUG",
        "enable_metrics": True,
    },
    "staging": {
        "debug": False,
        "log_level": "INFO",
        "enable_metrics": True,
    },
    "production": {
        "debug": False,
        "log_level": "WARNING",
        "enable_metrics": True,
    }
}

def get_environment_config() -> Dict[str, Any]:
    """Get environment-specific configuration"""
    env = os.getenv("ENVIRONMENT", "development")
    return ENVIRONMENTS.get(env, ENVIRONMENTS["development"]) 