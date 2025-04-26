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
    
    // Process transactions - use bulkWrite for efficiency
    const operations = transactions.map(tx => ({
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
    
    const result = await Transaction.bulkWrite(operations);
    
    // Update the contract with the latest block number
    const highestBlockNumber = Math.max(...transactions.map(tx => tx.block_number || 0));
    if (highestBlockNumber > 0) {
      await SmartContract.updateOne(
        { contractId, lastBlock: { $lt: highestBlockNumber } },
        { $set: { lastBlock: highestBlockNumber } }
      );
    }
    
    res.status(200).json({ 
      message: "Transactions saved successfully",
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      total: result.upsertedCount + result.modifiedCount
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