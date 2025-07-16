"""
Advanced Embedding Generator for Cryptique
Supports multiple embedding models with optimization and quality validation
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import pickle
from pathlib import Path

# AI/ML imports
import openai
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import PCA
import umap

from config import config
from utils.logger import get_logger, log_async_performance, LogContext
from utils.database import get_db

logger = get_logger(__name__)

class EmbeddingModel(Enum):
    """Supported embedding models"""
    GEMINI = "gemini"
    OPENAI = "openai"
    SENTENCE_TRANSFORMER = "sentence_transformer"
    HUGGINGFACE = "huggingface"
    LOCAL = "local"

class EmbeddingQuality(Enum):
    """Embedding quality levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

@dataclass
class EmbeddingResult:
    """Result of embedding generation"""
    success: bool
    embedding: Optional[np.ndarray] = None
    model_used: Optional[str] = None
    dimensions: Optional[int] = None
    quality_score: Optional[float] = None
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@dataclass
class BatchEmbeddingResult:
    """Result of batch embedding generation"""
    success: bool
    embeddings: Optional[List[np.ndarray]] = None
    failed_indices: Optional[List[int]] = None
    total_processed: int = 0
    processing_time: Optional[float] = None
    quality_scores: Optional[List[float]] = None
    metadata: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None

