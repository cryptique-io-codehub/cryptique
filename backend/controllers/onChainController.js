const axios = require('axios');

exports.sendSmartContractData = async (req, res) => {
    try {
      console.log(req.body);
        const { contractAddress,chainName } = req.body;
        
        console.log("Fetching smart contract data from Dune...");;
        const queryId = 4992459; // Replace with your Dune query ID
        const duneApiKey = process.env.DUNE_API_KEY;
        const getResults = async () => {
            const result = await axios.get(
                `https://api.dune.com/api/v1/query/${queryId}/results?limit=1000`,
                {
                  params: {
                    chain_name: chainName.toLowerCase(),
                    contract_address: contractAddress.toLowerCase(),
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
        }, 10000); // Wait 4 seconds to let query complete
    } catch (error) {
        console.error("Error fetching smart contract data from Dune:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
