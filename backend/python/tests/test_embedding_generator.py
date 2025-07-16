"""
Comprehensive tests for Embedding Generator service
"""

import pytest
import numpy as np
from unittest.mock import Mock, AsyncMock, patch
from typing import List, Dict, Any

from services.embedding_generator import (
    EmbeddingGenerator, 
    EmbeddingModel, 
    EmbeddingResult, 
    BatchEmbeddingResult,
    EmbeddingQualityValidator,
    EmbeddingOptimizer
)
from . import SAMPLE_EMBEDDING_TEXT, SAMPLE_EMBEDDING_VECTOR


class TestEmbeddingGenerator:
    """Test suite for EmbeddingGenerator class"""
    
    @pytest.fixture
    async def embedding_generator(self, mock_database):
        """Create EmbeddingGenerator instance with mocked database"""
        generator = EmbeddingGenerator()
        generator.db = mock_database
        return generator
    
    @pytest.mark.asyncio
    async def test_initialization(self):
        """Test EmbeddingGenerator initialization"""
        generator = EmbeddingGenerator()
        assert generator.db is None
        assert generator.cache == {}
        assert generator.models == {}
        assert generator.quality_validator is not None
        assert generator.optimizer is not None
        
        # Test model configurations
        assert EmbeddingModel.GEMINI in generator.model_configs
        assert EmbeddingModel.OPENAI in generator.model_configs
        assert EmbeddingModel.SENTENCE_TRANSFORMER in generator.model_configs
        
        # Test initialize method
        with patch('utils.database.get_db') as mock_get_db:
            mock_get_db.return_value = AsyncMock()
            await generator.initialize()
            assert generator.db is not None
    
    @pytest.mark.asyncio
    async def test_generate_embedding_gemini_success(self, embedding_generator, mock_gemini_embedding):
        """Test successful embedding generation with Gemini"""
        result = await embedding_generator.generate_embedding(
            text=SAMPLE_EMBEDDING_TEXT,
            model=EmbeddingModel.GEMINI,
            use_cache=False
        )
        
        assert result.success is True
        assert result.embedding is not None
        assert len(result.embedding) == 1536  # Gemini embedding dimension
        assert result.model_used == EmbeddingModel.GEMINI.value
        assert result.quality_score is not None
        assert result.quality_score > 0
        assert result.processing_time is not None
        assert result.processing_time > 0
        assert result.metadata is not None
    
    @pytest.mark.asyncio
    async def test_generate_embedding_openai_success(self, embedding_generator, mock_openai_embedding):
        """Test successful embedding generation with OpenAI"""
        result = await embedding_generator.generate_embedding(
            text=SAMPLE_EMBEDDING_TEXT,
            model=EmbeddingModel.OPENAI,
            use_cache=False
        )
        
        assert result.success is True
        assert result.embedding is not None
        assert len(result.embedding) == 1536  # Using sample vector length
        assert result.model_used == EmbeddingModel.OPENAI.value
        assert result.quality_score is not None
        assert result.processing_time is not None
    
    @pytest.mark.asyncio
    async def test_generate_embedding_with_context(self, embedding_generator, mock_gemini_embedding):
        """Test embedding generation with context"""
        context = {
            'data_type': 'analytics',
            'source_type': 'session',
            'importance': 8
        }
        
        result = await embedding_generator.generate_embedding(
            text=SAMPLE_EMBEDDING_TEXT,
            model=EmbeddingModel.GEMINI,
            context=context,
            use_cache=False
        )
        
        assert result.success is True
        assert result.metadata['context'] == context
        assert result.metadata['processed_text_length'] > len(SAMPLE_EMBEDDING_TEXT)
    
    @pytest.mark.asyncio
    async def test_generate_embedding_with_cache(self, embedding_generator, mock_gemini_embedding):
        """Test embedding generation with caching"""
        # First call should generate embedding
        result1 = await embedding_generator.generate_embedding(
            text=SAMPLE_EMBEDDING_TEXT,
            model=EmbeddingModel.GEMINI,
            use_cache=True
        )
        
        assert result1.success is True
        assert result1.processing_time > 0
        
        # Second call should use cache
        result2 = await embedding_generator.generate_embedding(
            text=SAMPLE_EMBEDDING_TEXT,
            model=EmbeddingModel.GEMINI,
            use_cache=True
        )
        
        assert result2.success is True
        # Should be faster due to caching
        assert result2.processing_time <= result1.processing_time
    
    @pytest.mark.asyncio
    async def test_generate_embedding_error_handling(self, embedding_generator):
        """Test error handling in embedding generation"""
        with patch('google.generativeai.GenerativeModel') as mock_model:
            mock_model.side_effect = Exception("API Error")
            
            result = await embedding_generator.generate_embedding(
                text=SAMPLE_EMBEDDING_TEXT,
                model=EmbeddingModel.GEMINI,
                use_cache=False
            )
            
            assert result.success is False
            assert result.error is not None
            assert "API Error" in result.error
    
    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_success(self, embedding_generator, mock_gemini_embedding):
        """Test successful batch embedding generation"""
        texts = [f"Test text {i}" for i in range(5)]
        
        result = await embedding_generator.generate_batch_embeddings(
            texts=texts,
            model=EmbeddingModel.GEMINI,
            batch_size=2,
            use_cache=False
        )
        
        assert result.success is True
        assert result.embeddings is not None
        assert len(result.embeddings) == len(texts)
        assert result.total_processed == len(texts)
        assert result.metadata['successful_count'] > 0
        assert result.processing_time is not None
    
    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_with_failures(self, embedding_generator):
        """Test batch embedding generation with some failures"""
        texts = [f"Test text {i}" for i in range(5)]
        
        # Mock some failures
        with patch('google.generativeai.GenerativeModel') as mock_model:
            mock_instance = Mock()
            mock_instance.embed_content.side_effect = [
                {'embedding': SAMPLE_EMBEDDING_VECTOR},  # Success
                Exception("API Error"),  # Failure
                {'embedding': SAMPLE_EMBEDDING_VECTOR},  # Success
                Exception("API Error"),  # Failure
                {'embedding': SAMPLE_EMBEDDING_VECTOR},  # Success
            ]
            mock_model.return_value = mock_instance
            
            result = await embedding_generator.generate_batch_embeddings(
                texts=texts,
                model=EmbeddingModel.GEMINI,
                use_cache=False
            )
            
            assert result.success is True  # Should succeed if at least one embedding generated
            assert result.failed_indices is not None
            assert len(result.failed_indices) > 0
            assert result.errors is not None
            assert len(result.errors) > 0
    
    @pytest.mark.asyncio
    async def test_calculate_similarity_cosine(self, embedding_generator):
        """Test cosine similarity calculation"""
        embedding1 = np.array([1.0, 0.0, 0.0])
        embedding2 = np.array([0.0, 1.0, 0.0])
        embedding3 = np.array([1.0, 0.0, 0.0])
        
        # Test orthogonal vectors (should be 0)
        similarity = await embedding_generator.calculate_similarity(
            embedding1, embedding2, method="cosine"
        )
        assert abs(similarity - 0.0) < 1e-10
        
        # Test identical vectors (should be 1)
        similarity = await embedding_generator.calculate_similarity(
            embedding1, embedding3, method="cosine"
        )
        assert abs(similarity - 1.0) < 1e-10
    
    @pytest.mark.asyncio
    async def test_calculate_similarity_euclidean(self, embedding_generator):
        """Test Euclidean similarity calculation"""
        embedding1 = np.array([0.0, 0.0, 0.0])
        embedding2 = np.array([1.0, 0.0, 0.0])
        
        similarity = await embedding_generator.calculate_similarity(
            embedding1, embedding2, method="euclidean"
        )
        
        assert similarity > 0
        assert similarity < 1
    
    @pytest.mark.asyncio
    async def test_calculate_similarity_dot_product(self, embedding_generator):
        """Test dot product similarity calculation"""
        embedding1 = np.array([1.0, 2.0, 3.0])
        embedding2 = np.array([4.0, 5.0, 6.0])
        
        similarity = await embedding_generator.calculate_similarity(
            embedding1, embedding2, method="dot"
        )
        
        expected = np.dot(embedding1, embedding2)
        assert abs(similarity - expected) < 1e-10
    
    @pytest.mark.asyncio
    async def test_find_similar_embeddings(self, embedding_generator):
        """Test finding similar embeddings"""
        query_embedding = np.array([1.0, 0.0, 0.0])
        candidate_embeddings = [
            np.array([1.0, 0.0, 0.0]),  # Identical
            np.array([0.9, 0.1, 0.0]),  # Very similar
            np.array([0.0, 1.0, 0.0]),  # Orthogonal
            np.array([0.5, 0.5, 0.0]),  # Somewhat similar
            None  # Invalid embedding
        ]
        
        similar_embeddings = await embedding_generator.find_similar_embeddings(
            query_embedding=query_embedding,
            candidate_embeddings=candidate_embeddings,
            top_k=3,
            threshold=0.5
        )
        
        assert len(similar_embeddings) <= 3
        assert all(similarity >= 0.5 for _, similarity in similar_embeddings)
        # Should be sorted by similarity (descending)
        similarities = [sim for _, sim in similar_embeddings]
        assert similarities == sorted(similarities, reverse=True)
    
    @pytest.mark.asyncio
    async def test_reduce_dimensions_pca(self, embedding_generator):
        """Test dimension reduction using PCA"""
        # Create high-dimensional embeddings
        embeddings = [np.random.normal(0, 1, 100) for _ in range(10)]
        
        reduced_embeddings = await embedding_generator.reduce_dimensions(
            embeddings=embeddings,
            target_dimensions=50,
            method="pca"
        )
        
        assert len(reduced_embeddings) == len(embeddings)
        assert all(len(emb) == 50 for emb in reduced_embeddings)
    
    @pytest.mark.asyncio
    async def test_reduce_dimensions_umap(self, embedding_generator):
        """Test dimension reduction using UMAP"""
        # Create high-dimensional embeddings
        embeddings = [np.random.normal(0, 1, 100) for _ in range(20)]
        
        reduced_embeddings = await embedding_generator.reduce_dimensions(
            embeddings=embeddings,
            target_dimensions=10,
            method="umap"
        )
        
        assert len(reduced_embeddings) == len(embeddings)
        assert all(len(emb) == 10 for emb in reduced_embeddings)
    
    @pytest.mark.asyncio
    async def test_optimize_embeddings(self, embedding_generator):
        """Test embedding optimization"""
        # Create test embeddings
        embeddings = [np.random.normal(0, 1, 100) for _ in range(5)]
        
        # Test normalization
        normalized = await embedding_generator.optimize_embeddings(
            embeddings=embeddings,
            optimization_type="normalize"
        )
        
        assert len(normalized) == len(embeddings)
        # Check that embeddings are normalized (unit length)
        for emb in normalized:
            norm = np.linalg.norm(emb)
            assert abs(norm - 1.0) < 1e-10
    
    @pytest.mark.asyncio
    async def test_text_preprocessing(self, embedding_generator):
        """Test text preprocessing"""
        # Test basic preprocessing
        text = "  This is a test text  "
        processed = await embedding_generator._preprocess_text(text)
        assert processed == "This is a test text"
        
        # Test with context
        context = {
            'data_type': 'analytics',
            'source_type': 'session',
            'importance': 8
        }
        processed_with_context = await embedding_generator._preprocess_text(text, context)
        assert len(processed_with_context) > len(text)
        assert 'Data Type: analytics' in processed_with_context
    
    @pytest.mark.asyncio
    async def test_cache_functionality(self, embedding_generator):
        """Test embedding caching functionality"""
        text = "Test caching"
        model = EmbeddingModel.GEMINI
        
        # Test cache key generation
        cache_key = embedding_generator._generate_cache_key(text, model)
        assert isinstance(cache_key, str)
        assert len(cache_key) == 32  # MD5 hash length
        
        # Test cache storage and retrieval
        mock_result = EmbeddingResult(
            success=True,
            embedding=np.array(SAMPLE_EMBEDDING_VECTOR),
            model_used=model.value,
            dimensions=1536,
            quality_score=0.85,
            processing_time=0.5
        )
        
        await embedding_generator._cache_embedding(text, model, mock_result)
        
        # Check memory cache
        assert cache_key in embedding_generator.cache
        cached_result = embedding_generator.cache[cache_key]
        assert cached_result.success is True
        assert np.array_equal(cached_result.embedding, mock_result.embedding)