class EmbeddingGenerator:
    """
    Advanced embedding generator with multi-model support and optimization
    """
    
    def __init__(self):
        self.db = None
        self.embedding_config = config.get_embedding_config()
        self.cache = {}
        self.models = {}
        self.quality_validator = EmbeddingQualityValidator()
        self.optimizer = EmbeddingOptimizer()
        
        # Initialize model configurations
        self.model_configs = {
            EmbeddingModel.GEMINI: {
                'api_key': self.embedding_config['gemini_api_key'],
                'model_name': self.embedding_config['gemini_model'],
                'dimensions': 1536,
                'max_tokens': 8192
            },
            EmbeddingModel.OPENAI: {
                'api_key': self.embedding_config['openai_api_key'],
                'model_name': self.embedding_config['openai_model'],
                'dimensions': 3072,
                'max_tokens': 8192
            },
            EmbeddingModel.SENTENCE_TRANSFORMER: {
                'model_name': 'all-MiniLM-L6-v2',
                'dimensions': 384,
                'max_tokens': 512
            },
            EmbeddingModel.HUGGINGFACE: {
                'model_name': 'sentence-transformers/all-mpnet-base-v2',
                'dimensions': 768,
                'max_tokens': 514
            }
        }
        
    async def initialize(self):
        """Initialize the embedding generator"""
        self.db = await get_db()
        
        # Initialize Gemini
        if self.model_configs[EmbeddingModel.GEMINI]['api_key']:
            genai.configure(api_key=self.model_configs[EmbeddingModel.GEMINI]['api_key'])
            logger.info("Gemini API initialized")
        
        # Initialize OpenAI
        if self.model_configs[EmbeddingModel.OPENAI]['api_key']:
            openai.api_key = self.model_configs[EmbeddingModel.OPENAI]['api_key']
            logger.info("OpenAI API initialized")
        
        # Initialize local models
        await self._initialize_local_models()
        
        logger.info("Embedding generator initialized")
    
    @log_async_performance
    async def generate_embedding(
        self,
        text: str,
        model: EmbeddingModel = EmbeddingModel.GEMINI,
        context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> EmbeddingResult:
        """
        Generate embedding for a single text
        
        Args:
            text: Text to embed
            model: Embedding model to use
            context: Additional context for embedding
            use_cache: Whether to use cached embeddings
            
        Returns:
            EmbeddingResult with embedding and metadata
        """
        start_time = time.time()
        
        try:
            # Check cache first
            if use_cache:
                cached_result = await self._get_cached_embedding(text, model)
                if cached_result:
                    return cached_result
            
            # Preprocess text
            processed_text = await self._preprocess_text(text, context)
            
            # Generate embedding based on model
            if model == EmbeddingModel.GEMINI:
                embedding = await self._generate_gemini_embedding(processed_text)
            elif model == EmbeddingModel.OPENAI:
                embedding = await self._generate_openai_embedding(processed_text)
            elif model == EmbeddingModel.SENTENCE_TRANSFORMER:
                embedding = await self._generate_sentence_transformer_embedding(processed_text)
            elif model == EmbeddingModel.HUGGINGFACE:
                embedding = await self._generate_huggingface_embedding(processed_text)
            else:
                raise ValueError(f"Unsupported model: {model}")
            
            # Validate embedding quality
            quality_score = await self.quality_validator.validate_embedding(
                embedding, text, model
            )
            
            # Create result
            result = EmbeddingResult(
                success=True,
                embedding=embedding,
                model_used=model.value,
                dimensions=len(embedding),
                quality_score=quality_score,
                processing_time=time.time() - start_time,
                metadata={
                    'text_length': len(text),
                    'processed_text_length': len(processed_text),
                    'context': context
                }
            )
            
            # Cache result
            if use_cache:
                await self._cache_embedding(text, model, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return EmbeddingResult(
                success=False,
                error=str(e),
                processing_time=time.time() - start_time
            )
    
    @log_async_performance
    async def generate_batch_embeddings(
        self,
        texts: List[str],
        model: EmbeddingModel = EmbeddingModel.GEMINI,
        batch_size: Optional[int] = None,
        context: Optional[List[Dict[str, Any]]] = None,
        use_cache: bool = True,
        max_workers: int = 4
    ) -> BatchEmbeddingResult:
        """
        Generate embeddings for multiple texts in batches
        
        Args:
            texts: List of texts to embed
            model: Embedding model to use
            batch_size: Batch size for processing
            context: Context for each text
            use_cache: Whether to use cached embeddings
            max_workers: Maximum number of concurrent workers
            
        Returns:
            BatchEmbeddingResult with embeddings and metadata
        """
        start_time = time.time()
        
        try:
            if not texts:
                return BatchEmbeddingResult(
                    success=False,
                    errors=["No texts provided"]
                )
            
            batch_size = batch_size or self.embedding_config['batch_size']
            embeddings = []
            failed_indices = []
            quality_scores = []
            errors = []
            
            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_context = context[i:i + batch_size] if context else None
                
                # Process batch
                batch_results = await self._process_batch(
                    batch_texts, model, batch_context, use_cache, max_workers
                )
                
                # Collect results
                for j, result in enumerate(batch_results):
                    if result.success:
                        embeddings.append(result.embedding)
                        quality_scores.append(result.quality_score)
                    else:
                        failed_indices.append(i + j)
                        errors.append(result.error)
                        embeddings.append(None)
                        quality_scores.append(0.0)
            
            # Calculate overall statistics
            successful_embeddings = [e for e in embeddings if e is not None]
            avg_quality = np.mean([q for q in quality_scores if q > 0]) if quality_scores else 0
            
            return BatchEmbeddingResult(
                success=len(successful_embeddings) > 0,
                embeddings=embeddings,
                failed_indices=failed_indices,
                total_processed=len(texts),
                processing_time=time.time() - start_time,
                quality_scores=quality_scores,
                metadata={
                    'successful_count': len(successful_embeddings),
                    'failed_count': len(failed_indices),
                    'average_quality': avg_quality,
                    'model_used': model.value,
                    'batch_size': batch_size
                },
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Error in batch embedding generation: {e}")
            return BatchEmbeddingResult(
                success=False,
                errors=[str(e)],
                processing_time=time.time() - start_time
            )
    
    async def calculate_similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        method: str = "cosine"
    ) -> float:
        """
        Calculate similarity between two embeddings
        
        Args:
            embedding1: First embedding
            embedding2: Second embedding
            method: Similarity method (cosine, euclidean, dot)
            
        Returns:
            Similarity score
        """
        try:
            if method == "cosine":
                return cosine_similarity([embedding1], [embedding2])[0][0]
            elif method == "euclidean":
                return 1 / (1 + np.linalg.norm(embedding1 - embedding2))
            elif method == "dot":
                return np.dot(embedding1, embedding2)
            else:
                raise ValueError(f"Unsupported similarity method: {method}")
                
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def find_similar_embeddings(
        self,
        query_embedding: np.ndarray,
        candidate_embeddings: List[np.ndarray],
        top_k: int = 10,
        threshold: float = 0.7
    ) -> List[Tuple[int, float]]:
        """
        Find most similar embeddings to a query
        
        Args:
            query_embedding: Query embedding
            candidate_embeddings: List of candidate embeddings
            top_k: Number of top results to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of (index, similarity_score) tuples
        """
        try:
            similarities = []
            
            for i, candidate in enumerate(candidate_embeddings):
                if candidate is not None:
                    similarity = await self.calculate_similarity(
                        query_embedding, candidate
                    )
                    if similarity >= threshold:
                        similarities.append((i, similarity))
            
            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Error finding similar embeddings: {e}")
            return []
    
    async def reduce_dimensions(
        self,
        embeddings: List[np.ndarray],
        target_dimensions: int = 512,
        method: str = "pca"
    ) -> List[np.ndarray]:
        """
        Reduce embedding dimensions
        
        Args:
            embeddings: List of embeddings to reduce
            target_dimensions: Target number of dimensions
            method: Reduction method (pca, umap)
            
        Returns:
            List of reduced embeddings
        """
        try:
            embeddings_array = np.array(embeddings)
            
            if method == "pca":
                reducer = PCA(n_components=target_dimensions)
                reduced = reducer.fit_transform(embeddings_array)
            elif method == "umap":
                reducer = umap.UMAP(n_components=target_dimensions)
                reduced = reducer.fit_transform(embeddings_array)
            else:
                raise ValueError(f"Unsupported reduction method: {method}")
            
            return [reduced[i] for i in range(len(reduced))]
            
        except Exception as e:
            logger.error(f"Error reducing dimensions: {e}")
            return embeddings
    
    async def optimize_embeddings(
        self,
        embeddings: List[np.ndarray],
        optimization_type: str = "normalize"
    ) -> List[np.ndarray]:
        """
        Optimize embeddings for better performance
        
        Args:
            embeddings: List of embeddings to optimize
            optimization_type: Type of optimization
            
        Returns:
            List of optimized embeddings
        """
        return await self.optimizer.optimize_embeddings(embeddings, optimization_type)
    
    # Private methods
    
    async def _initialize_local_models(self):
        """Initialize local embedding models"""
        try:
            # Initialize Sentence Transformer
            if EmbeddingModel.SENTENCE_TRANSFORMER not in self.models:
                model_name = self.model_configs[EmbeddingModel.SENTENCE_TRANSFORMER]['model_name']
                self.models[EmbeddingModel.SENTENCE_TRANSFORMER] = SentenceTransformer(model_name)
                logger.info(f"Loaded Sentence Transformer model: {model_name}")
            
            # Initialize HuggingFace model
            if EmbeddingModel.HUGGINGFACE not in self.models:
                model_name = self.model_configs[EmbeddingModel.HUGGINGFACE]['model_name']
                self.models[EmbeddingModel.HUGGINGFACE] = {
                    'tokenizer': AutoTokenizer.from_pretrained(model_name),
                    'model': AutoModel.from_pretrained(model_name)
                }
                logger.info(f"Loaded HuggingFace model: {model_name}")
                
        except Exception as e:
            logger.warning(f"Error initializing local models: {e}")
    
    async def _preprocess_text(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Preprocess text for embedding generation"""
        # Basic text cleaning
        processed_text = text.strip()
        
        # Add context if provided
        if context:
            context_str = self._format_context(context)
            processed_text = f"{context_str}\n\n{processed_text}"
        
        # Truncate if too long
        max_tokens = 8000  # Conservative limit
        if len(processed_text) > max_tokens:
            processed_text = processed_text[:max_tokens]
        
        return processed_text
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context into a string"""
        context_parts = []
        
        if context.get('data_type'):
            context_parts.append(f"Data Type: {context['data_type']}")
        
        if context.get('source_type'):
            context_parts.append(f"Source: {context['source_type']}")
        
        if context.get('timeframe'):
            context_parts.append(f"Timeframe: {context['timeframe']}")
        
        if context.get('importance'):
            context_parts.append(f"Importance: {context['importance']}/10")
        
        return " | ".join(context_parts)
    
    async def _generate_gemini_embedding(self, text: str) -> np.ndarray:
        """Generate embedding using Gemini API"""
        try:
            model = genai.GenerativeModel(
                model_name=self.model_configs[EmbeddingModel.GEMINI]['model_name']
            )
            
            result = await asyncio.to_thread(
                model.embed_content,
                content=text,
                task_type="retrieval_document"
            )
            
            return np.array(result['embedding'])
            
        except Exception as e:
            logger.error(f"Error generating Gemini embedding: {e}")
            raise
    
    async def _generate_openai_embedding(self, text: str) -> np.ndarray:
        """Generate embedding using OpenAI API"""
        try:
            response = await asyncio.to_thread(
                openai.Embedding.create,
                model=self.model_configs[EmbeddingModel.OPENAI]['model_name'],
                input=text
            )
            
            return np.array(response['data'][0]['embedding'])
            
        except Exception as e:
            logger.error(f"Error generating OpenAI embedding: {e}")
            raise
    
    async def _generate_sentence_transformer_embedding(self, text: str) -> np.ndarray:
        """Generate embedding using Sentence Transformer"""
        try:
            model = self.models[EmbeddingModel.SENTENCE_TRANSFORMER]
            embedding = await asyncio.to_thread(model.encode, text)
            return np.array(embedding)
            
        except Exception as e:
            logger.error(f"Error generating Sentence Transformer embedding: {e}")
            raise
    
    async def _generate_huggingface_embedding(self, text: str) -> np.ndarray:
        """Generate embedding using HuggingFace model"""
        try:
            tokenizer = self.models[EmbeddingModel.HUGGINGFACE]['tokenizer']
            model = self.models[EmbeddingModel.HUGGINGFACE]['model']
            
            # Tokenize
            inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True)
            
            # Generate embedding
            with torch.no_grad():
                outputs = model(**inputs)
                embedding = outputs.last_hidden_state.mean(dim=1).squeeze()
            
            return embedding.numpy()
            
        except Exception as e:
            logger.error(f"Error generating HuggingFace embedding: {e}")
            raise
    
    async def _process_batch(
        self,
        texts: List[str],
        model: EmbeddingModel,
        context: Optional[List[Dict[str, Any]]],
        use_cache: bool,
        max_workers: int
    ) -> List[EmbeddingResult]:
        """Process a batch of texts"""
        results = []
        
        # Use ThreadPoolExecutor for concurrent processing
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            
            for i, text in enumerate(texts):
                text_context = context[i] if context else None
                future = executor.submit(
                    asyncio.run,
                    self.generate_embedding(text, model, text_context, use_cache)
                )
                futures.append(future)
            
            # Collect results
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append(EmbeddingResult(
                        success=False,
                        error=str(e)
                    ))
        
        return results
    
    async def _get_cached_embedding(
        self,
        text: str,
        model: EmbeddingModel
    ) -> Optional[EmbeddingResult]:
        """Get cached embedding if available"""
        cache_key = self._generate_cache_key(text, model)
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Check database cache
        cached_doc = await self.db.find_one_document(
            "embedding_cache",
            {"cache_key": cache_key}
        )
        
        if cached_doc:
            embedding = np.array(cached_doc['embedding'])
            result = EmbeddingResult(
                success=True,
                embedding=embedding,
                model_used=model.value,
                dimensions=len(embedding),
                quality_score=cached_doc.get('quality_score', 0.8),
                processing_time=0.0,
                metadata=cached_doc.get('metadata', {})
            )
            
            # Cache in memory
            self.cache[cache_key] = result
            return result
        
        return None
    
    async def _cache_embedding(
        self,
        text: str,
        model: EmbeddingModel,
        result: EmbeddingResult
    ):
        """Cache embedding result"""
        cache_key = self._generate_cache_key(text, model)
        
        # Cache in memory
        self.cache[cache_key] = result
        
        # Cache in database
        cache_doc = {
            "cache_key": cache_key,
            "text": text,
            "model": model.value,
            "embedding": result.embedding.tolist(),
            "quality_score": result.quality_score,
            "metadata": result.metadata,
            "created_at": time.time()
        }
        
        try:
            await self.db.insert_document("embedding_cache", cache_doc)
        except Exception as e:
            logger.warning(f"Error caching embedding: {e}")
    
    def _generate_cache_key(self, text: str, model: EmbeddingModel) -> str:
        """Generate cache key for text and model"""
        content = f"{text}:{model.value}"
        return hashlib.md5(content.encode()).hexdigest()

class EmbeddingQualityValidator:
    """Validates embedding quality"""
    
    async def validate_embedding(
        self,
        embedding: np.ndarray,
        original_text: str,
        model: EmbeddingModel
    ) -> float:
        """
        Validate embedding quality
        
        Args:
            embedding: Generated embedding
            original_text: Original text
            model: Model used
            
        Returns:
            Quality score (0-1)
        """
        try:
            quality_score = 0.0
            
            # Check embedding dimensions
            expected_dims = self._get_expected_dimensions(model)
            if len(embedding) == expected_dims:
                quality_score += 0.3
            
            # Check for NaN or infinite values
            if not np.any(np.isnan(embedding)) and not np.any(np.isinf(embedding)):
                quality_score += 0.2
            
            # Check embedding magnitude
            magnitude = np.linalg.norm(embedding)
            if 0.1 < magnitude < 10.0:
                quality_score += 0.2
            
            # Check embedding variance
            variance = np.var(embedding)
            if variance > 0.001:
                quality_score += 0.15
            
            # Check text length appropriateness
            if len(original_text) > 10:
                quality_score += 0.15
            
            return min(quality_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error validating embedding quality: {e}")
            return 0.0
    
    def _get_expected_dimensions(self, model: EmbeddingModel) -> int:
        """Get expected dimensions for model"""
        dimension_map = {
            EmbeddingModel.GEMINI: 1536,
            EmbeddingModel.OPENAI: 3072,
            EmbeddingModel.SENTENCE_TRANSFORMER: 384,
            EmbeddingModel.HUGGINGFACE: 768
        }
        return dimension_map.get(model, 768)

class EmbeddingOptimizer:
    """Optimizes embeddings for better performance"""
    
    async def optimize_embeddings(
        self,
        embeddings: List[np.ndarray],
        optimization_type: str = "normalize"
    ) -> List[np.ndarray]:
        """
        Optimize embeddings
        
        Args:
            embeddings: List of embeddings to optimize
            optimization_type: Type of optimization
            
        Returns:
            List of optimized embeddings
        """
        try:
            if optimization_type == "normalize":
                return [self._normalize_embedding(emb) for emb in embeddings]
            elif optimization_type == "standardize":
                return self._standardize_embeddings(embeddings)
            elif optimization_type == "center":
                return self._center_embeddings(embeddings)
            else:
                return embeddings
                
        except Exception as e:
            logger.error(f"Error optimizing embeddings: {e}")
            return embeddings
    
    def _normalize_embedding(self, embedding: np.ndarray) -> np.ndarray:
        """Normalize embedding to unit length"""
        norm = np.linalg.norm(embedding)
        return embedding / norm if norm > 0 else embedding
    
    def _standardize_embeddings(self, embeddings: List[np.ndarray]) -> List[np.ndarray]:
        """Standardize embeddings to zero mean and unit variance"""
        embeddings_array = np.array(embeddings)
        mean = np.mean(embeddings_array, axis=0)
        std = np.std(embeddings_array, axis=0)
        
        standardized = (embeddings_array - mean) / (std + 1e-8)
        return [standardized[i] for i in range(len(standardized))]
    
    def _center_embeddings(self, embeddings: List[np.ndarray]) -> List[np.ndarray]:
        """Center embeddings around zero"""
        embeddings_array = np.array(embeddings)
        mean = np.mean(embeddings_array, axis=0)
        
        centered = embeddings_array - mean
        return [centered[i] for i in range(len(centered))]

# Global embedding generator instance
embedding_generator = EmbeddingGenerator()

# Convenience functions
async def get_embedding_generator() -> EmbeddingGenerator:
    """Get embedding generator instance"""
    if not embedding_generator.db:
        await embedding_generator.initialize()
    return embedding_generator 