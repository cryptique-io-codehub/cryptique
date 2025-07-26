const mongoose = require('mongoose');
const Transaction = require('./models/transaction');

async function checkWithdrawals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server');
    
    console.log('=== CHECKING WITHDRAWAL TRANSACTIONS ===\n');
    
    // Find all withdrawal transactions
    const withdrawalTxs = await Transaction.find({
      $or: [
        { 'functionName': { $regex: 'withdraw', $options: 'i' } },
        { 'method_name': { $regex: 'withdraw', $options: 'i' } }
      ]
    });

    console.log(`Found ${withdrawalTxs.length} withdrawal transactions\n`);

    // Group by type
    const regularWithdrawals = withdrawalTxs.filter(tx => {
      const method = tx.functionName || tx.method_name || '';
      return method.includes('withdraw') && !method.includes('withdraw_early');
    });

    const earlyWithdrawals = withdrawalTxs.filter(tx => {
      const method = tx.functionName || tx.method_name || '';
      return method.includes('withdraw_early');
    });

    console.log('=== REGULAR WITHDRAWALS ===');
    console.log(`Total count: ${regularWithdrawals.length}`);
    regularWithdrawals.forEach(tx => {
      console.log(`\nTransaction: ${tx.tx_hash}`);
      console.log(`Method: ${tx.functionName || tx.method_name}`);
      console.log(`Value: ${tx.value_eth}`);
      console.log(`Input Data: ${tx.input_data}`);
      console.log(`Block Time: ${tx.block_time}`);
      console.log('Raw transaction data:', JSON.stringify(tx, null, 2));
    });

    console.log('\n=== EARLY WITHDRAWALS ===');
    console.log(`Total count: ${earlyWithdrawals.length}`);
    earlyWithdrawals.forEach(tx => {
      console.log(`\nTransaction: ${tx.tx_hash}`);
      console.log(`Method: ${tx.functionName || tx.method_name}`);
      console.log(`Value: ${tx.value_eth}`);
      console.log(`Input Data: ${tx.input_data}`);
      console.log(`Block Time: ${tx.block_time}`);
      console.log('Raw transaction data:', JSON.stringify(tx, null, 2));
    });

    // Check value extraction
    console.log('\n=== VALUE EXTRACTION TEST ===');
    withdrawalTxs.forEach(tx => {
      const method = tx.functionName || tx.method_name || '';
      const valueStr = tx.value_eth || '';
      const match = valueStr.match(/(\d+(\.\d+)?)/);
      const extractedValue = match ? parseFloat(match[1]) : 0;
      
      console.log(`\nTransaction: ${tx.tx_hash}`);
      console.log(`Method: ${method}`);
      console.log(`Raw value: ${valueStr}`);
      console.log(`Extracted value: ${extractedValue}`);
      
      // Try to extract from input data if available
      if (tx.input_data) {
        const valueHex = tx.input_data.substring(10, 74); // Skip method ID (4 bytes) and get first param (32 bytes)
        if (valueHex) {
          const value = parseInt(valueHex, 16);
          if (!isNaN(value)) {
            const tokenValue = value / 1e18; // Convert from wei to token units
            console.log(`Value from input data: ${tokenValue}`);
          }
        }
      }
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkWithdrawals(); 