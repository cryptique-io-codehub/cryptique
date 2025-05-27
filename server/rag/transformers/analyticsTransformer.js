const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatPercentage = (num) => {
  return `${Math.round(num)}%`;
};

const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  return `${Math.round(seconds / 3600)} hours`;
};

class AnalyticsTransformer {
  transformWebsiteAnalytics(analytics) {
    if (!analytics) return null;

    return {
      overview: this.generateOverview(analytics),
      userBehavior: this.generateUserBehavior(analytics),
      web3Metrics: this.generateWeb3Metrics(analytics),
      performance: this.generatePerformance(analytics)
    };
  }

  generateOverview(analytics) {
    const {
      totalVisitors,
      uniqueVisitors,
      web3Visitors,
      totalPageViews,
      newVisitors,
      returningVisitors
    } = analytics;

    return `
      This website received ${formatNumber(totalVisitors)} total visits from ${formatNumber(uniqueVisitors)} unique visitors. 
      ${formatNumber(web3Visitors)} visitors (${formatPercentage(web3Visitors/uniqueVisitors * 100)}) were Web3 users. 
      The site recorded ${formatNumber(totalPageViews)} total page views. 
      Of all visitors, ${formatNumber(newVisitors)} were new and ${formatNumber(returningVisitors)} were returning visitors, 
      showing a return rate of ${formatPercentage(returningVisitors/totalVisitors * 100)}.
    `.trim().replace(/\s+/g, ' ');
  }

  generateUserBehavior(analytics) {
    const { pageViews, entryPages, exitPages, commonPathways } = analytics;

    let description = 'User behavior analysis shows';

    // Add top pages
    if (pageViews && pageViews.size > 0) {
      const topPages = Array.from(pageViews.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      description += ` the most visited pages were: ${
        topPages.map(([page, views]) => 
          `${page} (${formatNumber(views)} views)`
        ).join(', ')
      }.`;
    }

    // Add entry pages
    if (entryPages && Object.keys(entryPages).length > 0) {
      const topEntries = Object.entries(entryPages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2);
      
      description += ` Most users begin their journey from ${
        topEntries.map(([page, count]) => 
          `${page} (${formatPercentage(count/Object.values(entryPages).reduce((a,b) => a+b, 0) * 100)} of entries)`
        ).join(' and ')
      }.`;
    }

    // Add common pathways
    if (commonPathways && commonPathways.length > 0) {
      const topPath = commonPathways[0];
      description += ` The most common user path is ${topPath.sequence.join(' → ')}, taken by ${formatNumber(topPath.count)} users.`;
    }

    return description.trim();
  }

  generateWeb3Metrics(analytics) {
    const { walletsConnected, wallets = [] } = analytics;

    let description = `Web3 engagement shows ${formatNumber(walletsConnected)} total wallet connections.`;

    // Add wallet types distribution if available
    const walletTypes = wallets.reduce((acc, w) => {
      acc[w.walletType] = (acc[w.walletType] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(walletTypes).length > 0) {
      const topWallets = Object.entries(walletTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2);
      
      description += ` The most popular wallet types are ${
        topWallets.map(([type, count]) => 
          `${type} (${formatPercentage(count/wallets.length * 100)})`
        ).join(' and ')
      }.`;
    }

    return description.trim();
  }

  generatePerformance(analytics) {
    const {
      avgSessionsPerUser,
      avgTimeBetweenSessions,
      bounceRate,
      avgDaysActive
    } = analytics;

    return `
      Performance metrics show an average of ${formatNumber(avgSessionsPerUser)} sessions per user, 
      with ${formatDuration(avgTimeBetweenSessions)} between visits. 
      The bounce rate is ${formatPercentage(bounceRate)}, 
      and users are active for an average of ${formatNumber(avgDaysActive)} days.
    `.trim().replace(/\s+/g, ' ');
  }

  transformContractAnalytics(contractData) {
    if (!contractData) return null;

    return {
      overview: this.generateContractOverview(contractData),
      userActivity: this.generateContractUserActivity(contractData),
      temporalPatterns: this.generateContractTemporalPatterns(contractData)
    };
  }

  generateContractOverview(contractData) {
    const {
      contractInfo,
      summary
    } = contractData;

    return `
      Smart contract ${contractInfo.name} (${contractInfo.address}) on ${contractInfo.blockchain} 
      has processed ${formatNumber(summary.totalTransactions)} transactions 
      with a total volume of ${formatNumber(summary.totalVolume)} ${contractInfo.tokenSymbol || 'tokens'}. 
      The average transaction value is ${formatNumber(summary.averageTransactionValue)} 
      ${contractInfo.tokenSymbol || 'tokens'}.
    `.trim().replace(/\s+/g, ' ');
  }

  generateContractUserActivity(contractData) {
    const {
      summary,
      walletAnalytics
    } = contractData;

    let description = `
      The contract has ${formatNumber(summary.uniqueUsers)} unique users 
      and ${formatNumber(summary.uniqueReceivers)} unique receivers.
    `;

    if (walletAnalytics.topSenders.length > 0) {
      const topSender = walletAnalytics.topSenders[0];
      description += ` The most active sender (${topSender.address}) 
        has made ${formatNumber(topSender.transactionCount)} transactions 
        with a total volume of ${formatNumber(topSender.volume)}.`;
    }

    return description.trim().replace(/\s+/g, ' ');
  }

  generateContractTemporalPatterns(contractData) {
    const {
      timeOfDayDistribution,
      dayOfWeekDistribution
    } = contractData;

    // Find peak activity time
    const peakTimeOfDay = Object.entries(timeOfDayDistribution)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Find most active day
    const peakDay = Object.entries(dayOfWeekDistribution)
      .sort(([,a], [,b]) => b - a)[0][0];

    return `
      Contract activity peaks during ${peakTimeOfDay} hours, 
      with ${peakDay} being the most active day of the week. 
      This pattern suggests the contract is most used during ${
        peakTimeOfDay === 'morning' || peakTimeOfDay === 'afternoon' 
          ? 'working hours' 
          : 'non-working hours'
      }.
    `.trim().replace(/\s+/g, ' ');
  }
}

module.exports = new AnalyticsTransformer(); 