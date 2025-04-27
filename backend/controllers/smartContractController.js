const SmartContract = require("../models/smartContract");
const Team = require("../models/team");
const crypto = require('crypto');

// Get all smart contracts for a team
exports.getTeamContracts = async (req, res) => {
  try {
    const { teamName } = req.params;
    
    // Find team by name
    const team = await Team.findOne({ 
      name: teamName,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's contracts" });
    }
    
    const contracts = await SmartContract.find({ team: team._id });
    
    res.status(200).json({ contracts });
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    res.status(500).json({ message: "Error fetching contracts", error: error.message });
  }
};

// Add a new smart contract
exports.addSmartContract = async (req, res) => {
  try {
    const { teamId, teamName, address, name, blockchain, tokenSymbol } = req.body;
    
    // First try to find team by ID, then by name
    let team;
    if (teamId) {
      team = await Team.findOne({ 
        _id: teamId,
        $or: [
          { createdBy: req.userId },
          { "user.userId": req.userId }
        ]
      });
    } else if (teamName) {
      team = await Team.findOne({ 
        name: teamName,
        $or: [
          { createdBy: req.userId },
          { "user.userId": req.userId }
        ]
      });
    }
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to add contracts to this team" });
    }

    const normalizedAddress = address.toLowerCase();
    console.log(`Adding contract with address ${normalizedAddress} to team ${team.name} (${team._id})`);

    // Check if the contract already exists for this team
    const existingContract = await SmartContract.findOne({
      team: team._id,
      address: normalizedAddress,
      blockchain
    });

    if (existingContract) {
      console.log(`Contract already exists: ${existingContract.contractId}`);
      
      // For previously deleted contracts that were re-added, the db might have orphaned 
      // entries due to the unique index. Let's handle this safely by returning existing contract info
      return res.status(200).json({ 
        message: "Contract already exists for this team", 
        contract: existingContract,
        alreadyExists: true
      });
    }
    
    // Ensure there are no leftover transactions for this address before creating new contract
    try {
      const Transaction = require("../models/transaction");
      
      // Use address to find any orphaned transactions
      await Transaction.deleteMany({ 
        contract_address: normalizedAddress,
        blockchain
      });
      
      console.log(`Cleaned up any orphaned transactions for address ${normalizedAddress}`);
    } catch (cleanupError) {
      console.error("Error cleaning up orphaned transactions:", cleanupError);
      // Continue with contract creation even if cleanup fails
    }
    
    // Generate a unique contract ID
    const contractId = `contract_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Create new contract
    const newContract = new SmartContract({
      contractId,
      address: normalizedAddress,
      name: name || `Contract ${normalizedAddress.substring(0, 6)}...${normalizedAddress.substring(normalizedAddress.length - 4)}`,
      blockchain,
      tokenSymbol,
      team: team._id,
      verified: true,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    
    await newContract.save();
    
    console.log(`New contract created with ID: ${contractId}`);
    
    res.status(201).json({ 
      message: "Contract added successfully", 
      contract: newContract 
    });
  } catch (error) {
    console.error("Error adding smart contract:", error);
    
    // Handle the case where the contract might exist but our check didn't catch it
    // (e.g., race condition or duplicate key error)
    if (error.name === 'MongoError' && error.code === 11000) {
      // This is a duplicate key error
      try {
        // Try to fetch the existing contract
        const normalizedAddress = (req.body.address || '').toLowerCase();
        const existingContract = await SmartContract.findOne({
          team: req.body.teamId,
          address: normalizedAddress,
          blockchain: req.body.blockchain
        });
        
        if (existingContract) {
          return res.status(200).json({
            message: "Contract already exists due to concurrency issue",
            contract: existingContract,
            alreadyExists: true
          });
        }
      } catch (findError) {
        console.error("Error finding existing contract after duplicate key error:", findError);
      }
    }
    
    res.status(500).json({ message: "Error adding contract", error: error.message });
  }
};

// Delete a smart contract
exports.deleteSmartContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log(`Attempting to delete contract: ${contractId}`);
    
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
      return res.status(403).json({ message: "Not authorized to delete this contract" });
    }
    
    // Delete any transactions associated with this contract
    try {
      const Transaction = require("../models/transaction");
      const result = await Transaction.deleteMany({ contractId });
      console.log(`Deleted ${result.deletedCount} transactions for contract ${contractId}`);
    } catch (txError) {
      console.error(`Error deleting transactions for contract ${contractId}:`, txError);
      // Continue with deletion even if transaction deletion fails
    }
    
    // Delete the contract
    await SmartContract.deleteOne({ contractId });
    
    console.log(`Successfully deleted contract: ${contractId}`);
    
    res.status(200).json({ 
      message: "Contract and associated transactions deleted successfully",
      contractId
    });
  } catch (error) {
    console.error("Error deleting smart contract:", error);
    res.status(500).json({ message: "Error deleting contract", error: error.message });
  }
};

// Update a smart contract
exports.updateSmartContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { name, tokenSymbol } = req.body;
    
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
      return res.status(403).json({ message: "Not authorized to update this contract" });
    }
    
    // Update the contract
    const updatedContract = await SmartContract.findOneAndUpdate(
      { contractId },
      { 
        name: name || contract.name,
        tokenSymbol: tokenSymbol || contract.tokenSymbol,
        lastUpdated: new Date()
      },
      { new: true }
    );
    
    res.status(200).json({ 
      message: "Contract updated successfully", 
      contract: updatedContract 
    });
  } catch (error) {
    console.error("Error updating smart contract:", error);
    res.status(500).json({ message: "Error updating contract", error: error.message });
  }
}; 