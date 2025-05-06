const Transaction = require("../models/transaction");
const SmartContract = require("../models/smartContract");
const Team = require("../models/team");

// Get transactions for a contract
exports.getContractTransactions = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { limit = 100000, before, after, page = 1 } = req.query;
    
    console.log(`Fetching transactions for contract ${contractId}, page ${page}, limit ${limit}`);
    
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
      return res.status(403).json({ message: "Not authorized to add transactions to this contract" });
    }
    
    // Process transactions in smaller batches to avoid payload size issues
    const BATCH_SIZE = 7500; // Reduced from 10000 to 7500 to avoid payload size issues
    let totalInserted = 0;
    let totalModified = 0;
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
      
      // Create operations for this batch
        const operations = validTransactions.map(tx => ({
        updateOne: {
          filter: { tx_hash: tx.tx_hash },
          update: { 
            $setOnInsert: {
              ...tx,
              contract: contract._id,
                contractId: contractId, // Ensure contractId is set correctly
              createdAt: new Date()
            }
          },
          upsert: true
        }
      }));
      
        // Log a sample operation for debugging
        if (operations.length > 0) {
          console.log("Sample operation:", JSON.stringify(operations[0]).slice(0, 200) + "...");
        }
        
        const batchResult = await Transaction.bulkWrite(operations, { ordered: false });
        console.log(`Batch result: upserted=${batchResult.upsertedCount}, modified=${batchResult.modifiedCount}`);
        
      totalInserted += batchResult.upsertedCount;
      totalModified += batchResult.modifiedCount;
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
    if (totalInserted > 0 || totalModified > 0) {
      return res.status(200).json({ 
      message: "Transactions saved successfully",
      inserted: totalInserted,
      modified: totalModified,
        total: totalInserted + totalModified,
        errors: errors.length > 0 ? errors : undefined
      });
    } else if (errors.length > 0) {
      return res.status(500).json({ 
        message: "Failed to save transactions",
        errors
      });
    } else {
      return res.status(200).json({
        message: "No new transactions were added",
        inserted: 0,
        modified: 0,
        total: 0
    });
    }
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