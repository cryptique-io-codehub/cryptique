const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

async function checkStakingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== CHECKING STAKING DATA ===\n');
    
    // Get total transactions
    const totalTxs = await Transaction.countDocuments();
    console.log(`Total transactions: ${totalTxs}`);
    
    // Get staking transactions
    const stakingTxs = await Transaction.countDocuments({'stakingAnalysis.isStaking': true});
    console.log(`Staking transactions: ${stakingTxs}`);
    
    // Get transactions with staking type
    const escrowTxs = await Transaction.countDocuments({'stakingAnalysis.stakingType': {$exists: true}});
    console.log(`Transactions with staking type: ${escrowTxs}`);
    
    // Get transactions with function names that might be staking
    const potentialStakingTxs = await Transaction.countDocuments({
      $or: [
        { 'functionName': { $regex: 'stake|lock|withdraw|deposit', $options: 'i' } },
        { 'method_name': { $regex: 'stake|lock|withdraw|deposit', $options: 'i' } }
      ]
    });
    console.log(`Potential staking transactions (by function name): ${potentialStakingTxs}`);
    
    // Get sample transactions
    const sampleTxs = await Transaction.find().limit(10);
    console.log('\n=== SAMPLE TRANSACTIONS ===');
    sampleTxs.forEach((tx, index) => {
      console.log(`${index + 1}. Hash: ${tx.tx_hash?.substring(0, 10)}...`);
      console.log(`   Method: ${tx.functionName || tx.method_name || 'N/A'}`);
      console.log(`   Staking: ${tx.stakingAnalysis?.isStaking || false}`);
      console.log(`   Type: ${tx.stakingAnalysis?.stakingType || 'N/A'}`);
      console.log(`   Value: ${tx.value_eth || 'N/A'}`);
      console.log(`   From: ${tx.from_address?.substring(0, 10)}...`);
      console.log('');
    });
    
    // Check for transactions with staking-related function names
    const stakingFunctionTxs = await Transaction.find({
      $or: [
        { 'functionName': { $regex: 'stake|lock|withdraw|deposit', $options: 'i' } },
        { 'method_name': { $regex: 'stake|lock|withdraw|deposit', $options: 'i' } }
      ]
    }).limit(5);
    
    console.log('=== TRANSACTIONS WITH STAKING FUNCTION NAMES ===');
    stakingFunctionTxs.forEach((tx, index) => {
      console.log(`${index + 1}. Hash: ${tx.tx_hash?.substring(0, 10)}...`);
      console.log(`   Method: ${tx.functionName || tx.method_name || 'N/A'}`);
      console.log(`   Staking Analysis: ${JSON.stringify(tx.stakingAnalysis, null, 2)}`);
      console.log(`   Value: ${tx.value_eth || 'N/A'}`);
      console.log(`   Input: ${tx.input?.substring(0, 100)}...`);
      console.log('');
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkStakingData(); 