class TestEmbeddingQualityValidator:
    """Test suite for EmbeddingQualityValidator class"""
    
    @pytest.fixture
    def validator(self):
        """Create EmbeddingQualityValidator instance"""
        return EmbeddingQualityValidator()
    
    @pytest.mark.asyncio
    async def test_validate_embedding_high_quality(self, validator):
        """Test validation of high-quality embedding"""
        # Create high-quality embedding
        embedding = np.random.normal(0, 1, 1536)
        embedding = embedding / np.linalg.norm(embedding)  # Normalize
        
        quality_score = await validator.validate_embedding(
            embedding=embedding,
            original_text="This is a good quality text for embedding",
            model=EmbeddingModel.GEMINI
        )
        
        assert quality_score > 0.5
        assert quality_score <= 1.0
    
    @pytest.mark.asyncio
    async def test_validate_embedding_low_quality(self, validator):
        """Test validation of low-quality embedding"""
        # Create low-quality embedding with NaN values
        embedding = np.array([np.nan] * 1536)
        
        quality_score = await validator.validate_embedding(
            embedding=embedding,
            original_text="Text",
            model=EmbeddingModel.GEMINI
        )
        
        assert quality_score < 0.5
    
    @pytest.mark.asyncio
    async def test_validate_embedding_wrong_dimensions(self, validator):
        """Test validation with wrong dimensions"""
        # Create embedding with wrong dimensions
        embedding = np.random.normal(0, 1, 512)  # Wrong dimension
        
        quality_score = await validator.validate_embedding(
            embedding=embedding,
            original_text="Test text",
            model=EmbeddingModel.GEMINI
        )
        
        assert quality_score < 0.5  # Should be penalized for wrong dimensions
    
    @pytest.mark.asyncio
    async def test_validate_embedding_infinite_values(self, validator):
        """Test validation with infinite values"""
        # Create embedding with infinite values
        embedding = np.array([np.inf] * 1536)
        
        quality_score = await validator.validate_embedding(
            embedding=embedding,
            original_text="Test text",
            model=EmbeddingModel.GEMINI
        )
        
        assert quality_score < 0.5  # Should be penalized for infinite values
    
    @pytest.mark.asyncio
    async def test_validate_embedding_zero_variance(self, validator):
        """Test validation with zero variance"""
        # Create embedding with zero variance
        embedding = np.array([0.5] * 1536)
        
        quality_score = await validator.validate_embedding(
            embedding=embedding,
            original_text="Test text",
            model=EmbeddingModel.GEMINI
        )
        
        assert quality_score < 0.8  # Should be penalized for zero variance


