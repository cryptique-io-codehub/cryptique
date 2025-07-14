import axios from 'axios';

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 1000; // Add 1s buffer
      
      console.log(`Rate limit reached. Waiting ${waitTime}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.waitForSlot(); // Recursive call after waiting
    }
    
    // Record this request
    this.requests.push(now);
  }
}

class GoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
    this.rateLimiter = new RateLimiter(8, 60000); // Conservative: 8 requests per minute
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  // Optimize prompt to reduce token usage
  optimizePrompt(prompt) {
    // Remove excessive whitespace and newlines
    let optimized = prompt.replace(/\s+/g, ' ').trim();
    
    // Limit prompt length to reduce token consumption
    const maxLength = 2000; // Conservative limit
    if (optimized.length > maxLength) {
      optimized = optimized.substring(0, maxLength) + '...';
      console.log(`Prompt truncated from ${prompt.length} to ${optimized.length} characters`);
    }
    
    return optimized;
  }

  // Exponential backoff retry logic
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        
        // Check if it's a rate limit error
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // Check if it's a quota exceeded error
        if (error.response?.status === 429 && error.response?.data?.error?.message?.includes('quota')) {
          console.log('Quota exceeded. Using fallback response.');
          throw new Error('QUOTA_EXCEEDED');
        }
        
        // Check if it's a service unavailable error
        if (error.response?.status === 503) {
          console.log(`Service unavailable (503). Attempt ${attempt}/${maxRetries}`);
          throw new Error('SERVICE_UNAVAILABLE');
        }
        
        // Check if it's a server error (5xx)
        if (error.response?.status >= 500) {
          console.log(`Server error ${error.response.status}. Attempt ${attempt}/${maxRetries}`);
          if (attempt === maxRetries) {
            throw new Error('SERVER_ERROR');
          }
        }
        
        // For other errors, throw immediately if it's the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        const backoffTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  // Queue-based request management
  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();
      
      try {
        await this.rateLimiter.waitForSlot();
        const result = await this.retryWithBackoff(requestFn);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  getGenerativeModel({ model }) {
    // Use more efficient model for rate limiting
    const modelName = model.includes('flash') ? model : 'gemini-1.5-flash';
    const fullModelName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;

    return {
      generateContent: async (prompt) => {
        const optimizedPrompt = this.optimizePrompt(prompt);
        
        const requestFn = async () => {
          console.log(`Making API request to ${fullModelName}...`);
          
          const response = await axios.post(
            `${this.baseUrl}/${fullModelName}:generateContent`,
            {
              contents: [{ parts: [{ text: optimizedPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1000, // Limit response length
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
              ]
            },
            {
              params: { key: this.apiKey },
              headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'CryptiquePlatform/1.0'
              },
              timeout: 30000 // 30 second timeout
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
        };

        return this.queueRequest(requestFn);
      }
    };
  }

  // Get current queue status
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      recentRequests: this.rateLimiter.requests.length
    };
  }

  // Check service health
  async checkServiceHealth() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/models`,
        {
          params: { key: this.apiKey },
          timeout: 5000 // 5 second timeout for health check
        }
      );
      
      return {
        healthy: true,
        status: 'available',
        modelsCount: response.data.models?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: error.response?.status === 503 ? 'service_unavailable' : 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default GoogleGenerativeAI; 