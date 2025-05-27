class AnalyticsChunker {
  chunkWebsiteAnalytics(transformedData, metadata) {
    if (!transformedData) return [];

    const chunks = [];
    const { siteId, domain, timestamp } = metadata;

    // Overview chunk
    if (transformedData.overview) {
      chunks.push({
        text: transformedData.overview,
        metadata: {
          type: 'website',
          domain,
          siteId,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'overview',
          metrics: ['visitors', 'pageviews', 'web3_users', 'retention']
        }
      });
    }

    // User behavior chunk
    if (transformedData.userBehavior) {
      chunks.push({
        text: transformedData.userBehavior,
        metadata: {
          type: 'website',
          domain,
          siteId,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'user_behavior',
          metrics: ['page_paths', 'entry_pages', 'user_flow']
        }
      });
    }

    // Web3 metrics chunk
    if (transformedData.web3Metrics) {
      chunks.push({
        text: transformedData.web3Metrics,
        metadata: {
          type: 'website',
          domain,
          siteId,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'web3',
          metrics: ['wallet_connections', 'wallet_types', 'web3_engagement']
        }
      });
    }

    // Performance chunk
    if (transformedData.performance) {
      chunks.push({
        text: transformedData.performance,
        metadata: {
          type: 'website',
          domain,
          siteId,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'performance',
          metrics: ['session_duration', 'bounce_rate', 'user_retention']
        }
      });
    }

    return chunks;
  }

  chunkContractAnalytics(transformedData, metadata) {
    if (!transformedData) return [];

    const chunks = [];
    const { contractId, contractAddress, blockchain, timestamp } = metadata;

    // Overview chunk
    if (transformedData.overview) {
      chunks.push({
        text: transformedData.overview,
        metadata: {
          type: 'contract',
          contractId,
          contractAddress,
          blockchain,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'overview',
          metrics: ['transactions', 'volume', 'average_value']
        }
      });
    }

    // User activity chunk
    if (transformedData.userActivity) {
      chunks.push({
        text: transformedData.userActivity,
        metadata: {
          type: 'contract',
          contractId,
          contractAddress,
          blockchain,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'user_activity',
          metrics: ['unique_users', 'unique_receivers', 'top_senders']
        }
      });
    }

    // Temporal patterns chunk
    if (transformedData.temporalPatterns) {
      chunks.push({
        text: transformedData.temporalPatterns,
        metadata: {
          type: 'contract',
          contractId,
          contractAddress,
          blockchain,
          timestamp,
          timeframe: 'realtime',
          dataCategory: 'temporal_patterns',
          metrics: ['time_distribution', 'day_distribution', 'peak_activity']
        }
      });
    }

    return chunks;
  }

  // Helper method to combine chunks from multiple sources
  combineChunks(websiteChunks, contractChunks) {
    return [...websiteChunks, ...contractChunks].map((chunk, index) => ({
      ...chunk,
      id: `chunk_${index}`,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = new AnalyticsChunker(); 