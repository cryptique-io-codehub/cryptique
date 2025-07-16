const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   POST /api/rag/retrieve
 * @desc    Retrieve relevant context for a query
 * @access  Private
 */
router.post('/retrieve', authenticateToken, async (req, res) => {
  try {
    const { query, siteId, limit, minScore } = req.body;
    const userId = req.user.id;

    if (!query || !siteId) {
      return res.status(400).json({
        success: false,
        error: 'Query and siteId are required',
      });
    }

    // Verify user has access to this site
    // Add your site access verification logic here

    const result = await ragService.retrieveContext(query, siteId, {
      limit: limit || 5,
      minScore: minScore || 0.6,
      includeMetadata: true,
      filters: {
        // Add any additional filters here
      },
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: {
        context: result.context,
        sources: result.sources,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error('Error in RAG retrieve endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/rag/generate
 * @desc    Generate a response using RAG
 * @access  Private
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { query, siteId, contextLimit, maxTokens, temperature } = req.body;
    const userId = req.user.id;

    if (!query || !siteId) {
      return res.status(400).json({
        success: false,
        error: 'Query and siteId are required',
      });
    }

    // Verify user has access to this site
    // Add your site access verification logic here

    const result = await ragService.generateResponse(query, siteId, {
      contextLimit: contextLimit || 3,
      maxTokens: maxTokens || 1000,
      temperature: temperature || 0.7,
      includeSources: true,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: {
        content: result.content,
        sources: result.sources,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error('Error in RAG generate endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/rag/documents
 * @desc    Add a document to the knowledge base
 * @access  Private (Admin)
 */
router.post('/documents', authenticateToken, async (req, res) => {
  try {
    const { text, metadata = {}, siteId } = req.body;
    const userId = req.user.id;

    if (!text || !siteId) {
      return res.status(400).json({
        success: false,
        error: 'Text and siteId are required',
      });
    }

    // Verify user has admin access to this site
    // Add your admin access verification logic here

    const result = await ragService.addDocument(text, {
      ...metadata,
      siteId,
      addedBy: userId,
      source: metadata.source || 'manual-upload',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: {
        id: result.id,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
