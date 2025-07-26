const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

// Import the staking analysis function from backend
const { identifyStakingTransaction } = require('./stakingAnalysis');

async function fixStakingAnalysis() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== FIXING STAKING ANALYSIS ===\n');
    
    // Get all transactions that don't have proper staking analysis
    const transactions = await Transaction.find({
      $or: [
        { 'stakingAnalysis.isStaking': { $exists: false } },
        { 'stakingAnalysis.isStaking': false },
        { 'stakingAnalysis.stakingType': null }
      ]
    }).limit(1000); // Process in batches to avoid memory issues
    
    console.log(`Found ${transactions.length} transactions to analyze\n`);
    
    let updatedCount = 0;
    let stakingCount = 0;
    
    for (const tx of transactions) {
      try {
        // Prepare transaction data for analysis
        const txData = {
          input: tx.input || '',
          functionName: tx.functionName || '',
          methodId: tx.methodId || '',
          value_eth: tx.value_eth || '',
          chain: tx.chain || 'Unknown',
          gas_used: tx.gas_used || 0
        };
        
        // Perform staking analysis (treat all as potential escrow contracts)
        const stakingAnalysis = identifyStakingTransaction(txData, 'escrow');
        
        // Update transaction with new staking analysis
        const updates = {
          stakingAnalysis: stakingAnalysis,
          stakingType: stakingAnalysis.stakingType,
          stakingConfidence: stakingAnalysis.confidence
        };
        
        await Transaction.updateOne(
          { _id: tx._id },
          { $set: updates }
        );
        
        updatedCount++;
        
        if (stakingAnalysis.isStaking) {
          stakingCount++;
          console.log(`✅ Updated staking transaction: ${tx.tx_hash?.substring(0, 10)}...`);
          console.log(`   Type: ${stakingAnalysis.stakingType}`);
          console.log(`   Confidence: ${stakingAnalysis.confidence}`);
          console.log(`   Method: ${tx.functionName || tx.method_name || 'N/A'}`);
          console.log(`   Value: ${tx.value_eth || 'N/A'}`);
          console.log('');
        }
        
        // Progress indicator
        if (updatedCount % 100 === 0) {
          console.log(`Processed ${updatedCount} transactions...`);
        }
        
      } catch (error) {
        console.error(`Error processing transaction ${tx.tx_hash}:`, error);
      }
    }
    
    console.log('\n=== ANALYSIS COMPLETE ===');
    console.log(`Total transactions processed: ${updatedCount}`);
    console.log(`Staking transactions identified: ${stakingCount}`);
    console.log(`Non-staking transactions: ${updatedCount - stakingCount}`);
    
    // Verify the results
    const totalStakingTxs = await Transaction.countDocuments({'stakingAnalysis.isStaking': true});
    const totalWithStakingType = await Transaction.countDocuments({'stakingAnalysis.stakingType': {$exists: true, $ne: null}});
    
    console.log('\n=== VERIFICATION ===');
    console.log(`Total staking transactions in database: ${totalStakingTxs}`);
    console.log(`Total transactions with staking type: ${totalWithStakingType}`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

// Run the fix
fixStakingAnalysis(); 