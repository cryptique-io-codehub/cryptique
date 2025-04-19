const express = require('express');
const { sendSmartContractData, getCrossChainData } = require('../controllers/onChainController');
const router = express.Router();


router.post('/smart-contracts',sendSmartContractData);
router.post('/cross-chain',getCrossChainData);

module.exports = router;