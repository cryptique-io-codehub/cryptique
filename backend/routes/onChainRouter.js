const express = require('express');
const { sendSmartContractData } = require('../controllers/onChainController');
const router = express.Router();


router.post('/smart-contracts',sendSmartContractData);

module.exports = router;