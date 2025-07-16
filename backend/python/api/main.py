"""
FastAPI Service for Cryptique Python Data Processing
Provides REST API endpoints for Node.js integration
"""

import asyncio
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

from config import config
from utils.logger import setup_logger, get_logger
from utils.database import get_db, close_db
from services.data_processor import DataProcessor
from services.embedding_generator import EmbeddingGenerator, EmbeddingModel
from services.vector_migrator import VectorMigrator, MigrationConfig, DataSource
from services.analytics_ml import AnalyticsMLService, PredictionType

# Setup logging
setup_logger(
    log_level=config.service.log_level,
    log_file=config.service.log_file,
    service_name="cryptique-python-api"
)

logger = get_logger(__name__)

# Global service instances
data_processor = DataProcessor()
embedding_generator = EmbeddingGenerator()
analytics_ml_service = AnalyticsMLService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Cryptique Python API service")
    
    # Initialize services
    await data_processor.initialize()
    await embedding_generator.initialize()
    await analytics_ml_service.initialize()
    
    logger.info("All services initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Cryptique Python API service")
    await close_db()

# Create FastAPI app
app = FastAPI(
    title="Cryptique Python Data Processing API",
    description="Advanced analytics data processing and ML services for Cryptique",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response

class ProcessAnalyticsRequest(BaseModel):
    site_id: str = Field(..., description="Site identifier")
    start_date: Optional[datetime] = Field(None, description="Start date for processing")
    end_date: Optional[datetime] = Field(None, description="End date for processing")
    data_types: Optional[List[str]] = Field(None, description="Types of data to process")

class ProcessAnalyticsResponse(BaseModel):
    success: bool
    data_summary: Optional[Dict[str, Any]] = None
    quality_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None

class GenerateEmbeddingRequest(BaseModel):
    text: str = Field(..., description="Text to embed")
    model: str = Field(default="gemini", description="Embedding model to use")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    use_cache: bool = Field(default=True, description="Whether to use cache")

class GenerateEmbeddingResponse(BaseModel):
    success: bool
    embedding: Optional[List[float]] = None
    dimensions: Optional[int] = None
    model_used: Optional[str] = None
    quality_score: Optional[float] = None
    processing_time: Optional[float] = None
    error: Optional[str] = None

class BatchEmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to embed")
    model: str = Field(default="gemini", description="Embedding model to use")
    batch_size: Optional[int] = Field(None, description="Batch size for processing")
    use_cache: bool = Field(default=True, description="Whether to use cache")

class BatchEmbeddingResponse(BaseModel):
    success: bool
    embeddings: Optional[List[Optional[List[float]]]] = None
    total_processed: int
    successful_count: int
    failed_count: int
    processing_time: Optional[float] = None
    errors: Optional[List[str]] = None

class MigrationRequest(BaseModel):
    site_ids: Optional[List[str]] = Field(None, description="Site IDs to migrate")
    team_ids: Optional[List[str]] = Field(None, description="Team IDs to migrate")
    source_types: List[str] = Field(..., description="Data source types to migrate")
    batch_size: int = Field(default=100, description="Batch size for migration")
    embedding_model: str = Field(default="gemini", description="Embedding model to use")
    start_date: Optional[datetime] = Field(None, description="Start date for migration")
    end_date: Optional[datetime] = Field(None, description="End date for migration")

class MigrationResponse(BaseModel):
    success: bool
    progress: Dict[str, Any]
    processing_time: float
    metadata: Dict[str, Any]
    checkpoint_data: Optional[Dict[str, Any]] = None

class PredictionRequest(BaseModel):
    site_id: str = Field(..., description="Site identifier")
    prediction_type: str = Field(..., description="Type of prediction")
    time_window: int = Field(default=30, description="Time window in days")
    retrain_model: bool = Field(default=False, description="Whether to retrain model")

class PredictionResponse(BaseModel):
    success: bool
    prediction_type: str
    predictions: Optional[List[float]] = None
    probabilities: Optional[List[float]] = None
    feature_importance: Optional[Dict[str, float]] = None
    model_metrics: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Cryptique Python Data Processing API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db = await get_db()
        
        # Check services
        services_status = {
            "data_processor": data_processor.db is not None,
            "embedding_generator": embedding_generator.db is not None,
            "analytics_ml": analytics_ml_service.db is not None,
            "database": db.is_connected
        }
        
        all_healthy = all(services_status.values())
        
        return {
            "status": "healthy" if all_healthy else "unhealthy",
            "services": services_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# Data Processing Endpoints

@app.post("/api/process/analytics", response_model=ProcessAnalyticsResponse)
async def process_analytics_data(request: ProcessAnalyticsRequest):
    """Process analytics data for a site"""
    try:
        logger.info(f"Processing analytics data for site: {request.site_id}")
        
        result = await data_processor.process_analytics_data(
            site_id=request.site_id,
            start_date=request.start_date,
            end_date=request.end_date,
            data_types=request.data_types
        )
        
        if result.success:
            return ProcessAnalyticsResponse(
                success=True,
                data_summary={
                    "rows": len(result.data) if result.data is not None else 0,
                    "columns": len(result.data.columns) if result.data is not None else 0
                },
                quality_score=result.quality_score,
                metadata=result.metadata,
                errors=result.errors
            )
        else:
            return ProcessAnalyticsResponse(
                success=False,
                errors=result.errors
            )
            
    except Exception as e:
        logger.error(f"Error processing analytics data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process/user-journeys")
async def analyze_user_journeys(
    site_id: str = Query(..., description="Site identifier"),
    time_window: int = Query(default=30, description="Time window in days")
):
    """Analyze user journeys for a site"""
    try:
        logger.info(f"Analyzing user journeys for site: {site_id}")
        
        result = await data_processor.analyze_user_journeys(
            site_id=site_id,
            time_window=time_window
        )
        
        if result.success:
            return {
                "success": True,
                "clusters": result.metadata.get('clusters', {}),
                "patterns": result.metadata.get('patterns', {}),
                "insights": result.metadata.get('insights', []),
                "feature_importance": result.metadata.get('feature_importance', {})
            }
        else:
            return {
                "success": False,
                "errors": result.errors
            }
            
    except Exception as e:
        logger.error(f"Error analyzing user journeys: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process/time-series")
async def analyze_time_series(
    site_id: str = Query(..., description="Site identifier"),
    metric: str = Query(..., description="Metric to analyze"),
    time_window: int = Query(default=90, description="Time window in days")
):
    """Analyze time series data for a metric"""
    try:
        logger.info(f"Analyzing time series for metric {metric} on site: {site_id}")
        
        result = await data_processor.perform_time_series_analysis(
            site_id=site_id,
            metric=metric,
            time_window=time_window
        )
        
        if result.success:
            return {
                "success": True,
                "trends": result.metadata.get('trends', {}),
                "seasonality": result.metadata.get('seasonality', {}),
                "anomalies": result.metadata.get('anomalies', {}),
                "forecast": result.metadata.get('forecast', {}),
                "statistics": result.metadata.get('statistics', {})
            }
        else:
            return {
                "success": False,
                "errors": result.errors
            }
            
    except Exception as e:
        logger.error(f"Error analyzing time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process/web3-patterns")
async def analyze_web3_patterns(
    site_id: str = Query(..., description="Site identifier"),
    time_window: int = Query(default=30, description="Time window in days")
):
    """Analyze Web3 transaction patterns"""
    try:
        logger.info(f"Analyzing Web3 patterns for site: {site_id}")
        
        result = await data_processor.analyze_web3_patterns(
            site_id=site_id,
            time_window=time_window
        )
        
        if result.success:
            return {
                "success": True,
                "transaction_patterns": result.metadata.get('transaction_patterns', {}),
                "wallet_behaviors": result.metadata.get('wallet_behaviors', {}),
                "user_segments": result.metadata.get('user_segments', {}),
                "web3_metrics": result.metadata.get('web3_metrics', {}),
                "insights": result.metadata.get('insights', [])
            }
        else:
            return {
                "success": False,
                "errors": result.errors
            }
            
    except Exception as e:
        logger.error(f"Error analyzing Web3 patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Embedding Generation Endpoints

@app.post("/api/embeddings/generate", response_model=GenerateEmbeddingResponse)
async def generate_embedding(request: GenerateEmbeddingRequest):
    """Generate embedding for a single text"""
    try:
        logger.info(f"Generating embedding for text (length: {len(request.text)})")
        
        # Convert model string to enum
        model_enum = getattr(EmbeddingModel, request.model.upper(), EmbeddingModel.GEMINI)
        
        result = await embedding_generator.generate_embedding(
            text=request.text,
            model=model_enum,
            context=request.context,
            use_cache=request.use_cache
        )
        
        if result.success:
            return GenerateEmbeddingResponse(
                success=True,
                embedding=result.embedding.tolist(),
                dimensions=result.dimensions,
                model_used=result.model_used,
                quality_score=result.quality_score,
                processing_time=result.processing_time
            )
        else:
            return GenerateEmbeddingResponse(
                success=False,
                error=result.error
            )
            
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embeddings/batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(request: BatchEmbeddingRequest):
    """Generate embeddings for multiple texts"""
    try:
        logger.info(f"Generating batch embeddings for {len(request.texts)} texts")
        
        # Convert model string to enum
        model_enum = getattr(EmbeddingModel, request.model.upper(), EmbeddingModel.GEMINI)
        
        result = await embedding_generator.generate_batch_embeddings(
            texts=request.texts,
            model=model_enum,
            batch_size=request.batch_size,
            use_cache=request.use_cache
        )
        
        if result.success:
            # Convert embeddings to lists
            embeddings_list = []
            for emb in result.embeddings:
                if emb is not None:
                    embeddings_list.append(emb.tolist())
                else:
                    embeddings_list.append(None)
            
            return BatchEmbeddingResponse(
                success=True,
                embeddings=embeddings_list,
                total_processed=result.total_processed,
                successful_count=result.metadata.get('successful_count', 0),
                failed_count=result.metadata.get('failed_count', 0),
                processing_time=result.processing_time,
                errors=result.errors
            )
        else:
            return BatchEmbeddingResponse(
                success=False,
                total_processed=result.total_processed,
                successful_count=0,
                failed_count=result.total_processed,
                errors=result.errors
            )
            
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embeddings/similarity")
async def calculate_similarity(
    embedding1: List[float],
    embedding2: List[float],
    method: str = Query(default="cosine", description="Similarity method")
):
    """Calculate similarity between two embeddings"""
    try:
        import numpy as np
        
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        similarity = await embedding_generator.calculate_similarity(
            emb1, emb2, method
        )
        
        return {
            "success": True,
            "similarity": similarity,
            "method": method
        }
        
    except Exception as e:
        logger.error(f"Error calculating similarity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Migration Endpoints

@app.post("/api/migration/start", response_model=MigrationResponse)
async def start_migration(request: MigrationRequest, background_tasks: BackgroundTasks):
    """Start data migration process"""
    try:
        logger.info(f"Starting migration for sources: {request.source_types}")
        
        # Create migration config
        migration_config = MigrationConfig(
            source_types=[DataSource(source) for source in request.source_types],
            batch_size=request.batch_size,
            embedding_model=getattr(EmbeddingModel, request.embedding_model.upper(), EmbeddingModel.GEMINI)
        )
        
        # Create migrator
        migrator = VectorMigrator(migration_config)
        await migrator.initialize()
        
        # Start migration in background
        background_tasks.add_task(
            migrator.migrate_all_data,
            request.site_ids,
            request.team_ids,
            request.start_date,
            request.end_date
        )
        
        return MigrationResponse(
            success=True,
            progress={
                "status": "started",
                "total_records": 0,
                "processed_records": 0
            },
            processing_time=0.0,
            metadata={
                "migration_id": f"migration_{int(time.time())}",
                "source_types": request.source_types,
                "batch_size": request.batch_size
            }
        )
        
    except Exception as e:
        logger.error(f"Error starting migration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/migration/status")
async def get_migration_status():
    """Get migration status"""
    try:
        # This would typically track active migrations
        # For now, return a placeholder response
        return {
            "success": True,
            "status": "no_active_migration",
            "progress": {
                "total_records": 0,
                "processed_records": 0,
                "percentage_complete": 0.0
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting migration status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/migration/validate")
async def validate_migration(sample_size: int = Query(default=100, description="Sample size for validation")):
    """Validate migration results"""
    try:
        logger.info(f"Validating migration with sample size: {sample_size}")
        
        # Create temporary migrator for validation
        migrator = VectorMigrator()
        await migrator.initialize()
        
        validation_results = await migrator.validate_migration(sample_size)
        
        return {
            "success": True,
            "validation_results": validation_results
        }
        
    except Exception as e:
        logger.error(f"Error validating migration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ML Prediction Endpoints

@app.post("/api/ml/predict", response_model=PredictionResponse)
async def make_prediction(request: PredictionRequest):
    """Make ML predictions"""
    try:
        logger.info(f"Making {request.prediction_type} prediction for site: {request.site_id}")
        
        # Route to appropriate prediction method
        if request.prediction_type == "churn":
            result = await analytics_ml_service.predict_user_churn(
                site_id=request.site_id,
                time_window=request.time_window,
                retrain_model=request.retrain_model
            )
        elif request.prediction_type == "conversion":
            result = await analytics_ml_service.predict_conversion_probability(
                site_id=request.site_id,
                time_window=request.time_window,
                retrain_model=request.retrain_model
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported prediction type: {request.prediction_type}")
        
        if result.success:
            return PredictionResponse(
                success=True,
                prediction_type=result.prediction_type,
                predictions=result.predictions.tolist() if result.predictions is not None else None,
                probabilities=result.probabilities.tolist() if result.probabilities is not None else None,
                feature_importance=result.feature_importance,
                model_metrics=result.model_metrics,
                metadata=result.metadata
            )
        else:
            return PredictionResponse(
                success=False,
                prediction_type=result.prediction_type,
                error=result.error
            )
            
    except Exception as e:
        logger.error(f"Error making prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/anomaly-detection")
async def detect_anomalies(
    site_id: str = Query(..., description="Site identifier"),
    time_window: int = Query(default=30, description="Time window in days"),
    contamination: float = Query(default=0.1, description="Expected proportion of anomalies")
):
    """Detect anomalies in user behavior"""
    try:
        logger.info(f"Detecting anomalies for site: {site_id}")
        
        result = await analytics_ml_service.detect_anomalies(
            site_id=site_id,
            time_window=time_window,
            contamination=contamination
        )
        
        if result.success:
            return {
                "success": True,
                "anomalies": result.predictions.tolist() if result.predictions is not None else None,
                "confidence_scores": result.confidence_scores.tolist() if result.confidence_scores is not None else None,
                "metadata": result.metadata
            }
        else:
            return {
                "success": False,
                "error": result.error
            }
            
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/segment-users")
async def segment_users(
    site_id: str = Query(..., description="Site identifier"),
    time_window: int = Query(default=30, description="Time window in days"),
    n_segments: int = Query(default=5, description="Number of segments to create")
):
    """Segment users based on behavior patterns"""
    try:
        logger.info(f"Segmenting users for site: {site_id}")
        
        result = await analytics_ml_service.segment_users(
            site_id=site_id,
            time_window=time_window,
            n_segments=n_segments
        )
        
        if result.success:
            return {
                "success": True,
                "segments": result.predictions.tolist() if result.predictions is not None else None,
                "metadata": result.metadata
            }
        else:
            return {
                "success": False,
                "error": result.error
            }
            
    except Exception as e:
        logger.error(f"Error segmenting users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ml/insights")
async def get_predictive_insights(
    site_id: str = Query(..., description="Site identifier"),
    time_window: int = Query(default=30, description="Time window in days")
):
    """Get predictive insights for a site"""
    try:
        logger.info(f"Generating predictive insights for site: {site_id}")
        
        insights = await analytics_ml_service.generate_predictive_insights(
            site_id=site_id,
            time_window=time_window
        )
        
        # Convert insights to dict format
        insights_dict = []
        for insight in insights:
            insights_dict.append({
                "insight_type": insight.insight_type,
                "title": insight.title,
                "description": insight.description,
                "value": insight.value,
                "confidence": insight.confidence,
                "significance": insight.significance,
                "timestamp": insight.timestamp.isoformat(),
                "metadata": insight.metadata
            })
        
        return {
            "success": True,
            "insights": insights_dict,
            "total_insights": len(insights)
        }
        
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Utility Endpoints

@app.get("/api/models")
async def list_available_models():
    """List available embedding models"""
    return {
        "embedding_models": [model.value for model in EmbeddingModel],
        "prediction_types": [pred_type.value for pred_type in PredictionType],
        "data_sources": [source.value for source in DataSource]
    }

@app.get("/api/stats")
async def get_service_stats():
    """Get service statistics"""
    try:
        db = await get_db()
        
        # Get collection counts
        stats = {
            "database_stats": {
                "vector_documents": await db.count_documents("vectordocuments", {}),
                "analytics": await db.count_documents("analytics", {}),
                "sessions": await db.count_documents("sessions", {}),
                "transactions": await db.count_documents("transactions", {})
            },
            "service_stats": {
                "data_processor_initialized": data_processor.db is not None,
                "embedding_generator_initialized": embedding_generator.db is not None,
                "analytics_ml_initialized": analytics_ml_service.db is not None
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting service stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host=config.service.host,
        port=config.service.port,
        debug=config.service.debug,
        reload=config.service.debug
    ) 