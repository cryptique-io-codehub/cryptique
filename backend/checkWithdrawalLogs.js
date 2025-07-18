const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

async function checkWithdrawalLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== CHECKING WITHDRAWAL LOGS ===\n');
    
    // Find all withdrawal transactions
    const withdrawalTxs = await Transaction.find({
      $or: [
        { 'functionName': { $regex: 'withdraw', $options: 'i' } },
        { 'method_name': { $regex: 'withdraw', $options: 'i' } }
      ]
    }).select('tx_hash logs receipt_logs block_time functionName method_name');

    console.log(`Found ${withdrawalTxs.length} withdrawal transactions\n`);

    withdrawalTxs.forEach(tx => {
      console.log(`\nTransaction: ${tx.tx_hash}`);
      console.log(`Method: ${tx.functionName || tx.method_name}`);
      console.log(`Block Time: ${tx.block_time}`);
      
      // Check both logs and receipt_logs
      const logs = tx.logs || tx.receipt_logs || [];
      console.log('Transaction Logs:', JSON.stringify(logs, null, 2));
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkWithdrawalLogs(); 