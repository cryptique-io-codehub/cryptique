const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

async function fixWithdrawalAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== FIXING WITHDRAWAL AMOUNTS ===\n');
    
    // Find all withdrawal transactions
    const withdrawalTxs = await Transaction.find({
      $or: [
        { 'functionName': { $regex: 'withdraw', $options: 'i' } },
        { 'method_name': { $regex: 'withdraw', $options: 'i' } }
      ]
    });

    console.log(`Found ${withdrawalTxs.length} withdrawal transactions\n`);

    // Get all create_lock transactions to map amounts
    const lockTxs = await Transaction.find({
      'stakingAnalysis.stakingType': 'create_lock'
    }).sort({ block_time: 1 });

    // Create a map of wallet addresses to their locked amounts
    const walletLocks = new Map();
    
    // Track amounts for each wallet
    lockTxs.forEach(tx => {
      const from = tx.from_address;
      if (!from) return;
      
      if (!walletLocks.has(from)) {
        walletLocks.set(from, {
          totalLocked: 0,
          transactions: []
        });
      }
      
      const amount = extractAmount(tx);
      if (amount > 0) {
        walletLocks.get(from).totalLocked += amount;
        walletLocks.get(from).transactions.push({
          hash: tx.tx_hash,
          amount: amount,
          time: tx.block_time
        });
      }
    });

    // Process increase_amount transactions
    const increaseTxs = await Transaction.find({
      'stakingAnalysis.stakingType': 'increase_amount'
    }).sort({ block_time: 1 });

    increaseTxs.forEach(tx => {
      const from = tx.from_address;
      if (!from || !walletLocks.has(from)) return;
      
      const amount = extractAmount(tx);
      if (amount > 0) {
        walletLocks.get(from).totalLocked += amount;
        walletLocks.get(from).transactions.push({
          hash: tx.tx_hash,
          amount: amount,
          time: tx.block_time
        });
      }
    });

    // Now process withdrawals and update their amounts
    let updatedCount = 0;
    for (const tx of withdrawalTxs) {
      const from = tx.from_address;
      if (!from || !walletLocks.has(from)) continue;
      
      const walletData = walletLocks.get(from);
      const withdrawalTime = new Date(tx.block_time);
      
      // Calculate available amount at withdrawal time
      let availableAmount = 0;
      walletData.transactions.forEach(lockTx => {
        if (new Date(lockTx.time) < withdrawalTime) {
          availableAmount += lockTx.amount;
        }
      });
      
      // Update transaction with withdrawal amount
      const updates = {
        value_eth: `${availableAmount} ZBU`,
        'stakingAnalysis.details.amount': `${availableAmount} ZBU`
      };
      
      await Transaction.updateOne(
        { _id: tx._id },
        { $set: updates }
      );
      
      console.log(`Updated withdrawal transaction ${tx.tx_hash}:`);
      console.log(`  From: ${from}`);
      console.log(`  Amount: ${availableAmount} ZBU`);
      console.log(`  Time: ${withdrawalTime}`);
      console.log();
      
      updatedCount++;
      
      // Subtract withdrawn amount from wallet's total
      walletLocks.get(from).totalLocked -= availableAmount;
    }

    console.log(`\nUpdated ${updatedCount} withdrawal transactions`);
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

// Helper function to extract amount from transaction
function extractAmount(tx) {
  try {
    // Try to get from stakingAnalysis details first
    if (tx.stakingAnalysis?.details?.amount) {
      const match = tx.stakingAnalysis.details.amount.match(/(\d+(\.\d+)?)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }
    
    // Try value_eth field
    if (tx.value_eth) {
      const match = tx.value_eth.match(/(\d+(\.\d+)?)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }
    
    // Try to extract from input data
    if (tx.input_data) {
      const valueHex = tx.input_data.substring(10, 74);
      if (valueHex) {
        const value = parseInt(valueHex, 16);
        if (!isNaN(value)) {
          return value / 1e18; // Convert from wei to token units
        }
      }
    }
    
    return 0;
  } catch (error) {
    console.error('Error extracting amount:', error);
    return 0;
  }
}

fixWithdrawalAmounts(); 