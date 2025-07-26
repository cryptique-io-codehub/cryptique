const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

// Helper function to properly parse transaction values by removing commas
const parseTransactionValue = (value) => {
  if (!value) return 0;
  const cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value.toString().replace(/,/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

async function verifyTotalStaking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== VERIFYING TOTAL STAKING AMOUNTS ===\n');
    
    // Get all staking-related transactions
    const allTxs = await Transaction.find({
      $or: [
        { 'functionName': { $regex: 'create_lock|increase_amount|withdraw', $options: 'i' } },
        { 'method_name': { $regex: 'create_lock|increase_amount|withdraw', $options: 'i' } }
      ]
    }).sort({ block_time: 1 });

    console.log(`Found ${allTxs.length} total transactions\n`);

    // Track totals by wallet
    const walletTotals = new Map();
    let createLockTotal = 0;
    let increaseAmountTotal = 0;
    let withdrawTotal = 0;
    let earlyWithdrawTotal = 0;

    // Process transactions in chronological order
    allTxs.forEach(tx => {
      const from = tx.from_address;
      const method = tx.functionName || tx.method_name || '';
      let amount = 0;

      // Extract amount from value_eth
      if (tx.value_eth) {
        amount = parseTransactionValue(tx.value_eth);
      }

      // Extract from input data if value_eth is 0 or missing
      if (amount === 0 && tx.input) {
        const valueHex = tx.input.substring(10, 74);
        if (valueHex) {
          const value = parseInt(valueHex, 16);
          if (!isNaN(value)) {
            amount = value / 1e18;
          }
        }
      }

      // Initialize wallet tracking
      if (!walletTotals.has(from)) {
        walletTotals.set(from, {
          totalStaked: 0,
          totalWithdrawn: 0,
          transactions: []
        });
      }

      const wallet = walletTotals.get(from);

      // Log transaction details
      console.log(`\nTransaction: ${tx.tx_hash}`);
      console.log(`Method: ${method}`);
      console.log(`From: ${from}`);
      console.log(`Amount: ${amount} ZBU`);
      console.log(`Block Time: ${tx.block_time}`);
      console.log(`Raw value_eth: ${tx.value_eth}`);
      console.log(`Raw input: ${tx.input?.substring(0, 100)}...`);

      // Update totals based on transaction type
      if (method.includes('create_lock')) {
        createLockTotal += amount;
        wallet.totalStaked += amount;
        wallet.transactions.push({
          type: 'create_lock',
          amount,
          time: tx.block_time
        });
      } else if (method.includes('increase_amount')) {
        increaseAmountTotal += amount;
        wallet.totalStaked += amount;
        wallet.transactions.push({
          type: 'increase_amount',
          amount,
          time: tx.block_time
        });
      } else if (method.includes('withdraw')) {
        if (method.includes('withdraw_early')) {
          earlyWithdrawTotal += amount;
        } else {
          withdrawTotal += amount;
        }
        wallet.totalWithdrawn += amount;
        wallet.transactions.push({
          type: method.includes('withdraw_early') ? 'withdraw_early' : 'withdraw',
          amount,
          time: tx.block_time
        });
      }
    });

    // Calculate final totals
    const totalStaked = createLockTotal + increaseAmountTotal;
    const totalWithdrawn = withdrawTotal + earlyWithdrawTotal;
    const netStaked = totalStaked - totalWithdrawn;

    console.log('\n=== STAKING TOTALS ===');
    console.log(`Create Lock Total: ${createLockTotal.toFixed(2)} ZBU`);
    console.log(`Increase Amount Total: ${increaseAmountTotal.toFixed(2)} ZBU`);
    console.log(`Total Staked (Create + Increase): ${totalStaked.toFixed(2)} ZBU`);
    console.log('\n=== WITHDRAWAL TOTALS ===');
    console.log(`Regular Withdraw Total: ${withdrawTotal.toFixed(2)} ZBU`);
    console.log(`Early Withdraw Total: ${earlyWithdrawTotal.toFixed(2)} ZBU`);
    console.log(`Total Withdrawn (Regular + Early): ${totalWithdrawn.toFixed(2)} ZBU`);
    console.log('\n=== NET TOTALS ===');
    console.log(`Net Staked (Total Staked - Total Withdrawn): ${netStaked.toFixed(2)} ZBU`);

    // Show top stakers
    console.log('\n=== TOP STAKERS ===');
    const topStakers = Array.from(walletTotals.entries())
      .map(([address, data]) => ({
        address,
        totalStaked: data.totalStaked,
        totalWithdrawn: data.totalWithdrawn,
        netStaked: data.totalStaked - data.totalWithdrawn,
        transactions: data.transactions
      }))
      .sort((a, b) => b.totalStaked - a.totalStaked)
      .slice(0, 10);

    topStakers.forEach((staker, index) => {
      console.log(`\n${index + 1}. Wallet: ${staker.address}`);
      console.log(`   Total Staked: ${staker.totalStaked.toFixed(2)} ZBU`);
      console.log(`   Total Withdrawn: ${staker.totalWithdrawn.toFixed(2)} ZBU`);
      console.log(`   Net Position: ${staker.netStaked.toFixed(2)} ZBU`);
      console.log('   Transaction History:');
      staker.transactions.forEach(tx => {
        console.log(`   - ${tx.type}: ${tx.amount.toFixed(2)} ZBU (${new Date(tx.time).toLocaleString()})`);
      });
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

verifyTotalStaking(); 