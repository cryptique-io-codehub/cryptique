import React, { useState } from 'react';
import { Sparkles, Lock, Bot, Send, AlertTriangle } from 'lucide-react';
import { useParams } from 'react-router-dom';

const PIN_CODE = '29409071';
const GEMINI_API_KEY = 'AIzaSyBNFkokKOYP4knvadeqxVupH5baqkML1dg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

const CQIntelligenceChatbot = () => {
  const { team } = useParams();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('cqai_unlocked') === '1');
  const [selectedSite, setSelectedSite] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Welcome to CQ Intelligence! Select a website and ask anything about your blockchain data.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PIN lock logic
  const handleUnlock = (e) => {
    e.preventDefault();
    if (pin === PIN_CODE) {
      setUnlocked(true);
      sessionStorage.setItem('cqai_unlocked', '1');
    } else {
      alert('Incorrect PIN');
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
    setMessages(msgs => [...msgs, { from: 'user', text: input }]);
    setInput('');
    setLoading(true);
    try {
      const siteAnalytics = getSelectedSiteAnalytics();
      // Compose prompt
      const prompt = `You are CQ Intelligence, a futuristic AI assistant for blockchain analytics.\nThe user is asking about their website: ${selectedSite}.\nHere is the analytics data (JSON):\n${JSON.stringify(siteAnalytics, null, 2)}\n\nUser question: ${input}\n\nRespond in a helpful, concise, and futuristic tone. If the data is missing, say so.`;
      const body = {
        contents: [
          { parts: [{ text: prompt }] }
        ]
      };
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error('Gemini API error');
      const data = await response.json();
      const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
      setMessages(msgs => [...msgs, { from: 'bot', text: geminiText }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Sorry, there was an error contacting Gemini AI.' }]);
      setError('Failed to get a response from Gemini.');
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-8 flex flex-col items-center">
          <Lock size={40} className="text-blue-400 mb-2 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">CQ Intelligence</h2>
          <p className="text-gray-200 mb-4">Experimental AI Chatbot<br/>Enter PIN to unlock</p>
          <form onSubmit={handleUnlock} className="flex flex-col items-center gap-2">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="rounded px-4 py-2 bg-gray-900 text-white border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter PIN"
              autoFocus
            />
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-semibold mt-2 transition">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CQ Intelligence</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Welcome to CQ Intelligence for team: {team}</p>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] p-4">
          <div className="w-full max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 flex flex-col relative">
            <div className="flex items-center gap-3 mb-4">
              <Bot size={32} className="text-blue-400 animate-pulse" />
              <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                CQ Intelligence <span className="bg-blue-900/60 text-blue-200 text-xs px-2 py-1 rounded-full ml-2 animate-pulse">Experimental AI</span>
              </h2>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-gray-200">Website:</span>
              <select
                className="bg-gray-900 text-white border border-blue-400 rounded px-3 py-1 focus:outline-none"
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
              >
                {/* Add website options here */}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto mb-4 max-h-96 bg-black/30 rounded-lg p-4 border border-blue-900/40">
              {messages.map((msg, i) => (
                <div key={i} className={`mb-3 flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-xl px-4 py-2 max-w-[80%] ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-white/20 text-blue-100 border border-blue-400/30'}`}>{msg.text}</div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 animate-pulse">
                  <Sparkles size={18} className="text-blue-300 animate-spin" />
                  <span className="text-blue-200 animate-pulse">CQ Intelligence is thinking...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-400 mt-2">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSend} className="flex items-center gap-2 mt-2">
              <input
                className="flex-1 rounded-lg px-4 py-2 bg-gray-900 text-white border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ask about your blockchain data..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1 transition" disabled={loading || !input.trim()}>
                <Send size={16} />
                Send
              </button>
            </form>
            <div className="text-xs text-gray-400 mt-4 text-center">
              <span className="italic">Demo: Your question and selected website analytics are sent to Google Gemini. Do not share sensitive data.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CQIntelligenceChatbot; 