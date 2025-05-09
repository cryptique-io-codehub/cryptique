// API route to securely create Coinbase Commerce charges
import axios from 'axios';

export default async function handler(req, res) {
  // Only allow POST for charge creation
  if (req.method === 'POST') {
    try {
      const apiKey = process.env.COINBASE_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Coinbase Commerce API key');
      }
      
      const { name, description, pricing_type, local_price, metadata } = req.body;
      
      // Validate required fields
      if (!name || !local_price?.amount || !local_price?.currency) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Create charge using Coinbase Commerce API
      const response = await axios.post('https://api.commerce.coinbase.com/charges', {
        name,
        description,
        pricing_type: pricing_type || 'fixed_price',
        local_price,
        metadata: metadata || {}
      }, {
        headers: {
          'X-CC-Api-Key': apiKey,
          'X-CC-Version': '2018-03-22',
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Coinbase charge creation error:', error);
      return res.status(500).json({ 
        error: 'Failed to create charge',
        message: error.message 
      });
    }
  } 
  // Handle GET request to list charges
  else if (req.method === 'GET') {
    try {
      const apiKey = process.env.COINBASE_API_KEY;
      
      if (!apiKey) {
        throw new Error('Missing Coinbase Commerce API key');
      }
      
      // List charges from Coinbase Commerce API
      const response = await axios.get('https://api.commerce.coinbase.com/charges', {
        headers: {
          'X-CC-Api-Key': apiKey,
          'X-CC-Version': '2018-03-22',
          'Content-Type': 'application/json'
        }
      });
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Coinbase list charges error:', error);
      return res.status(500).json({ 
        error: 'Failed to list charges',
        message: error.message 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 