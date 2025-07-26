const Campaign = require('../models/campaign');
const Session = require('../models/session');
const Transaction = require('../models/transaction');

class TransactionTrackingService {
  // Helper function to properly parse transaction values by removing commas
  parseTransactionValue(value) {
    if (!value) return 0;
    const cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value.toString().replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Process a new transaction and attribute it to relevant campaigns
   * @param {Object} transaction - The transaction object
   * @param {String} transaction.tx_hash - Transaction hash
   * @param {String} transaction.from_address - Sender wallet address
   * @param {String} transaction.contract_address - Contract address
   * @param {String} transaction.value_eth - Transaction value in native token
   * @param {String} transaction.chain - Chain name
   * @param {String} transaction.block_time - Transaction timestamp
   */
  async processTransaction(transaction) {
    try {
      // Find all sessions with this wallet address
      const sessions = await Session.find({
        'wallet.walletAddress': transaction.from_address
      }).sort({ startTime: -1 });

      if (!sessions.length) {
        console.log('No sessions found for wallet:', transaction.from_address);
        return;
      }

      // Get unique campaign IDs from all sessions
      const campaignIds = new Set();
      sessions.forEach(session => {
        if (session.utmData?.utm_id) {
          campaignIds.add(session.utmData.utm_id);
        }
      });

      if (!campaignIds.size) {
        console.log('No campaigns found for sessions');
        return;
      }

      // Update each campaign that this user has interacted with
      for (const utm_id of campaignIds) {
        const campaign = await Campaign.findOne({ utm_id });
        if (!campaign) continue;

        // Add transaction to campaign stats
        const txValue = this.parseTransactionValue(transaction.value_eth);
        
        // Add transaction to the list if not already exists
        const txExists = campaign.stats.transactions.some(tx => tx.txHash === transaction.tx_hash);
        if (!txExists) {
          campaign.stats.transactions.push({
            txHash: transaction.tx_hash,
            contractAddress: transaction.contract_address,
            walletAddress: transaction.from_address,
            value: txValue,
            timestamp: transaction.block_time,
            chainId: transaction.chain_id,
            chainName: transaction.chain
          });

          // Update unique transacted wallets
          if (!campaign.stats.uniqueTransactedWallets.includes(transaction.from_address)) {
            campaign.stats.uniqueTransactedWallets.push(transaction.from_address);
            campaign.stats.transactedUsers = campaign.stats.uniqueTransactedWallets.length;
          }

          // Update transaction values
          campaign.stats.totalTransactionValue += txValue;
          campaign.stats.conversionsValue = campaign.stats.totalTransactionValue;
          campaign.stats.averageTransactionValue = 
            campaign.stats.totalTransactionValue / campaign.stats.transactions.length;

          // Update conversion count
          campaign.stats.conversions = campaign.stats.transactions.length;

          // Calculate ROI if budget exists
          if (campaign.budget?.amount > 0) {
            campaign.stats.roi = 
              ((campaign.stats.totalTransactionValue - campaign.budget.amount) / 
              campaign.budget.amount) * 100;
          }

          await campaign.save();
          console.log(`Updated campaign ${campaign.name} with transaction ${transaction.tx_hash}`);
        }
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a campaign
   * @param {String} campaignId - Campaign ID
   */
  async getCampaignTransactionStats(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return {
        transactedUsers: campaign.stats.transactedUsers,
        uniqueWallets: campaign.stats.uniqueTransactedWallets.length,
        totalTransactions: campaign.stats.transactions.length,
        totalValue: campaign.stats.totalTransactionValue,
        averageValue: campaign.stats.averageTransactionValue,
        conversionsValue: campaign.stats.conversionsValue,
        roi: campaign.stats.roi
      };
    } catch (error) {
      console.error('Error getting campaign transaction stats:', error);
      throw error;
    }
  }
}

module.exports = new TransactionTrackingService(); 