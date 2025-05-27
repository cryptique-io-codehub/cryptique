import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API || process.env.GEMINI_API;
    if (!geminiApiKey) {
      throw new Error('Gemini API key is not defined');
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Get the embedding model
    const model = genAI.getGenerativeModel({ model: "embedding-001" });

    // Generate embedding
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    res.status(200).json({ 
      success: true,
      embedding: embedding
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({ 
      error: 'Failed to generate embedding',
      details: error.message 
    });
  }
} 