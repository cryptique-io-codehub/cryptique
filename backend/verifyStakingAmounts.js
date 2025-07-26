const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

// Helper function to properly parse transaction values by removing commas
const parseTransactionValue = (value) => {
  if (!value) return 0;
  const cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value.toString().replace(/,/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

async function verifyStakingAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== VERIFYING STAKING AMOUNTS ===\n');
    
    // Get all staking transactions
    const stakingTxs = await Transaction.find({
      'stakingAnalysis.isStaking': true,
      'stakingAnalysis.stakingType': { $in: ['create_lock', 'increase_amount'] }
    }).sort({ block_time: 1 });

    console.log(`Found ${stakingTxs.length} staking transactions\n`);

    let totalStaked = 0;
    let totalByType = {
      create_lock: 0,
      increase_amount: 0
    };

    const walletStakes = new Map();

    stakingTxs.forEach(tx => {
      const from = tx.from_address;
      const type = tx.stakingAnalysis.stakingType;
      let amount = 0;

      // Try multiple ways to extract amount
      if (tx.stakingAnalysis?.details?.amount) {
        const match = tx.stakingAnalysis.details.amount.match(/(\d+(\.\d+)?)/);
        if (match && match[1]) {
          amount = parseFloat(match[1]);
        }
      }

      if (amount === 0 && tx.value_eth) {
        amount = parseTransactionValue(tx.value_eth);
      }

      if (amount === 0 && tx.input) {
        const valueHex = tx.input.substring(10, 74);
        if (valueHex) {
          const value = parseInt(valueHex, 16);
          if (!isNaN(value)) {
            amount = value / 1e18;
          }
        }
      }

      // Log transaction details
      console.log(`Transaction: ${tx.tx_hash}`);
      console.log(`Type: ${type}`);
      console.log(`From: ${from}`);
      console.log(`Amount: ${amount} ZBU`);
      console.log(`Block Time: ${tx.block_time}`);
      console.log(`Raw value_eth: ${tx.value_eth}`);
      console.log(`Raw details amount: ${tx.stakingAnalysis?.details?.amount}`);
      console.log(`Raw input: ${tx.input?.substring(0, 100)}...`);
      console.log();

      if (amount > 0) {
        totalStaked += amount;
        totalByType[type] += amount;

        // Track by wallet
        if (!walletStakes.has(from)) {
          walletStakes.set(from, {
            total: 0,
            transactions: []
          });
        }
        const walletData = walletStakes.get(from);
        walletData.total += amount;
        walletData.transactions.push({
          hash: tx.tx_hash,
          type,
          amount,
          time: tx.block_time
        });
      }
    });

    console.log('\n=== STAKING TOTALS ===');
    console.log(`Total Staked: ${totalStaked.toFixed(2)} ZBU`);
    console.log(`Create Lock Total: ${totalByType.create_lock.toFixed(2)} ZBU`);
    console.log(`Increase Amount Total: ${totalByType.increase_amount.toFixed(2)} ZBU`);

    console.log('\n=== TOP STAKERS ===');
    const topStakers = Array.from(walletStakes.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    topStakers.forEach(([wallet, data]) => {
      console.log(`\nWallet: ${wallet}`);
      console.log(`Total Staked: ${data.total.toFixed(2)} ZBU`);
      console.log('Transactions:');
      data.transactions.forEach(tx => {
        console.log(`  ${tx.type}: ${tx.amount.toFixed(2)} ZBU (${new Date(tx.time).toLocaleString()})`);
      });
    });

    // Get all withdrawal transactions for comparison
    const withdrawalTxs = await Transaction.find({
      'stakingAnalysis.stakingType': { $in: ['withdraw', 'withdraw_early'] }
    });

    let totalWithdrawn = 0;
    withdrawalTxs.forEach(tx => {
      if (tx.value_eth) {
        const match = tx.value_eth.match(/(\d+(\.\d+)?)/);
        if (match && match[1]) {
          totalWithdrawn += parseFloat(match[1]);
        }
      }
    });

    console.log('\n=== CURRENT STAKING STATUS ===');
    console.log(`Total Staked: ${totalStaked.toFixed(2)} ZBU`);
    console.log(`Total Withdrawn: ${totalWithdrawn.toFixed(2)} ZBU`);
    console.log(`Currently Staked: ${(totalStaked - totalWithdrawn).toFixed(2)} ZBU`);
    console.log(`Number of Unique Stakers: ${walletStakes.size}`);

    // Check for any anomalies
    console.log('\n=== ANOMALY CHECK ===');
    stakingTxs.forEach(tx => {
      if (!tx.value_eth || tx.value_eth === '0 ZBU') {
        console.log(`Transaction with zero value: ${tx.tx_hash}`);
        console.log(`Method: ${tx.functionName || tx.method_name}`);
        console.log(`Input data: ${tx.input}`);
        console.log();
      }
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

verifyStakingAmounts(); 