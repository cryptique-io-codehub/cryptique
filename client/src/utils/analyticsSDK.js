import axiosInstance from '../axiosInstance';

class Analytics {
  static async getSessions() {
    try {
      const response = await axiosInstance.get('/analytics/sessions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  static async getOnChainTransactions() {
    try {
      const response = await axiosInstance.get('/analytics/transactions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  static async getTrafficSources() {
    try {
      const response = await axiosInstance.get('/analytics/traffic-sources');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching traffic sources:', error);
      return [];
    }
  }

  static async getUserEngagement() {
    try {
      const response = await axiosInstance.get('/analytics/engagement');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return [];
    }
  }

  static async getWalletActivity() {
    try {
      const response = await axiosInstance.get('/analytics/wallet-activity');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching wallet activity:', error);
      return [];
    }
  }

  static async getConversionMetrics() {
    try {
      const response = await axiosInstance.get('/analytics/conversions');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching conversion metrics:', error);
      return [];
    }
  }

  // Helper methods for data processing
  static processSessionData(sessions) {
    return sessions.map(session => ({
      ...session,
      timestamp: new Date(session.timestamp),
      duration: session.duration || 0,
      pageViews: session.pageViews || 0,
      transactions: session.transactions || 0
    }));
  }

  static processTransactionData(transactions) {
    return transactions.map(tx => ({
      ...tx,
      timestamp: new Date(tx.timestamp),
      value: parseFloat(tx.value) || 0,
      gasUsed: parseInt(tx.gasUsed) || 0
    }));
  }

  // Data aggregation methods
  static aggregateByDate(data, key = 'timestamp') {
    const aggregated = {};
    data.forEach(item => {
      const date = new Date(item[key]).toISOString().split('T')[0];
      if (!aggregated[date]) {
        aggregated[date] = {
          date,
          count: 0,
          total: 0
        };
      }
      aggregated[date].count++;
      aggregated[date].total += item.value || 0;
    });
    return Object.values(aggregated);
  }

  static aggregateBySource(data) {
    const aggregated = {};
    data.forEach(item => {
      const source = item.source || 'Direct';
      if (!aggregated[source]) {
        aggregated[source] = {
          source,
          count: 0,
          total: 0
        };
      }
      aggregated[source].count++;
      aggregated[source].total += item.value || 0;
    });
    return Object.values(aggregated);
  }
}

export default Analytics; 