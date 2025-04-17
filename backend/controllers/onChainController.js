const axios = require('axios');

exports.sendSmartContractData = async (req, res) => {
    try {
        const contractAddress = req.query.contractAddress || "0x03D0E5A719DA8b17fB2274bA4581e1Ec80A29ad4";
        const queryId = "YOUR_QUERY_ID"; // Replace with your Dune query ID
        const duneApiKey = process.env.DUNE_API_KEY; // Store your API key in .env

        // Step 1: Execute the query with parameters
        const executeRes = await axios.post(
            `https://api.dune.com/api/v1/query/${queryId}/execute`,
            {
                parameters: {
                    contract_address: contractAddress.toLowerCase()
                }
            },
            {
                headers: {
                    "x-dune-api-key": duneApiKey
                }
            }
        );

        const executionId = executeRes.data.execution_id;

        // Step 2: Poll the results
        const getResults = async () => {
            const result = await axios.get(
                `https://api.dune.com/api/v1/execution/${executionId}/results`,
                {
                    headers: {
                        "x-dune-api-key": duneApiKey
                    }
                }
            );
            return result.data;
        };

        // Step 3: Delay and fetch results
        setTimeout(async () => {
            try {
                const results = await getResults();
                res.status(200).json(results);
            } catch (err) {
                res.status(500).json({ error: "Error retrieving results from Dune." });
            }
        }, 4000); // Wait 4 seconds to let query complete
    } catch (error) {
        console.error("Error fetching smart contract data from Dune:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
