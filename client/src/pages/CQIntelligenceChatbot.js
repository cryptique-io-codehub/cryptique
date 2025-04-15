import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Lock, Bot, Send, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const PIN_CODE = '29409071';
const GEMINI_API_KEY = 'AIzaSyBNFkokKOYP4knvadeqxVupH5baqkML1dg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

const CQIntelligenceChatbot = () => {
  const { team } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('cqai_unlocked') === '1');
  const [selectedSite, setSelectedSite] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      from: 'bot', 
      text: 'Welcome to CQ Intelligence! I\'m your AI assistant for blockchain analytics. How can I help you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // PIN lock logic
  const handleUnlock = (e) => {
    e.preventDefault();
    if (pin === PIN_CODE) {
      setUnlocked(true);
      sessionStorage.setItem('cqai_unlocked', '1');
    } else {
      setError('Incorrect PIN. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Get analytics for the selected website
  const getSelectedSiteAnalytics = () => {
    // Implementation needed
    return null;
  };

  // Chat send logic with Gemini API
  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    if (!input.trim()) return;
    
    const userMessage = {
      from: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(msgs => [...msgs, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const siteAnalytics = getSelectedSiteAnalytics();
      const prompt = `You are CQ Intelligence, a futuristic AI assistant for blockchain analytics.\nThe user is asking about their website: ${selectedSite}.\nHere is the analytics data (JSON):\n${JSON.stringify(siteAnalytics, null, 2)}\n\nUser question: ${input}\n\nRespond in a helpful, concise, and futuristic tone. If the data is missing, say so.`;
      
      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
      
      setMessages(msgs => [...msgs, {
        from: 'bot',
        text: geminiText,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setError('Failed to get a response. Please try again.');
      setMessages(msgs => [...msgs, {
        from: 'bot',
        text: 'I apologize, but I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500 rounded-full p-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">CQ Intelligence</h2>
          <p className="text-center text-gray-600 mb-6">Enter PIN to access the AI assistant</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PIN"
                autoFocus
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
            >
              Unlock Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/${team}/dashboard`)}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">CQ Intelligence</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
              >
                <option value="">Select Website</option>
                {/* Add website options here */}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start max-w-[70%] ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 ${msg.from === 'user' ? 'ml-3' : 'mr-3'}`}>
                    {msg.from === 'bot' ? (
                      <div className="bg-blue-500 rounded-full p-2">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="bg-gray-200 rounded-full p-2">
                        <div className="w-5 h-5 bg-gray-500 rounded-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      msg.from === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${
                      msg.from === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSend} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your blockchain analytics..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`px-6 py-2 rounded-lg flex items-center space-x-2 ${
                  loading || !input.trim()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
            {error && (
              <div className="mt-2 text-red-500 text-sm flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CQIntelligenceChatbot; 