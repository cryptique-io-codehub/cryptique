// RAG Service for AI-Powered Analytics Insights
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Analytics = require('../models/analytics');
const Session = require('../models/session');
const TimeseriesStat = require('../models/timeseriesStats');
const GranularEvent = require('../models/granularEvents');

class RAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  /**
   * Generate embeddings for text data
   */
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get comprehensive analytics context for a site
   */
  async getAnalyticsContext(siteId, timeRange = '30d') {
    try {
      // Get basic analytics
      const analytics = await Analytics.findOne({ siteId });
      
      // Get time series data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));
      
      const timeseriesData = await TimeseriesStat.find({
        'metadata.siteId': siteId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });

      // Get recent sessions
      const recentSessions = await Session.find({
        siteId,
        startTime: { $gte: startDate }
      }).limit(100).sort({ startTime: -1 });

      // Get recent events
      const recentEvents = await GranularEvent.find({
        siteId,
        timestamp: { $gte: startDate }
      }).limit(200).sort({ timestamp: -1 });

      return {
        analytics,
        timeseriesData,
        recentSessions,
        recentEvents,
        timeRange,
        siteId
      };
    } catch (error) {
      console.error('Error getting analytics context:', error);
      throw error;
    }
  }

  /**
   * Generate AI insights for analytics data
   */
  async generateInsights(siteId, query = null, timeRange = '30d') {
    try {
      const context = await this.getAnalyticsContext(siteId, timeRange);
      
      // Prepare context for AI
      const analyticsText = this.formatAnalyticsForAI(context);
      
      // Default query if none provided
      const defaultQuery = `Analyze the website analytics data and provide insights on:
        1. Traffic patterns and trends
        2. User behavior insights
        3. Web3 user engagement
        4. Performance recommendations
        5. Conversion opportunities`;

      const userQuery = query || defaultQuery;
      
      const prompt = `
You are an expert web3 analytics consultant analyzing website data for Cryptique Analytics.

ANALYTICS DATA:
${analyticsText}

USER QUERY: ${userQuery}

Please provide detailed, actionable insights based on the data. Structure your response with:
1. Key Findings
2. Trends Analysis
3. Web3 Specific Insights
4. Recommendations
5. Action Items

Be specific and reference actual numbers from the data when possible.
`;

      const result = await this.model.generateContent(prompt);
      const insights = result.response.text();

      // Store the query and response for future reference
      await this.storeQueryResponse(siteId, userQuery, insights, context);

      return {
        insights,
        query: userQuery,
        dataPoints: this.extractDataPoints(context),
        timestamp: new Date(),
        siteId
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  /**
   * Format analytics data for AI consumption
   */
  formatAnalyticsForAI(context) {
    const { analytics, timeseriesData, recentSessions, recentEvents } = context;
    
    let text = '';

    // Basic metrics
    if (analytics && analytics.summaryMetrics) {
      text += `SUMMARY METRICS:
- Total Visitors: ${analytics.summaryMetrics.totalVisitors || 0}
- Unique Visitors: ${analytics.summaryMetrics.uniqueVisitors || 0}
- Web3 Visitors: ${analytics.summaryMetrics.web3Visitors || 0}
- Total Page Views: ${analytics.summaryMetrics.totalPageViews || 0}
- Wallets Connected: ${analytics.summaryMetrics.walletsConnected || 0}
- New Visitors: ${analytics.summaryMetrics.newVisitors || 0}
- Returning Visitors: ${analytics.summaryMetrics.returningVisitors || 0}

`;
    }

    // Time series trends
    if (timeseriesData && timeseriesData.length > 0) {
      const dailyData = timeseriesData.filter(d => d.metadata.granularity === 'daily');
      text += `DAILY TRENDS (Last ${dailyData.length} days):
`;
      dailyData.slice(-7).forEach(day => {
        text += `- ${day.timestamp.toISOString().split('T')[0]}: ${day.metrics.visitors} visitors, ${day.metrics.web3Users} web3 users, ${day.metrics.pageViews} page views
`;
      });
      text += '\n';
    }

    // Session insights
    if (recentSessions && recentSessions.length > 0) {
      const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
      const web3Sessions = recentSessions.filter(s => s.web3Data && s.web3Data.walletConnected).length;
      
      text += `SESSION INSIGHTS:
- Total Recent Sessions: ${recentSessions.length}
- Web3 Sessions: ${web3Sessions} (${((web3Sessions/recentSessions.length)*100).toFixed(1)}%)
- Average Session Duration: ${Math.round(avgDuration)} seconds
- Top Countries: ${this.getTopCountries(recentSessions)}

`;
    }

    // Event insights
    if (recentEvents && recentEvents.length > 0) {
      const eventTypes = {};
      recentEvents.forEach(event => {
        eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
      });
      
      text += `RECENT EVENTS:
- Total Events: ${recentEvents.length}
- Event Breakdown: ${Object.entries(eventTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

`;
    }

    return text;
  }

  /**
   * Extract key data points from context
   */
  extractDataPoints(context) {
    const { analytics, timeseriesData, recentSessions, recentEvents } = context;
    
    return {
      totalVisitors: analytics?.summaryMetrics?.totalVisitors || 0,
      web3Visitors: analytics?.summaryMetrics?.web3Visitors || 0,
      conversionRate: analytics?.summaryMetrics?.web3Visitors && analytics?.summaryMetrics?.totalVisitors 
        ? ((analytics.summaryMetrics.web3Visitors / analytics.summaryMetrics.totalVisitors) * 100).toFixed(2)
        : 0,
      recentSessionsCount: recentSessions?.length || 0,
      recentEventsCount: recentEvents?.length || 0,
      timeseriesDataPoints: timeseriesData?.length || 0
    };
  }

  /**
   * Get top countries from sessions
   */
  getTopCountries(sessions) {
    const countries = {};
    sessions.forEach(session => {
      if (session.geoData && session.geoData.country) {
        countries[session.geoData.country] = (countries[session.geoData.country] || 0) + 1;
      }
    });
    
    return Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([country, count]) => `${country} (${count})`)
      .join(', ');
  }

  /**
   * Store query and response for future reference
   */
  async storeQueryResponse(siteId, query, response, context) {
    try {
      // You can implement this to store in a dedicated collection
      // For now, we'll just log it
      console.log(`Stored AI query for site ${siteId}:`, {
        query: query.substring(0, 100) + '...',
        responseLength: response.length,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error storing query response:', error);
    }
  }

  /**
   * Generate natural language summary of analytics
   */
  async generateSummary(siteId, timeRange = '7d') {
    try {
      const context = await this.getAnalyticsContext(siteId, timeRange);
      const analyticsText = this.formatAnalyticsForAI(context);

      const prompt = `
Based on this website analytics data, provide a concise 2-3 sentence summary highlighting the most important insights:

${analyticsText}

Focus on the key metrics, trends, and any notable web3 engagement patterns.
`;

      const result = await this.model.generateContent(prompt);
      return {
        summary: result.response.text(),
        siteId,
        timeRange,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Answer specific questions about analytics data
   */
  async answerQuestion(siteId, question, timeRange = '30d') {
    try {
      const context = await this.getAnalyticsContext(siteId, timeRange);
      const analyticsText = this.formatAnalyticsForAI(context);

      const prompt = `
You are an analytics expert. Answer this specific question about the website data:

QUESTION: ${question}

ANALYTICS DATA:
${analyticsText}

Provide a clear, specific answer based on the available data. If the data doesn't contain enough information to answer the question, say so and suggest what additional data might be needed.
`;

      const result = await this.model.generateContent(prompt);
      return {
        question,
        answer: result.response.text(),
        siteId,
        timeRange,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations for improving web3 conversion
   */
  async generateWeb3Recommendations(siteId, timeRange = '30d') {
    try {
      const context = await this.getAnalyticsContext(siteId, timeRange);
      const analyticsText = this.formatAnalyticsForAI(context);

      const prompt = `
As a Web3 UX expert, analyze this website data and provide specific recommendations to improve Web3 user conversion and engagement:

${analyticsText}

Provide actionable recommendations in these categories:
1. Wallet Connection Optimization
2. User Onboarding Improvements
3. Web3 Feature Engagement
4. Conversion Funnel Optimization
5. Technical Improvements

Be specific and prioritize recommendations by potential impact.
`;

      const result = await this.model.generateContent(prompt);
      return {
        recommendations: result.response.text(),
        siteId,
        timeRange,
        timestamp: new Date(),
        category: 'web3_optimization'
      };
    } catch (error) {
      console.error('Error generating web3 recommendations:', error);
      throw error;
    }
  }
}

module.exports = RAGService; 