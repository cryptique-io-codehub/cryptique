# Cryptique Python Data Processing Services

Advanced analytics data processing and embedding generation services for Cryptique, providing ML-powered insights and high-quality vector embeddings.

## 🚀 Features

### Core Services

- **Data Processor**: Advanced analytics data processing with ML capabilities
- **Embedding Generator**: Multi-model embedding generation with optimization
- **Vector Migrator**: Data migration from current system to vector format
- **Analytics ML**: Machine learning models for user behavior prediction

### Key Capabilities

- **Advanced Data Processing**: Statistical analysis, trend detection, anomaly detection
- **Multi-Model Embeddings**: Support for Gemini, OpenAI, Sentence Transformers, and local models
- **ML-Powered Analytics**: Churn prediction, conversion optimization, user segmentation
- **Production-Ready**: Comprehensive logging, monitoring, and error handling
- **Scalable Architecture**: Async processing, batch operations, and resource management

## 📦 Installation

### Prerequisites

- Python 3.8+
- MongoDB with Atlas Vector Search
- Gemini API key
- OpenAI API key (optional)

### Setup

1. **Install dependencies**:
```bash
cd cryptique/backend/python
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

3. **Initialize services**:
```bash
python -m services.data_processor --init
python -m services.embedding_generator --init
```

## 🔧 Configuration

### Environment Variables

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
MONGODB_DATABASE=Cryptique-Test-Server

# AI/ML Configuration
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Service Configuration
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
LOG_LEVEL=INFO
```

### Service Configuration

See `config.py` for detailed configuration options:

- Database connection settings
- AI model configurations
- Processing parameters
- Performance tuning options

## 🚀 Usage

### Starting the API Service

```bash
# Development
python -m api.main

# Production
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Using Individual Services

#### Data Processing

```python
from services.data_processor import DataProcessor

# Initialize processor
processor = DataProcessor()
await processor.initialize()

# Process analytics data
result = await processor.process_analytics_data(
    site_id="your_site_id",
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 1, 31)
)

# Analyze user journeys
journey_result = await processor.analyze_user_journeys(
    site_id="your_site_id",
    time_window=30
)
```

#### Embedding Generation

```python
from services.embedding_generator import EmbeddingGenerator, EmbeddingModel

# Initialize generator
generator = EmbeddingGenerator()
await generator.initialize()

# Generate single embedding
result = await generator.generate_embedding(
    text="Your text to embed",
    model=EmbeddingModel.GEMINI
)

# Generate batch embeddings
batch_result = await generator.generate_batch_embeddings(
    texts=["Text 1", "Text 2", "Text 3"],
    model=EmbeddingModel.GEMINI,
    batch_size=10
)
```

#### Vector Migration

```python
from services.vector_migrator import VectorMigrator, MigrationConfig, DataSource

# Configure migration
config = MigrationConfig(
    source_types=[DataSource.ANALYTICS, DataSource.SESSIONS],
    batch_size=100,
    embedding_model=EmbeddingModel.GEMINI
)

# Initialize migrator
migrator = VectorMigrator(config)
await migrator.initialize()

# Start migration
result = await migrator.migrate_all_data(
    site_ids=["site1", "site2"],
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 1, 31)
)
```

#### ML Analytics

```python
from services.analytics_ml import AnalyticsMLService

# Initialize ML service
ml_service = AnalyticsMLService()
await ml_service.initialize()

# Predict user churn
churn_result = await ml_service.predict_user_churn(
    site_id="your_site_id",
    time_window=30
)

# Detect anomalies
anomaly_result = await ml_service.detect_anomalies(
    site_id="your_site_id",
    time_window=30
)

# Segment users
segment_result = await ml_service.segment_users(
    site_id="your_site_id",
    n_segments=5
)
```

## 📊 API Endpoints

### Data Processing

- `POST /api/process/analytics` - Process analytics data
- `POST /api/process/user-journeys` - Analyze user journeys
- `POST /api/process/time-series` - Time series analysis
- `POST /api/process/web3-patterns` - Web3 pattern analysis

### Embedding Generation

- `POST /api/embeddings/generate` - Generate single embedding
- `POST /api/embeddings/batch` - Generate batch embeddings
- `POST /api/embeddings/similarity` - Calculate similarity

### Migration

- `POST /api/migration/start` - Start data migration
- `GET /api/migration/status` - Get migration status
- `POST /api/migration/validate` - Validate migration

### ML Predictions

- `POST /api/ml/predict` - Make ML predictions
- `POST /api/ml/anomaly-detection` - Detect anomalies
- `POST /api/ml/segment-users` - Segment users
- `GET /api/ml/insights` - Get predictive insights

### Utilities

- `GET /health` - Health check
- `GET /api/models` - List available models
- `GET /api/stats` - Service statistics

## 🔍 Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health

# Get detailed statistics
curl http://localhost:8000/api/stats
```

### Logging

Logs are written to:
- Console output (development)
- `logs/service.log` (production)
- Structured JSON format for parsing

### Metrics

Built-in metrics collection for:
- Request/response times
- Error rates
- Resource usage
- ML model performance

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_data_processor.py

# Run with coverage
pytest --cov=services
```

### Integration Tests

```bash
# Test with real database
pytest tests/integration/

# Test API endpoints
pytest tests/api/
```

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations

1. **Environment Variables**: Use secure secret management
2. **Database**: Configure connection pooling and indexes
3. **Monitoring**: Set up application monitoring and alerting
4. **Scaling**: Use multiple workers and load balancing
5. **Security**: Implement authentication and rate limiting

## 📈 Performance Optimization

### Database Optimization

- Use appropriate MongoDB indexes
- Implement connection pooling
- Configure read/write concerns
- Monitor query performance

### ML Model Optimization

- Cache trained models
- Use batch processing for predictions
- Implement model versioning
- Monitor model performance

### Embedding Optimization

- Enable embedding caching
- Use appropriate batch sizes
- Implement rate limiting
- Monitor API quotas

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection**:
   - Check MongoDB URI and credentials
   - Verify network connectivity
   - Check connection pool settings

2. **API Rate Limits**:
   - Monitor API usage
   - Implement exponential backoff
   - Use caching to reduce calls

3. **Memory Issues**:
   - Reduce batch sizes
   - Implement data streaming
   - Monitor memory usage

4. **Model Performance**:
   - Retrain models with fresh data
   - Tune hyperparameters
   - Validate data quality

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with debug mode
python -m api.main --debug
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Create GitHub issue
- Check documentation
- Review logs for errors

---

**Note**: This service is designed to work with the existing Cryptique Node.js backend and should be deployed alongside it for optimal performance. 