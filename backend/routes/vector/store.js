import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, embedding, metadata } = req.body;

    // Validate required fields
    if (!text || !embedding) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get MongoDB URI from environment variable
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Connect to MongoDB
    const client = new MongoClient(uri);
    await client.connect();

    // Use correct case for database name
    const db = client.db('Cryptique');
    const vectorCollection = db.collection('vectors');

    // Create the vector document
    const vectorDoc = {
      text,
      embedding,
      metadata: metadata || {},
      createdAt: new Date(),
    };

    // Store the vector
    const result = await vectorCollection.insertOne(vectorDoc);

    await client.close();

    res.status(200).json({ 
      success: true, 
      message: 'Vector stored successfully',
      id: result.insertedId 
    });
  } catch (error) {
    console.error('Error storing vector:', error);
    res.status(500).json({ 
      error: 'Failed to store vector', 
      details: error.message 
    });
  }
} 