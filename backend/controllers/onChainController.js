const axios = require('axios');

exports.sendSmartContractData = async (req, res) => {
    try {
        const { contractAddress, chainName } = req.body;
        
        if (!contractAddress || !chainName) {
            return res.status(400).json({ error: "Contract address and chain name are required" });
        }
        
        console.log(`Verifying smart contract ${contractAddress} on ${chainName}...`);
        
        // Normalize contract address to lowercase
        const normalizedAddress = contractAddress.toLowerCase();
        
        // Get chain ID based on chain name
        const chainId = getChainId(chainName);
        if (!chainId) {
            return res.status(400).json({ error: "Unsupported blockchain network" });
        }
        
        // Use Dune API to verify the contract exists
        const duneApiKey = process.env.DUNE_API_KEY;
        if (!duneApiKey) {
            return res.status(500).json({ error: "API key configuration missing" });
        }
        
        // For demonstration, we'll use a simple check to verify the contract exists
        // In a production environment, this would involve a more sophisticated query
        try {
            // First verify the contract exists by checking basic info
            const contractVerification = await axios.get(
                `https://api.dune.com/api/v1/contract/verify`,
                {
                  params: {
                        chain: chainName.toLowerCase(),
                        address: normalizedAddress
                  },
                  headers: {
                        "X-Dune-API-Key": duneApiKey
                    },
                    timeout: 8000 // 8 second timeout
                }
              );
            
            // If we get here, the contract verification was successful
            return res.status(200).json({
                success: true,
                contract: {
                    address: normalizedAddress,
                    chain: chainName,
                    verified: true
                }
            });
            
        } catch (error) {
            // Check if it's a 404 error (contract not found)
            if (error.response && error.response.status === 404) {
                return res.status(404).json({ 
                    error: "Smart contract not found on the specified chain" 
                });
            }
            
            // Check if it's a timeout
            if (error.code === 'ECONNABORTED') {
                return res.status(504).json({ 
                    error: "Verification request timed out. Please try again." 
                });
            }
            
            // For any other errors from Dune API
            return res.status(500).json({ 
                error: "Error verifying smart contract with blockchain data provider",
                details: error.response?.data || error.message
            });
        }
    } catch (error) {
        console.error("Error in smart contract verification:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getCrossChainData = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        console.log("Fetching cross-chain data from Dune...");
        //get the list of wallet address
        const queryId = 5005789; // Replace with your Dune query ID
        const duneApiKey = process.env.DUNE_API_KEY;
        const getResults = async () => {
            const result = await axios.get(
                `https://api.dune.com/api/v1/query/${queryId}/results`,
                {
                  params: {
                    wallet_address: walletAddress.toLowerCase(),
                  },
                  headers: {
                    "X-Dune-API-Key": duneApiKey,
                  }
                }
              );
              return result.data;
              };

        setTimeout(async () => {
            try {
                const results = await getResults();
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: "Error retrieving results from Dune." });
            }
        }, 10000); // Wait 10 seconds to let query complete
    } catch (error) {
        console.error("Error fetching cross-chain data from Dune:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Helper function to get chain ID from chain name
function getChainId(chainName) {
    const chainMap = {
        'ethereum': '1',
        'polygon': '137',
        'avalanche': '43114',
        'arbitrum': '42161',
        'optimism': '10',
        'base': '8453',
        'bnb': '56',
        'solana': 'solana' // Special case for non-EVM
    };
    
    return chainMap[chainName.toLowerCase()];
}