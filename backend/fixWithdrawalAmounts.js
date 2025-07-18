const mongoose = require('mongoose');
const SmartContract = require('./models/smartContract');
const Transaction = require('./models/transaction');

async function fixWithdrawalAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== FIXING WITHDRAWAL AMOUNTS FOR STAKING CONTRACT ===\n');
    
    // Find the staking contract
    const stakingContract = await SmartContract.findOne({ 
      address: { $regex: '0xd3e8cD2eDbf252860E02ffb245fD654b1ab30f30', $options: 'i' }
    });
    
    if (!stakingContract) {
      console.log('Staking contract not found');
      mongoose.disconnect();
      return;
    }
    
    console.log(`Found contract: ${stakingContract.name}`);
    console.log(`Contract ID: ${stakingContract.contractId}`);
    
    // Get all transactions for this contract, sorted by time
    const allTxs = await Transaction.find({ 
      contractId: stakingContract.contractId,
      'stakingAnalysis.isStaking': true
    }).sort({ block_time: 1 });
    
    console.log(`Found ${allTxs.length} staking transactions\n`);
    
    // Track wallet balances over time
    const walletBalances = new Map();
    let totalWithdrawn = 0;
    let withdrawalCount = 0;
    
    // First pass: build up wallet balances from stakes
    for (const tx of allTxs) {
      const walletAddress = tx.from_address;
      const method = tx.functionName || tx.method_name || '';
      
      if (!walletBalances.has(walletAddress)) {
        walletBalances.set(walletAddress, {
          totalStaked: 0,
          totalWithdrawn: 0,
          stakingHistory: []
        });
      }
      
      const wallet = walletBalances.get(walletAddress);
      
      // Extract amount from value_eth if available
      let amount = 0;
      if (tx.value_eth && tx.value_eth.includes('ZBU')) {
        const match = tx.value_eth.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          amount = parseFloat(match[1]);
        }
      }
      
      if (method.includes('create_lock') || method.includes('increase_amount')) {
        wallet.totalStaked += amount;
        wallet.stakingHistory.push({
          type: 'stake',
          amount: amount,
          time: tx.block_time,
          hash: tx.tx_hash
        });
      }
    }
    
    // Second pass: process withdrawals
    for (const tx of allTxs) {
      const walletAddress = tx.from_address;
      const method = tx.functionName || tx.method_name || '';
      
      if (method.includes('withdraw')) {
        const wallet = walletBalances.get(walletAddress);
        if (!wallet) continue;
        
        // Calculate available balance at withdrawal time
        let availableBalance = 0;
        wallet.stakingHistory.forEach(stake => {
          if (new Date(stake.time) < new Date(tx.block_time)) {
            availableBalance += stake.amount;
          }
        });
        
        // Subtract any previous withdrawals
        availableBalance -= wallet.totalWithdrawn;
        
        if (availableBalance > 0) {
          // Update the withdrawal transaction with the amount
          const formattedAmount = `${availableBalance} ZBU`;
          
          await Transaction.updateOne(
            { _id: tx._id },
            { 
              $set: { 
                value_eth: formattedAmount,
                'stakingAnalysis.details.amount': formattedAmount
              }
            }
          );
          
          // Update wallet balance
          wallet.totalWithdrawn += availableBalance;
          totalWithdrawn += availableBalance;
          withdrawalCount++;
          
          console.log(`✅ Fixed withdrawal: ${tx.tx_hash?.substring(0, 10)}... - ${availableBalance} ZBU`);
          console.log(`   Wallet: ${walletAddress?.substring(0, 10)}...`);
          console.log(`   Method: ${method}`);
          console.log();
        }
      }
    }
    
    console.log('=== WITHDRAWAL FIX COMPLETE ===');
    console.log(`Total withdrawals processed: ${withdrawalCount}`);
    console.log(`Total withdrawn amount: ${totalWithdrawn.toFixed(2)} ZBU`);
    
    // Final verification
    const verificationTxs = await Transaction.find({ 
      contractId: stakingContract.contractId,
      'stakingAnalysis.isStaking': true,
      $or: [
        { 'functionName': { $regex: 'withdraw', $options: 'i' } },
        { 'method_name': { $regex: 'withdraw', $options: 'i' } }
      ],
      value_eth: { $regex: 'ZBU', $options: 'i' }
    });
    
    console.log(`\n✅ Verified: ${verificationTxs.length} withdrawal transactions now have amounts`);
    
    // Show sample withdrawal transactions
    console.log('\n=== SAMPLE WITHDRAWAL TRANSACTIONS ===');
    verificationTxs.slice(0, 5).forEach((tx, index) => {
      console.log(`${index + 1}. Hash: ${tx.tx_hash?.substring(0, 10)}...`);
      console.log(`   Method: ${tx.functionName || tx.method_name || 'N/A'}`);
      console.log(`   Amount: ${tx.value_eth}`);
      console.log(`   From: ${tx.from_address?.substring(0, 10)}...`);
      console.log();
    });
    
    // Calculate final totals
    const finalStakingTxs = await Transaction.find({ 
      contractId: stakingContract.contractId,
      'stakingAnalysis.isStaking': true,
      value_eth: { $regex: 'ZBU', $options: 'i' }
    });
    
    let finalTotalStaked = 0;
    let finalTotalWithdrawn = 0;
    
    finalStakingTxs.forEach(tx => {
      const method = tx.functionName || tx.method_name || '';
      const match = tx.value_eth.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const amount = parseFloat(match[1]);
        if (method.includes('create_lock') || method.includes('increase_amount')) {
          finalTotalStaked += amount;
        } else if (method.includes('withdraw')) {
          finalTotalWithdrawn += amount;
        }
      }
    });
    
    console.log('\n=== FINAL STAKING SUMMARY ===');
    console.log(`Total Staked: ${finalTotalStaked.toFixed(2)} ZBU`);
    console.log(`Total Withdrawn: ${finalTotalWithdrawn.toFixed(2)} ZBU`);
    console.log(`Net Staked: ${(finalTotalStaked - finalTotalWithdrawn).toFixed(2)} ZBU`);
    console.log(`Transactions with amounts: ${finalStakingTxs.length} / 807`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

fixWithdrawalAmounts(); 