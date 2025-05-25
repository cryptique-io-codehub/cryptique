const express = require('express');
const { 
  getTeamContracts, 
  addSmartContract, 
  deleteSmartContract, 
  updateSmartContract 
} = require('../controllers/smartContractController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all contracts for a team
router.get('/team/:teamName', getTeamContracts);

// Add a new contract
router.post('/', addSmartContract);

// Delete a contract
router.delete('/:contractId', deleteSmartContract);

// Update a contract
router.put('/:contractId', updateSmartContract);

module.exports = router; 