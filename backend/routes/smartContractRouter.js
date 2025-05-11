const express = require('express');
const { 
  getTeamContracts, 
  addSmartContract, 
  deleteSmartContract, 
  updateSmartContract 
} = require('../controllers/smartContractController');
const { verifyToken } = require('../middleware/auth');
// Import the limit checker
const { checkSmartContractLimit } = require('../middleware/limitChecker');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all contracts for a team
router.get('/team/:teamName', getTeamContracts);

// Add a new contract - apply limit checking
router.post('/', checkSmartContractLimit(), addSmartContract);

// Delete a contract
router.delete('/:contractId', deleteSmartContract);

// Update a contract
router.patch('/:contractId', updateSmartContract);

module.exports = router; 