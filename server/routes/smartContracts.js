const express = require('express');
const router = express.Router();
const subscriptionCheck = require('../middleware/subscriptionCheck');
const { checkSmartContractLimit, checkApiCallLimit } = require('../middleware/limitChecker');
const Team = require('../models/team');

/**
 * Get all smart contracts for a team
 */
router.get('/:teamId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // In a real application, you would fetch smart contracts from the database
    // This is a placeholder to demonstrate the concept
    const smartContracts = []; // Would be populated from database
    
    res.json(smartContracts);
  } catch (error) {
    console.error('Error fetching smart contracts:', error);
    res.status(500).json({ error: 'Failed to fetch smart contracts' });
  }
});

/**
 * Create a new smart contract
 * Uses checkSmartContractLimit middleware to enforce subscription limits
 */
router.post('/:teamId', subscriptionCheck, checkSmartContractLimit(), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { address, name, network, abi } = req.body;
    
    if (!address || !name || !network) {
      return res.status(400).json({ error: 'Address, name, and network are required' });
    }
    
    // In a real application, you would create a new smart contract in the database
    // For demonstration purposes, we'll just return a success message
    
    // Note that the checkSmartContractLimit middleware has already:
    // 1. Checked if the team's plan allows more smart contracts
    // 2. Incremented the usage counter if allowed
    
    res.status(201).json({ 
      success: true, 
      message: 'Smart contract added successfully',
      smartContract: {
        id: 'contract_' + Date.now(),
        teamId,
        address,
        name,
        network,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating smart contract:', error);
    res.status(500).json({ error: 'Failed to create smart contract' });
  }
});

/**
 * Delete a smart contract
 * When a smart contract is deleted, we need to decrement the usage counter
 */
router.delete('/:teamId/:contractId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId, contractId } = req.params;
    
    // In a real application, you would delete the smart contract from the database
    // For demonstration purposes, we'll just decrement the counter
    
    // Decrement the smart contract usage counter
    const team = await Team.findById(teamId);
    if (team && team.usage && team.usage.smartContracts > 0) {
      await Team.findByIdAndUpdate(teamId, {
        'usage.smartContracts': team.usage.smartContracts - 1
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Smart contract deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting smart contract:', error);
    res.status(500).json({ error: 'Failed to delete smart contract' });
  }
});

/**
 * Make an API call to a blockchain explorer to fetch data for a smart contract
 * Uses checkApiCallLimit middleware to enforce subscription limits on API calls
 */
router.post('/:teamId/:contractId/explorer', subscriptionCheck, checkApiCallLimit(), async (req, res) => {
  try {
    const { teamId, contractId } = req.params;
    const { method, params } = req.body;
    
    if (!method) {
      return res.status(400).json({ error: 'Method is required' });
    }
    
    // In a real application, you would make an API call to a blockchain explorer
    // For demonstration purposes, we'll just return a mock response
    
    // Note that the checkApiCallLimit middleware has already:
    // 1. Checked if the team's plan allows more API calls
    // 2. Incremented the usage counter if allowed
    // 3. Potentially reset the counter if it's a new month
    
    res.json({ 
      success: true, 
      data: {
        method,
        result: `Mock explorer data for ${method}`,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error making explorer API call:', error);
    res.status(500).json({ error: 'Failed to make explorer API call' });
  }
});

module.exports = router; 