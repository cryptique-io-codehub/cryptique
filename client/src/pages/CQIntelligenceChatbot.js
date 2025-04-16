import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Lock, Bot, Send, AlertTriangle, ArrowLeft, X } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-[#1d0c46] to-[#2a1a5e] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex justify-center mb-6">
            <div className="bg-[#caa968] rounded-full p-3 shadow-lg shadow-[#caa968]/30">
              <Lock className="w-8 h-8 text-[#1d0c46]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2 font-montserrat">CQ Intelligence</h2>
          <p className="text-center text-white/80 mb-6 font-poppins">Enter PIN to access the AI assistant</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#caa968] font-poppins"
                placeholder="Enter PIN"
                autoFocus
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm text-center font-poppins">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-[#caa968] text-[#1d0c46] py-3 rounded-lg hover:bg-[#caa968]/90 transition duration-200 font-montserrat font-bold shadow-lg shadow-[#caa968]/30"
            >
              Unlock Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1d0c46] to-[#2a1a5e]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/${team}/dashboard`)}
                className="text-white hover:text-[#caa968] transition duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white font-montserrat">CQ Intelligence</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#caa968] font-poppins"
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
              >
                <option value="" className="bg-[#1d0c46]">Select Website</option>
                {/* Add website options here */}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 min-h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start max-w-[70%] ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 ${msg.from === 'user' ? 'ml-3' : 'mr-3'}`}>
                    {msg.from === 'bot' ? (
                      <div className="bg-[#caa968] rounded-full p-2 shadow-lg shadow-[#caa968]/30">
                        <Bot className="w-5 h-5 text-[#1d0c46]" />
                      </div>
                    ) : (
                      <div className="bg-white/20 rounded-full p-2">
                        <div className="w-5 h-5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      msg.from === 'user' 
                        ? 'bg-[#caa968] text-[#1d0c46]' 
                        : 'bg-white/20 text-white'
                    } shadow-lg ${msg.from === 'user' ? 'shadow-[#caa968]/30' : 'shadow-white/10'}`}>
                      <p className="font-poppins">{msg.text}</p>
                    </div>
                    <div className={`text-xs text-white/50 mt-1 font-poppins ${
                      msg.from === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-white/70">
                <Sparkles className="w-5 h-5 animate-spin text-[#caa968]" />
                <span className="font-poppins">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/20 p-4">
            <form onSubmit={handleSend} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your blockchain analytics..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#caa968] font-poppins"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`px-6 py-2 rounded-lg flex items-center space-x-2 font-montserrat font-bold ${
                  loading || !input.trim()
                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                    : 'bg-[#caa968] text-[#1d0c46] hover:bg-[#caa968]/90 shadow-lg shadow-[#caa968]/30'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
            {error && (
              <div className="mt-2 text-red-400 text-sm flex items-center space-x-1 font-poppins">
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