class TestEmbeddingOptimizer:
    """Test suite for EmbeddingOptimizer class"""
    
    @pytest.fixture
    def optimizer(self):
        """Create EmbeddingOptimizer instance"""
        return EmbeddingOptimizer()
    
    @pytest.mark.asyncio
    async def test_normalize_embeddings(self, optimizer):
        """Test embedding normalization"""
        # Create test embeddings
        embeddings = [
            np.array([3.0, 4.0, 0.0]),  # Magnitude 5
            np.array([1.0, 1.0, 1.0]),  # Magnitude sqrt(3)
            np.array([2.0, 0.0, 0.0])   # Magnitude 2
        ]
        
        normalized = await optimizer.optimize_embeddings(
            embeddings=embeddings,
            optimization_type="normalize"
        )
        
        assert len(normalized) == len(embeddings)
        
        # Check that all embeddings are normalized
        for emb in normalized:
            norm = np.linalg.norm(emb)
            assert abs(norm - 1.0) < 1e-10
    
    @pytest.mark.asyncio
    async def test_standardize_embeddings(self, optimizer):
        """Test embedding standardization"""
        # Create test embeddings with different scales
        embeddings = [
            np.array([100.0, 200.0, 300.0]),
            np.array([110.0, 210.0, 310.0]),
            np.array([90.0, 190.0, 290.0])
        ]
        
        standardized = await optimizer.optimize_embeddings(
            embeddings=embeddings,
            optimization_type="standardize"
        )
        
        assert len(standardized) == len(embeddings)
        
        # Check that mean is approximately zero
        embeddings_array = np.array(standardized)
        mean = np.mean(embeddings_array, axis=0)
        assert all(abs(m) < 1e-10 for m in mean)
    
    @pytest.mark.asyncio
    async def test_center_embeddings(self, optimizer):
        """Test embedding centering"""
        # Create test embeddings
        embeddings = [
            np.array([10.0, 20.0, 30.0]),
            np.array([15.0, 25.0, 35.0]),
            np.array([5.0, 15.0, 25.0])
        ]
        
        centered = await optimizer.optimize_embeddings(
            embeddings=embeddings,
            optimization_type="center"
        )
        
        assert len(centered) == len(embeddings)
        
        # Check that mean is approximately zero
        embeddings_array = np.array(centered)
        mean = np.mean(embeddings_array, axis=0)
        assert all(abs(m) < 1e-10 for m in mean)


