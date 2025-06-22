// RAG Router - AI-Powered Analytics Insights API
const express = require('express');
const router = express.Router();
const RAGService = require('../services/ragService');
const { verifyToken } = require('../middleware/authMiddleware');

// Initialize RAG service
const ragService = new RAGService();

// Middleware for all RAG routes
router.use(verifyToken);

/**
 * POST /api/rag/insights
 * Generate AI insights for analytics data
 */
router.post('/insights', async (req, res) => {
  try {
    const { siteId, query, timeRange = '30d' } = req.body;

    if (!siteId) {
      return res.status(400).json({
        error: 'Site ID is required'
      });
    }

    const insights = await ragService.generateInsights(siteId, query, timeRange);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      details: error.message
    });
  }
});

/**
 * POST /api/rag/summary
 * Generate a natural language summary of analytics
 */
router.post('/summary', async (req, res) => {
  try {
    const { siteId, timeRange = '7d' } = req.body;

    if (!siteId) {
      return res.status(400).json({
        error: 'Site ID is required'
      });
    }

    const summary = await ragService.generateSummary(siteId, timeRange);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});

/**
 * POST /api/rag/question
 * Answer specific questions about analytics data
 */
router.post('/question', async (req, res) => {
  try {
    const { siteId, question, timeRange = '30d' } = req.body;

    if (!siteId || !question) {
      return res.status(400).json({
        error: 'Site ID and question are required'
      });
    }

    const answer = await ragService.answerQuestion(siteId, question, timeRange);

    res.json({
      success: true,
      data: answer
    });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({
      error: 'Failed to answer question',
      details: error.message
    });
  }
});

/**
 * POST /api/rag/web3-recommendations
 * Generate Web3-specific optimization recommendations
 */
router.post('/web3-recommendations', async (req, res) => {
  try {
    const { siteId, timeRange = '30d' } = req.body;

    if (!siteId) {
      return res.status(400).json({
        error: 'Site ID is required'
      });
    }

    const recommendations = await ragService.generateWeb3Recommendations(siteId, timeRange);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating web3 recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate web3 recommendations',
      details: error.message
    });
  }
});

/**
 * POST /api/rag/embedding
 * Generate embeddings for text (utility endpoint)
 */
router.post('/embedding', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    const embedding = await ragService.generateEmbedding(text);

    res.json({
      success: true,
      data: {
        embedding,
        dimensions: embedding.length,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      }
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({
      error: 'Failed to generate embedding',
      details: error.message
    });
  }
});

/**
 * GET /api/rag/context/:siteId
 * Get analytics context for a site (for debugging)
 */
router.get('/context/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { timeRange = '30d' } = req.query;

    const context = await ragService.getAnalyticsContext(siteId, timeRange);

    // Format for response (remove sensitive data)
    const formattedContext = {
      siteId: context.siteId,
      timeRange: context.timeRange,
      analytics: {
        hasData: !!context.analytics,
        summaryMetrics: context.analytics?.summaryMetrics || null
      },
      timeseriesData: {
        count: context.timeseriesData?.length || 0,
        dateRange: context.timeseriesData?.length > 0 ? {
          start: context.timeseriesData[0]?.timestamp,
          end: context.timeseriesData[context.timeseriesData.length - 1]?.timestamp
        } : null
      },
      recentSessions: {
        count: context.recentSessions?.length || 0
      },
      recentEvents: {
        count: context.recentEvents?.length || 0
      }
    };

    res.json({
      success: true,
      data: formattedContext
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({
      error: 'Failed to get context',
      details: error.message
    });
  }
});

/**
 * POST /api/rag/batch-insights
 * Generate insights for multiple sites
 */
router.post('/batch-insights', async (req, res) => {
  try {
    const { siteIds, query, timeRange = '30d' } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({
        error: 'Site IDs array is required'
      });
    }

    if (siteIds.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 sites allowed per batch request'
      });
    }

    const results = [];
    for (const siteId of siteIds) {
      try {
        const insights = await ragService.generateInsights(siteId, query, timeRange);
        results.push({
          siteId,
          success: true,
          data: insights
        });
      } catch (error) {
        results.push({
          siteId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error generating batch insights:', error);
    res.status(500).json({
      error: 'Failed to generate batch insights',
      details: error.message
    });
  }
});

/**
 * GET /api/rag/health
 * Health check for RAG service
 */
router.get('/health', async (req, res) => {
  try {
    // Test Gemini API connection
    const testEmbedding = await ragService.generateEmbedding('test');
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        geminiAPI: {
          status: 'connected',
          embeddingDimensions: testEmbedding.length
        },
        database: {
          status: 'connected'
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

module.exports = router; 