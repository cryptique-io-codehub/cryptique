# RAG (Retrieval-Augmented Generation) Integration

This document outlines the RAG (Retrieval-Augmented Generation) integration for the Cryptique platform, which enhances the AI's ability to provide accurate and relevant responses by retrieving and using specific context from a knowledge base.

## Overview

The RAG system combines:
1. **Retrieval**: Finding relevant context from a knowledge base
2. **Generation**: Using that context to generate accurate and relevant responses

This approach significantly improves response quality while reducing API costs and rate limiting issues.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌───────────────────┐
│                 │     │                 │     │                   │
│  User Query     │────▶│  RAG Service    │────▶│  Vector Database  │
│                 │     │  (Retrieval)    │     │  (Pinecone)       │
└─────────────────┘     └────────┬────────┘     └───────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌───────────────────┐
                        │  LLM            │     │  Knowledge Base   │
                        │  (Generation)   │◀────│  (MongoDB)        │
                        └────────┬────────┘     └───────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Response to    │
                        │  User           │
                        └─────────────────┘
```

## API Endpoints

### 1. Retrieve Context

**Endpoint:** `POST /api/rag/retrieve`

Retrieves relevant context for a given query.

**Request Body:**
```json
{
  "query": "What's the average session duration for premium users?",
  "siteId": "your-site-id",
  "limit": 5,
  "minScore": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "context": "The average session duration for premium users is 8.5 minutes...",
    "sources": ["analytics-dashboard", "conversion-analytics"],
    "metadata": {
      "query": "What's the average session duration for premium users?",
      "siteId": "your-site-id",
      "matchCount": 3,
      "minScore": 0.72,
      "maxScore": 0.89
    }
  }
}
```

### 2. Generate Response

**Endpoint:** `POST /api/rag/generate`

Generates a response using RAG.

**Request Body:**
```json
{
  "query": "What's the average session duration for premium users?",
  "siteId": "your-site-id",
  "contextLimit": 3,
  "maxTokens": 1000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "The average session duration for premium users is 8.5 minutes, which is 40% higher than free users. This data comes from our analytics dashboard and reflects user engagement patterns over the last 30 days.",
    "sources": ["analytics-dashboard"],
    "metadata": {
      "model": "gemini-1.5-pro",
      "tokensUsed": 142,
      "contextCount": 1
    }
  }
}
```

### 3. Add Document

**Endpoint:** `POST /api/rag/documents`

Adds a document to the knowledge base.

**Request Body:**
```json
{
  "text": "Users who complete the onboarding tutorial have a 25% higher retention rate after 30 days.",
  "siteId": "your-site-id",
  "metadata": {
    "source": "retention-analytics",
    "type": "insight",
    "category": "user-retention"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "siteId": "your-site-id",
      "source": "retention-analytics",
      "type": "insight",
      "category": "user-retention",
      "text": "Users who complete the onboarding tutorial have a 25% higher retention rate after 30 days.",
      "createdAt": "2023-10-25T08:30:00.000Z"
    }
  }
}
```

## Client-Side Integration

The RAG service is integrated into the `CQIntelligence` component. Here's how it works:

1. **User Query**: When a user submits a query, the system first tries to use the RAG service.
2. **Context Retrieval**: The RAG service retrieves the most relevant context from the knowledge base.
3. **Response Generation**: The LLM generates a response using the retrieved context.
4. **Fallback**: If the RAG service fails, the system falls back to other methods (Python services, direct AI, etc.).

## Initialization

To initialize the RAG service with sample data:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env to include your API keys

# Initialize the RAG service with sample data
node scripts/initRagService.js
```

## Environment Variables

Add these to your `.env` file:

```env
# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# MongoDB (for document storage)
MONGODB_URI=your-mongodb-uri
```

## Best Practices

1. **Context Management**:
   - Keep context relevant and concise
   - Use appropriate metadata for filtering
   - Regularly update the knowledge base

2. **Error Handling**:
   - Implement proper error handling for API calls
   - Use fallback mechanisms when the RAG service is unavailable
   - Log errors for monitoring and debugging

3. **Performance**:
   - Cache frequent queries
   - Use appropriate limits for context retrieval
   - Monitor API usage and costs

## Troubleshooting

### Common Issues

1. **Rate Limiting**:
   - Check your API rate limits
   - Implement exponential backoff for retries
   - Consider using a queue for high-volume requests

2. **Poor Quality Results**:
   - Review and improve the quality of documents in the knowledge base
   - Adjust the `minScore` parameter for context retrieval
   - Add more specific metadata for better filtering

3. **Slow Responses**:
   - Check the performance of your vector database
   - Consider using a CDN for static content
   - Optimize your queries and indexes

## Future Enhancements

1. **Fine-tuning**: Fine-tune the model on domain-specific data for better performance.
2. **Multi-modal Support**: Add support for images, charts, and other media types.
3. **User Feedback**: Implement a feedback system to improve result quality over time.
4. **Automated Updates**: Set up automated processes to keep the knowledge base up-to-date.
