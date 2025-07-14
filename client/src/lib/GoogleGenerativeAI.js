import axios from 'axios';

class GoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  getGenerativeModel({ model }) {
    // Ensure model name has the correct format
    const modelName = model.startsWith('models/') ? model : `models/${model}`;

    return {
      generateContent: async (prompt) => {
        try {
          const response = await axios.post(
            `${this.baseUrl}/${modelName}:generateContent`,
            {
              contents: [{ parts: [{ text: prompt }] }]
            },
            {
              params: { key: this.apiKey },
              headers: { 'Content-Type': 'application/json' }
            }
          );

          return {
            response: {
              text: () => {
                const candidates = response.data.candidates || [];
                if (candidates.length === 0) {
                  throw new Error('No response generated');
                }
                return candidates[0].content.parts[0].text;
              }
            }
          };
        } catch (error) {
          console.error('Error generating content:', error);
          if (error.response?.status === 404) {
            throw new Error(`Model ${modelName} not found or not supported for generateContent`);
          }
          throw error;
        }
      }
    };
  }
}

export default GoogleGenerativeAI; 