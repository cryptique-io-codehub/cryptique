const express = require("express");
const router = express.Router();
const { saveTransactions, getTransactions, testEndpoint } = require("../controllers/transactionController");

/**
 * Test endpoint to verify the route is working
 * GET /api/transactions/test
 */
router.get('/test', testEndpoint);

/**
 * Save transactions for a contract
 * POST /api/transactions
 */
router.post("/", saveTransactions);

/**
 * Get transactions for a contract
 * GET /api/transactions/:teamId/:contractId
 */
router.get("/:teamId/:contractId", getTransactions);

/**
 * Catch-all route for transactions API
 * All unmatched routes
 */
router.all('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

module.exports = router; 