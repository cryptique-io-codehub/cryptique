import { Analytics } from './analyticsSDK';

// Process traffic source data
export const TrafficSource = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    const sources = {};
    
    sessions.forEach(session => {
      const source = session.source || 'Direct';
      if (!sources[source]) {
        sources[source] = {
          name: source,
          visitors: 0,
          web3Users: 0,
          wallets: 0,
          conversionRate: 0
        };
      }
      sources[source].visitors++;
      if (session.hasWallet) sources[source].web3Users++;
      if (session.walletConnected) sources[source].wallets++;
    });

    // Calculate conversion rates
    Object.values(sources).forEach(source => {
      source.conversionRate = (source.wallets / source.visitors) * 100;
    });

    return Object.values(sources);
  }
};

// Process user engagement data
export const UserEngagement = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    const engagement = {};
    
    sessions.forEach(session => {
      const date = new Date(session.timestamp).toISOString().split('T')[0];
      if (!engagement[date]) {
        engagement[date] = {
          date,
          sessions: 0,
          avgDuration: 0,
          totalDuration: 0,
          pageViews: 0
        };
      }
      engagement[date].sessions++;
      engagement[date].totalDuration += session.duration || 0;
      engagement[date].pageViews += session.pageViews || 0;
    });

    // Calculate averages
    Object.values(engagement).forEach(day => {
      day.avgDuration = day.totalDuration / day.sessions;
    });

    return Object.values(engagement);
  }
};

// Process wallet activity data
export const WalletActivity = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    const activity = {};
    
    sessions.forEach(session => {
      if (session.walletConnected) {
        const date = new Date(session.timestamp).toISOString().split('T')[0];
        if (!activity[date]) {
          activity[date] = {
            date,
            connections: 0,
            transactions: 0,
            uniqueWallets: new Set()
          };
        }
        activity[date].connections++;
        activity[date].transactions += session.transactions || 0;
        activity[date].uniqueWallets.add(session.walletAddress);
      }
    });

    // Convert Sets to counts
    return Object.values(activity).map(day => ({
      ...day,
      uniqueWallets: day.uniqueWallets.size
    }));
  }
};

// Process conversion metrics
export const ConversionMetrics = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    const metrics = {};
    
    sessions.forEach(session => {
      const source = session.source || 'Direct';
      if (!metrics[source]) {
        metrics[source] = {
          source,
          visitors: 0,
          web3Users: 0,
          wallets: 0,
          transactions: 0
        };
      }
      metrics[source].visitors++;
      if (session.hasWallet) metrics[source].web3Users++;
      if (session.walletConnected) {
        metrics[source].wallets++;
        metrics[source].transactions += session.transactions || 0;
      }
    });

    return Object.values(metrics);
  }
};

// Process session data
export const SessionData = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    return sessions.map(session => ({
      timestamp: new Date(session.timestamp),
      source: session.source || 'Direct',
      hasWallet: session.hasWallet,
      walletConnected: session.walletConnected,
      duration: session.duration || 0,
      pageViews: session.pageViews || 0,
      transactions: session.transactions || 0
    }));
  }
};

// Process on-chain data
export const OnChainData = {
  getData: async () => {
    const sessions = await Analytics.getSessions();
    const transactions = await Analytics.getOnChainTransactions();
    const data = {};

    // Process transaction data
    transactions.forEach(tx => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      if (!data[date]) {
        data[date] = {
          date,
          totalVolume: 0,
          transactionCount: 0,
          averageValue: 0,
          uniqueWallets: new Set(),
          gasUsed: 0,
          contractInteractions: {}
        };
      }

      data[date].totalVolume += tx.value;
      data[date].transactionCount++;
      data[date].gasUsed += tx.gasUsed;
      data[date].uniqueWallets.add(tx.from);
      data[date].uniqueWallets.add(tx.to);

      // Track contract interactions
      if (tx.contractAddress) {
        if (!data[date].contractInteractions[tx.contractAddress]) {
          data[date].contractInteractions[tx.contractAddress] = {
            count: 0,
            volume: 0
          };
        }
        data[date].contractInteractions[tx.contractAddress].count++;
        data[date].contractInteractions[tx.contractAddress].volume += tx.value;
      }
    });

    // Calculate averages and format data
    return Object.values(data).map(day => ({
      ...day,
      averageValue: day.totalVolume / day.transactionCount,
      uniqueWallets: day.uniqueWallets.size,
      contractInteractions: Object.entries(day.contractInteractions).map(([address, stats]) => ({
        address,
        ...stats
      }))
    }));
  },

  getContractMetrics: async (contractAddress) => {
    const transactions = await Analytics.getOnChainTransactions();
    const metrics = {
      totalVolume: 0,
      transactionCount: 0,
      uniqueUsers: new Set(),
      averageGasUsed: 0,
      timeSeries: {}
    };

    transactions
      .filter(tx => tx.contractAddress === contractAddress)
      .forEach(tx => {
        const date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (!metrics.timeSeries[date]) {
          metrics.timeSeries[date] = {
            volume: 0,
            count: 0,
            gasUsed: 0
          };
        }

        metrics.totalVolume += tx.value;
        metrics.transactionCount++;
        metrics.uniqueUsers.add(tx.from);
        metrics.uniqueUsers.add(tx.to);
        metrics.averageGasUsed += tx.gasUsed;

        metrics.timeSeries[date].volume += tx.value;
        metrics.timeSeries[date].count++;
        metrics.timeSeries[date].gasUsed += tx.gasUsed;
      });

    metrics.averageGasUsed /= metrics.transactionCount;
    metrics.uniqueUsers = metrics.uniqueUsers.size;

    return {
      ...metrics,
      timeSeries: Object.entries(metrics.timeSeries).map(([date, stats]) => ({
        date,
        ...stats
      }))
    };
  },

  getWalletMetrics: async (walletAddress) => {
    const transactions = await Analytics.getOnChainTransactions();
    const metrics = {
      totalVolume: 0,
      transactionCount: 0,
      averageValue: 0,
      contractsInteracted: new Set(),
      timeSeries: {}
    };

    transactions
      .filter(tx => tx.from === walletAddress || tx.to === walletAddress)
      .forEach(tx => {
        const date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (!metrics.timeSeries[date]) {
          metrics.timeSeries[date] = {
            volume: 0,
            count: 0
          };
        }

        metrics.totalVolume += tx.value;
        metrics.transactionCount++;
        if (tx.contractAddress) {
          metrics.contractsInteracted.add(tx.contractAddress);
        }

        metrics.timeSeries[date].volume += tx.value;
        metrics.timeSeries[date].count++;
      });

    metrics.averageValue = metrics.totalVolume / metrics.transactionCount;
    metrics.contractsInteracted = Array.from(metrics.contractsInteracted);

    return {
      ...metrics,
      timeSeries: Object.entries(metrics.timeSeries).map(([date, stats]) => ({
        date,
        ...stats
      }))
    };
  }
}; 