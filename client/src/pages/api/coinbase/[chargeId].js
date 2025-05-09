// API route to get Coinbase Commerce charge details
import axios from 'axios';

export default async function handler(req, res) {
  // Get the chargeId from the URL
  const { chargeId } = req.query;
  
  // Only allow GET for retrieving charge details
  if (req.method === 'GET') {
    try {
      const apiKey = process.env.COINBASE_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Coinbase Commerce API key');
      }
      
      if (!chargeId) {
        return res.status(400).json({ error: 'Missing charge ID' });
      }
      
      // Get charge details from Coinbase Commerce API
      const response = await axios.get(`https://api.commerce.coinbase.com/charges/${chargeId}`, {
        headers: {
          'X-CC-Api-Key': apiKey,
          'X-CC-Version': '2018-03-22',
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error(`Coinbase get charge ${chargeId} error:`, error);
      return res.status(500).json({ 
        error: 'Failed to get charge details',
        message: error.message 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 