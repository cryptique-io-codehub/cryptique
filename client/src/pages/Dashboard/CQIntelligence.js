import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import Header from "../../components/Header";

const CQIntelligence = ({ onMenuClick, screenSize }) => {
  const [selectedSite, setSelectedSite] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.gemini.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Gemini');
      }

      const data = await response.json();
      const botMessage = data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: botMessage }]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header onMenuClick={onMenuClick} screenSize={screenSize} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <Bot className="text-[#caa968]" size={24} />
              <div>
                <h1 className="text-2xl font-bold text-[#1d0c46]">CQ Intelligence</h1>
                <p className="text-gray-500 mt-1">Ask anything about your website's analytics and performance</p>
              </div>
            </div>
          </div>

          {/* Website Selector */}
          <div className="p-6 border-b bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Website</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968]"
            >
              <option value="">Select a website</option>
              <option value="site1">Site 1</option>
              <option value="site2">Site 2</option>
            </select>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
                <Bot size={64} className="mb-6 text-[#caa968]" />
                <h2 className="text-xl font-semibold text-[#1d0c46] mb-2">Welcome to CQ Intelligence</h2>
                <p className="text-gray-600 max-w-md">
                  I can help you analyze your website's performance, track user behavior, and provide insights about your analytics data.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[#1d0c46] text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-100 text-red-600 p-4 rounded-lg">
                  {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your analytics..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968]"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={`px-6 rounded-lg flex items-center gap-2 ${
                  isLoading || !input.trim()
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-[#1d0c46] text-white hover:bg-[#1d0c46]/90'
                }`}
              >
                <Send size={20} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CQIntelligence; 