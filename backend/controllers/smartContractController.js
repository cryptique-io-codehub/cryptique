const SmartContract = require("../models/smartContract");
const Team = require("../models/team");
const crypto = require('crypto');

// Get all smart contracts for a team
exports.getTeamContracts = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify team exists and user has access
    const team = await Team.findOne({ 
      _id: teamId,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to access this team's contracts" });
    }
    
    const contracts = await SmartContract.find({ team: teamId });
    
    res.status(200).json({ contracts });
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    res.status(500).json({ message: "Error fetching contracts", error: error.message });
  }
};

// Add a new smart contract
exports.addSmartContract = async (req, res) => {
  try {
    const { teamId, address, name, blockchain, tokenSymbol } = req.body;
    
    // Verify team exists and user has access
    const team = await Team.findOne({ 
      _id: teamId,
      $or: [
        { createdBy: req.userId },
        { "user.userId": req.userId }
      ]
    });
    
    if (!team) {
      return res.status(403).json({ message: "Not authorized to add contracts to this team" });
    }

    // Check if the contract already exists for this team
    const existingContract = await SmartContract.findOne({
      team: teamId,
      address: address.toLowerCase(),
      blockchain
    });

    if (existingContract) {
      return res.status(400).json({ message: "Contract already exists for this team" });
    }
    
    // Generate a unique contract ID
    const contractId = `contract_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Create new contract
    const newContract = new SmartContract({
      contractId,
      address: address.toLowerCase(),
      name: name || `Contract ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      blockchain,
      tokenSymbol,
      team: teamId,
      verified: true,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    
    await newContract.save();
    
    res.status(201).json({ 
      message: "Contract added successfully", 
      contract: newContract 
    });
  } catch (error) {
    console.error("Error adding smart contract:", error);
    res.status(500).json({ message: "Error adding contract", error: error.message });
  }
};

// Delete a smart contract
exports.deleteSmartContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    
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
    
    await SmartContract.deleteOne({ contractId });
    
    res.status(200).json({ message: "Contract deleted successfully" });
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