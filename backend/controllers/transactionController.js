const Transaction = require("../models/transaction");
const SmartContract = require("../models/smartContract");
const Team = require("../models/team");

// Get transactions for a contract
exports.getContractTransactions = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { limit = 1000, before, after } = req.query;
    
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
    
    // Fetch transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ block_number: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Get the highest block number for future pagination
    const latestBlockNumber = transactions.length > 0 
      ? Math.max(...transactions.map(tx => tx.block_number))
      : 0;
    
    // Get total count for the contract
    const total = await Transaction.countDocuments({ contractId });
    
    res.status(200).json({ 
      transactions,
      metadata: {
        total,
        latestBlockNumber,
        count: transactions.length,
        hasMore: total > transactions.length
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
    
    console.log(`[TransactionController] Received request to save transactions for contract ${contractId}`);
    console.log(`[TransactionController] Number of transactions received: ${transactions.length}`);
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.log('[TransactionController] Error: No transactions provided');
      return res.status(400).json({ message: "No transactions provided" });
    }
    
    // Find the contract
    const contract = await SmartContract.findOne({ contractId });
    if (!contract) {
      console.log(`[TransactionController] Error: Contract ${contractId} not found`);
      return res.status(404).json({ message: "Contract not found" });
    }
    console.log(`[TransactionController] Found contract: ${contract._id}`);
    
    // Verify user has access to the team
    const team = await Team.findOne({ 
      _id: contract.team,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      console.log(`[TransactionController] Error: User ${req.userId} not authorized for team ${contract.team}`);
      return res.status(403).json({ message: "Not authorized to add transactions to this contract" });
    }
    console.log(`[TransactionController] User authorized for team ${team._id}`);
    
    // Process transactions in smaller batches to avoid payload size issues
    const BATCH_SIZE = 500; // Process 500 transactions at a time
    let totalInserted = 0;
    let totalModified = 0;
    let highestBlockNumber = 0;
    
    // Calculate the highest block number across all transactions first
    transactions.forEach(tx => {
      if (tx.block_number && tx.block_number > highestBlockNumber) {
        highestBlockNumber = tx.block_number;
      }
    });
    console.log(`[TransactionController] Highest block number in transactions: ${highestBlockNumber}`);
    
    // Process transactions in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      console.log(`[TransactionController] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(transactions.length/BATCH_SIZE)}`);
      
      // Create operations for this batch
      const operations = batch.map(tx => ({
        updateOne: {
          filter: { tx_hash: tx.tx_hash },
          update: { 
            $setOnInsert: {
              ...tx,
              contract: contract._id,
              contractId,
              createdAt: new Date()
            }
          },
          upsert: true
        }
      }));
      
      console.log(`[TransactionController] Executing bulkWrite for batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      const batchResult = await Transaction.bulkWrite(operations);
      console.log(`[TransactionController] Batch ${Math.floor(i/BATCH_SIZE) + 1} result:`, {
        inserted: batchResult.upsertedCount,
        modified: batchResult.modifiedCount,
        matched: batchResult.matchedCount
      });
      
      totalInserted += batchResult.upsertedCount;
      totalModified += batchResult.modifiedCount;
    }
    
    // Update the contract with the latest block number
    if (highestBlockNumber > 0) {
      console.log(`[TransactionController] Updating contract's last block number to ${highestBlockNumber}`);
      const updateResult = await SmartContract.updateOne(
        { contractId, lastBlock: { $lt: highestBlockNumber } },
        { $set: { lastBlock: highestBlockNumber } }
      );
      console.log(`[TransactionController] Contract update result:`, updateResult);
    }
    
    console.log(`[TransactionController] Final results:`, {
      totalInserted,
      totalModified,
      total: totalInserted + totalModified
    });
    
    res.status(200).json({ 
      message: "Transactions saved successfully",
      inserted: totalInserted,
      modified: totalModified,
      total: totalInserted + totalModified
    });
  } catch (error) {
    console.error("[TransactionController] Error saving transactions:", error);
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