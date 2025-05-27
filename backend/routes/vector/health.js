import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get MongoDB URI from environment variable
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Test connection
    const client = new MongoClient(uri);
    await client.connect();
    
    // Try to access the vector collection with correct case
    const db = client.db('Cryptique');
    const vectorCollection = db.collection('vectors');
    
    // Test if we can query the collection
    await vectorCollection.findOne({});
    
    await client.close();

    res.status(200).json({ status: 'healthy', message: 'Successfully connected to MongoDB' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      message: 'Failed to connect to MongoDB',
      error: error.message 
    });
  }
} 