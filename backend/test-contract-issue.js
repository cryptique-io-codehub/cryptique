const mongoose = require('mongoose');
const SmartContract = require('./models/smartContract');
const Transaction = require('./models/transaction');
require('dotenv').config();

async function testContractIssue() {
  try {
    // Connect to MongoDB
    const mongoUri = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Test 1: Check if contract exists
    const testContractId = 'contract_1752770334707_xbwx5vf16';
    console.log(`\n=== Testing contract lookup for: ${testContractId} ===`);
    
    const contract = await SmartContract.findOne({ contractId: testContractId });
    if (contract) {
      console.log('✓ Contract found:', {
        contractId: contract.contractId,
        address: contract.address,
        name: contract.name,
        blockchain: contract.blockchain
      });
    } else {
      console.log('✗ Contract not found');
      
      // List all contracts in database
      const allContracts = await SmartContract.find({}).select('contractId address name blockchain').limit(10);
      console.log('\nAvailable contracts in database:');
      allContracts.forEach(c => {
        console.log(`- ${c.contractId} (${c.address}) - ${c.blockchain}`);
      });
    }
    
    // Test 2: Check if there are any transactions for this contract
    console.log(`\n=== Testing transaction lookup for: ${testContractId} ===`);
    const transactions = await Transaction.find({ contractId: testContractId }).limit(5);
    console.log(`Found ${transactions.length} transactions for this contract`);
    
    if (transactions.length > 0) {
      console.log('Sample transaction:', {
        tx_hash: transactions[0].tx_hash,
        block_number: transactions[0].block_number,
        contractId: transactions[0].contractId
      });
    }
    
    // Test 3: Check database indexes
    console.log('\n=== Checking database indexes ===');
    const db = mongoose.connection.db;
    
    // Check SmartContract indexes
    const smartContractIndexes = await db.collection('smartcontracts').indexes();
    console.log('SmartContract indexes:', smartContractIndexes.map(idx => idx.name));
    
    // Check Transaction indexes
    const transactionIndexes = await db.collection('transactions').indexes();
    console.log('Transaction indexes:', transactionIndexes.map(idx => idx.name));
    
    // Test 4: Try to create a test contract
    console.log('\n=== Testing contract creation ===');
    const testContract = new SmartContract({
      contractId: `test_contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Contract',
      blockchain: 'Ethereum',
      tokenSymbol: 'TEST',
      team: new mongoose.Types.ObjectId(), // This will fail, but we're just testing the contractId generation
      verified: true
    });
    
    console.log('Test contract object:', {
      contractId: testContract.contractId,
      address: testContract.address,
      name: testContract.name
    });
    
    console.log('\n=== Test completed ===');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testContractIssue(); 