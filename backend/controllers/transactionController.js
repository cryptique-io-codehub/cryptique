const Transaction = require("../models/transaction");
const SmartContract = require("../models/smartContract");
const Team = require("../models/team");
const transactionTrackingService = require('../services/transactionTrackingService');

// Get transactions for a contract
exports.getContractTransactions = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { limit = 100000, before, after, page = 1 } = req.query;
    
    console.log(`Fetching transactions for contract ${contractId}, page ${page}, limit ${limit}`);
    
    // Find the contract
    const contract = await SmartContract.findOne({ contractId });
    
    if (!contract) {
      console.error(`Contract not found with ID: ${contractId}`);
      
      // Attempt to find by alternative IDs in case frontend is using a different ID
      const alternativeContract = await SmartContract.findOne({
        $or: [
          { _id: contractId },
          { id: contractId }
        ]
      });
      
      if (alternativeContract) {
        console.log(`Found contract with alternative ID. Using contractId: ${alternativeContract.contractId}`);
        // Continue with the alternative contract
        return res.status(200).json({ 
          transactions: [],
          metadata: {
            total: 0,
            latestBlockNumber: 0,
            count: 0,
            page: 1,
            limit: parseInt(limit),
            totalPages: 0,
            hasMore: false,
            note: "Contract found with alternative ID. No transactions yet."
          }
        });
      }
      
      return res.status(404).json({ message: "Contract not found" });
    }
    
    // Verify user has access to the team
    const team = await Team.findOne({ 
      _id: contract.team,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this contract's transactions" });
    }
    
    // Build query
    const query = { contractId };
    
    // Add time filtering if provided
    if (before) {
      query.block_time = { ...query.block_time, $lt: new Date(before) };
    }
    if (after) {
      query.block_time = { ...query.block_time, $gt: new Date(after) };
    }
    
    // Parse pagination parameters
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for the contract
    const total = await Transaction.countDocuments({ contractId });
    
    // Fetch transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ block_number: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Get the highest block number for future pagination
    const latestBlockNumber = transactions.length > 0 
      ? Math.max(...transactions.map(tx => tx.block_number))
      : 0;
    
    console.log(`Found ${transactions.length} transactions for contract ${contractId} on page ${pageNum} (total: ${total})`);
    
    res.status(200).json({ 
      transactions,
      metadata: {
        total,
        latestBlockNumber,
        count: transactions.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + transactions.length < total
      }
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
};

// Save transactions for a contract
exports.saveTransactions = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { transactions } = req.body;
    
    // Log incoming request data for debugging
    console.log(`Attempting to save transactions for contract ${contractId}`);
    console.log(`Received ${transactions ? transactions.length : 0} transactions`);
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: "No transactions provided" });
    }
    
    // Find the contract
    const contract = await SmartContract.findOne({ contractId });
    
    if (!contract) {
      console.error(`Contract not found with ID: ${contractId}`);
      
      // Attempt to find by alternative IDs in case frontend is using a different ID
      const alternativeContract = await SmartContract.findOne({
        $or: [
          { _id: contractId },
          { id: contractId }
        ]
      });
      
      if (alternativeContract) {
        console.log(`Found contract with alternative ID. Using contractId: ${alternativeContract.contractId}`);
        
        // Update the contractId to use the valid one
        const validContractId = alternativeContract.contractId;
        
        // Continue with the rest of the function using validContractId
        // (This is an alternate approach if you want to try to recover)
        /*
        contract = alternativeContract;
        */
      }
      
      return res.status(404).json({ 
        message: "Contract not found",
        detail: "The contract ID provided does not exist in the database. Please ensure the contract is added correctly before sending transactions."
      });
    }
    
    // Verify user has access to the team
    const team = await Team.findOne({ 
      _id: contract.team,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to add transactions to this contract" });
    }
    
    // Process transactions in smaller batches to avoid payload size issues
    const BATCH_SIZE = 7500; // Using 7500 as requested
    let totalInserted = 0;
    let highestBlockNumber = 0;
    let errors = [];
    
    // Calculate the highest block number across all transactions first
    transactions.forEach(tx => {
      if (tx.block_number && tx.block_number > highestBlockNumber) {
        highestBlockNumber = tx.block_number;
      }
    });
    
    // Process transactions in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      try {
        const batch = transactions.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(transactions.length/BATCH_SIZE)}: ${batch.length} transactions`);
        
        // Validate each transaction and ensure required fields
        const validTransactions = batch.filter(tx => {
          // Ensure tx_hash exists and is a string
          return tx && typeof tx.tx_hash === 'string' && tx.tx_hash.length > 0;
        });
        
        if (validTransactions.length === 0) {
          console.log("No valid transactions in this batch, skipping");
          continue;
        }
        
        // Prepare transactions for direct insertion - add required fields
        const preparedTransactions = validTransactions.map(tx => ({
          ...tx,
          contract: contract._id,
          contractId: contractId, // Ensure contractId is set correctly
          createdAt: new Date()
        }));
        
        // Log a sample transaction for debugging
        if (preparedTransactions.length > 0) {
          console.log("Sample transaction:", JSON.stringify(preparedTransactions[0]).slice(0, 200) + "...");
        }
        
        // Use insertMany instead of bulkWrite to insert all transactions directly
        const result = await Transaction.insertMany(preparedTransactions, { 
          ordered: false, // Continue even if some fail
          rawResult: true // Get detailed result info
        });
        
        console.log(`Batch result: inserted=${result.insertedCount} out of ${preparedTransactions.length}`);
        totalInserted += result.insertedCount;
      } catch (batchError) {
        console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        errors.push(batchError.message);
        // Continue with next batch despite error
      }
    }
    
    // Update the contract with the latest block number
    if (highestBlockNumber > 0) {
      try {
        await SmartContract.updateOne(
          { contractId, lastBlock: { $lt: highestBlockNumber } },
          { $set: { lastBlock: highestBlockNumber, lastUpdated: new Date() } }
        );
        console.log(`Updated contract ${contractId} with latest block number: ${highestBlockNumber}`);
      } catch (updateError) {
        console.error("Error updating contract with latest block:", updateError);
        errors.push(updateError.message);
      }
    }
    
    // Return appropriate response
    return res.status(200).json({ 
      message: "Transaction processing complete",
      inserted: totalInserted,
      total: transactions.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error saving transactions:", error);
    res.status(500).json({ message: "Error saving transactions", error: error.message });
  }
};

// Get latest block number for a contract
exports.getLatestBlockNumber = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // Find the contract
    const contract = await SmartContract.findOne({ contractId });
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    
    // Verify user has access to the team
    const team = await Team.findOne({ 
      _id: contract.team,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this contract" });
    }
    
    // Find the latest transaction for this contract
    const latestTx = await Transaction.findOne({ contractId })
      .sort({ block_number: -1 })
      .limit(1);
    
    const latestBlockNumber = latestTx ? latestTx.block_number : 0;
    
    res.status(200).json({ 
      contractId,
      latestBlockNumber,
      hasTransactions: !!latestTx
    });
  } catch (error) {
    console.error("Error fetching latest block number:", error);
    res.status(500).json({ message: "Error fetching latest block number", error: error.message });
  }
};

// Delete all transactions for a contract
exports.deleteContractTransactions = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log(`Attempting to delete all transactions for contract ${contractId}`);
    
    // Find the contract
    const contract = await SmartContract.findOne({ contractId });
    
    // If contract is not found, we can still proceed with deletion
    // in case we're cleaning up after a contract was already deleted
    if (contract) {
      // Verify user has access to the team
      const team = await Team.findOne({ 
        _id: contract.team,
        $or: [
          { createdBy: req.userId },
          { "user.userId": req.userId }
        ]
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized to delete transactions for this contract" });
      }
    } else {
      console.log(`Contract ${contractId} not found, but proceeding with transaction cleanup`);
    }
    
    // Delete all transactions for this contract
    const result = await Transaction.deleteMany({ contractId });
    
    console.log(`Deleted ${result.deletedCount} transactions for contract ${contractId}`);
    
    res.status(200).json({ 
      message: `Successfully deleted ${result.deletedCount} transactions for contract ${contractId}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(`Error deleting transactions for contract ${req.params.contractId}:`, error);
    res.status(500).json({ 
      message: "Error deleting transactions", 
      error: error.message 
    });
  }
};

exports.processNewTransaction = async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Save transaction
    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Process transaction for campaign attribution
    await transactionTrackingService.processTransaction(transactionData);

    return res.status(200).json({
      message: 'Transaction processed successfully',
      transaction
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return res.status(500).json({
      message: 'Error processing transaction',
      error: error.message
    });
  }
};

exports.getCampaignStats = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await transactionTrackingService.getCampaignTransactionStats(campaignId);
    
    return res.status(200).json({
      message: 'Campaign stats retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return res.status(500).json({
      message: 'Error getting campaign stats',
      error: error.message 
    });
  }
}; 