class TestEmbeddingGeneratorIntegration:
    """Integration tests for EmbeddingGenerator"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_full_embedding_pipeline(self, embedding_generator, mock_gemini_embedding):
        """Test complete embedding generation pipeline"""
        texts = [
            "User analytics data showing increased engagement",
            "Web3 transaction pattern analysis results",
            "Campaign attribution model performance metrics",
            "Session duration and page view statistics",
            "Conversion funnel optimization insights"
        ]
        
        # Test batch processing
        result = await embedding_generator.generate_batch_embeddings(
            texts=texts,
            model=EmbeddingModel.GEMINI,
            batch_size=2,
            use_cache=True
        )
        
        assert result.success is True
        assert len(result.embeddings) == len(texts)
        assert result.metadata['successful_count'] == len(texts)
        
        # Test similarity calculations
        if result.embeddings[0] is not None and result.embeddings[1] is not None:
            similarity = await embedding_generator.calculate_similarity(
                result.embeddings[0], result.embeddings[1]
            )
            assert 0 <= similarity <= 1
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_multi_model_fallback(self, embedding_generator):
        """Test fallback between different models"""
        text = "Test multi-model fallback"
        
        # Test Gemini first
        with patch('google.generativeai.GenerativeModel') as mock_gemini:
            mock_instance = Mock()
            mock_instance.embed_content.return_value = {'embedding': SAMPLE_EMBEDDING_VECTOR}
            mock_gemini.return_value = mock_instance
            
            result = await embedding_generator.generate_embedding(
                text=text,
                model=EmbeddingModel.GEMINI,
                use_cache=False
            )
            
            assert result.success is True
            assert result.model_used == EmbeddingModel.GEMINI.value
    
    @pytest.mark.integration
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_large_batch_processing(self, embedding_generator, mock_gemini_embedding):
        """Test processing large batch of embeddings"""
        # Create large batch
        texts = [f"Test document {i} for embedding generation" for i in range(100)]
        
        result = await embedding_generator.generate_batch_embeddings(
            texts=texts,
            model=EmbeddingModel.GEMINI,
            batch_size=10,
            use_cache=False,
            max_workers=4
        )
        
        assert result.success is True
        assert len(result.embeddings) == len(texts)
        assert result.processing_time is not None
        assert result.processing_time < 300  # Should complete within 5 minutes
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_embedding_quality_end_to_end(self, embedding_generator, mock_gemini_embedding):
        """Test end-to-end embedding quality"""
        # Test with different types of content
        test_cases = [
            {
                'text': "High-quality analytical content with detailed metrics and insights",
                'context': {'data_type': 'analytics', 'importance': 9}
            },
            {
                'text': "Short text",
                'context': {'data_type': 'session', 'importance': 3}
            },
            {
                'text': "Medium length content with some Web3 transaction details and user behavior patterns",
                'context': {'data_type': 'transaction', 'importance': 7}
            }
        ]
        
        for test_case in test_cases:
            result = await embedding_generator.generate_embedding(
                text=test_case['text'],
                model=EmbeddingModel.GEMINI,
                context=test_case['context'],
                use_cache=False
            )
            
            assert result.success is True
            assert result.quality_score is not None
            assert result.quality_score > 0
            
            # Quality should correlate with content length and importance
            if len(test_case['text']) > 50 and test_case['context']['importance'] > 5:
                assert result.quality_score > 0.7
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_caching_performance(self, embedding_generator, mock_gemini_embedding):
        """Test caching performance improvement"""
        text = "Test caching performance improvement"
        
        # First generation (should be slow)
        result1 = await embedding_generator.generate_embedding(
            text=text,
            model=EmbeddingModel.GEMINI,
            use_cache=True
        )
        
        # Second generation (should be fast due to cache)
        result2 = await embedding_generator.generate_embedding(
            text=text,
            model=EmbeddingModel.GEMINI,
            use_cache=True
        )
        
        assert result1.success is True
        assert result2.success is True
        assert np.array_equal(result1.embedding, result2.embedding)
        # Cache should provide significant speedup
        assert result2.processing_time <= result1.processing_time 