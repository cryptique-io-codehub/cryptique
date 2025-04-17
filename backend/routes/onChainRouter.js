const express = require('express');
const { sendSmartContractData } = require('../controllers/onChainController');
const router = express.Router();


router.get('/smart-contracts',sendSmartContractData);

module.exports = router;