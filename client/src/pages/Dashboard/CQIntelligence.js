import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BarChart } from 'lucide-react';
import Header from "../../components/Header";
import axiosInstance from "../../axiosInstance";

const CQIntelligence = ({ onMenuClick, screenSize }) => {
  // State for website selection and data
  const [websiteArray, setWebsiteArray] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [isDataLoading, setIsDataLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch website list on component mount
  useEffect(() => {
    const fetchWebsites = async () => {
      setIsLoading(true);
      try {
        const selectedTeam = localStorage.getItem("selectedTeam");
        const response = await axiosInstance.post('/website/getWebsites', {
          teamName: selectedTeam
        });
        
        if (response.status === 200 && response.data.websites.length > 0) {
          setWebsiteArray(response.data.websites);
          
          // Get the currently selected website from localStorage
          const savedWebsiteId = localStorage.getItem("idy");
          if (savedWebsiteId) {
            setSelectedSite(savedWebsiteId);
            fetchAnalyticsData(savedWebsiteId);
          }
        }
      } catch (error) {
        console.error("Error fetching websites:", error);
        setError("Failed to load websites. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsites();
  }, []);

  // Function to fetch analytics data for a selected website
  const fetchAnalyticsData = async (siteId) => {
    setIsDataLoading(true);
    try {
      const response = await axiosInstance.get(`/sdk/analytics/${siteId}`);
      if (response.data && response.data.analytics) {
        setAnalytics(response.data.analytics);
        setError(null);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data for this website.");
    } finally {
      setIsDataLoading(false);
    }
  };

  // Handle website selection change
  const handleSiteChange = async (e) => {
    const siteId = e.target.value;
    setSelectedSite(siteId);
    
    if (siteId) {
      localStorage.setItem("idy", siteId);
      fetchAnalyticsData(siteId);
    } else {
      setAnalytics({});
    }
  };

  // Generate analytics summary for the AI context
  const generateAnalyticsSummary = () => {
    if (!analytics || Object.keys(analytics).length === 0) {
      return "No analytics data available for this website yet.";
    }

    const totalPageViews = Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0);
    const totalSessions = analytics.sessions?.length || 0;
    const uniqueVisitors = analytics.uniqueVisitors || 0;
    const wallets = analytics.walletsConnected || 0;
    const web3Visitors = analytics.web3Visitors || 0;

    return `
      Website Analytics Summary:
      - Total Page Views: ${totalPageViews}
      - Total Sessions: ${totalSessions}
      - Unique Visitors: ${uniqueVisitors}
      - Connected Wallets: ${wallets}
      - Web3 Visitors: ${web3Visitors}
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      // Include analytics data in the context
      const analyticsSummary = generateAnalyticsSummary();
      const messageWithContext = `[CONTEXT] ${analyticsSummary} [/CONTEXT]\n\n${userMessage}`;

      // Debug environment variables
      console.log("Debug - Window ENV:", {
        fromWindow: window.ENV,
        fromProcess: process.env,
        specificVar: process.env.NEXT_PUBLIC_GEMINI_API,
        windowLocation: window.location.href,
        buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'not set'
      });

      // Try getting API key from multiple sources
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API || 
                    window.ENV?.NEXT_PUBLIC_GEMINI_API || 
                    'AIzaSyBNFkokKOYP4knvadeqxVupH5baqkML1dg'; // Fallback for testing

      if (!apiKey) {
        throw new Error(`Gemini API key is missing. Environment: ${process.env.NODE_ENV}. URL: ${window.location.href}`);
      }

      // Simple request with proper role format
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: messageWithContext }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
      console.log("Making request to Gemini API...");

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API Error Details:', JSON.stringify(responseData, null, 2));
        throw new Error(`API error: ${response.status} ${response.statusText} - ${responseData.error?.message || 'Unknown error'}`);
      }

      console.log("Gemini API Response received successfully");
      
      const botMessage = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process your request.";
      setMessages(prev => [...prev, { role: 'assistant', content: botMessage }]);
    } catch (err) {
      console.error('Full Error Details:', err);
      setError(`Failed to get response: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format analytics data for display
  const formatAnalyticsData = () => {
    if (!analytics || Object.keys(analytics).length === 0) {
      return [];
    }

    const totalPageViews = Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0);
    const uniqueVisitors = analytics.uniqueVisitors || 0;
    
    return [
      { label: "Total Page Views", value: totalPageViews },
      { label: "Unique Visitors", value: uniqueVisitors },
      { label: "Connected Wallets", value: analytics.walletsConnected || 0 },
      { label: "Web3 Visitors", value: analytics.web3Visitors || 0 }
    ];
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
              onChange={handleSiteChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968]"
            >
              <option value="">Select a website</option>
              {websiteArray.map(website => (
                <option key={website.siteId} value={website.siteId}>
                  {website.Domain} {website.Name ? `(${website.Name})` : ''}
                </option>
              ))}
            </select>
            
            {/* Analytics Summary */}
            {isDataLoading ? (
              <div className="mt-4 p-4 bg-white rounded-lg text-center">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : analytics && Object.keys(analytics).length > 0 ? (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                {formatAnalyticsData().map((item, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="text-lg font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : selectedSite ? (
              <div className="mt-4 p-4 bg-white rounded-lg text-center text-gray-500">
                No analytics data available for this website yet.
              </div>
            ) : null}
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
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setInput("What are the top pages on my website?");
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
                  >
                    What are the top pages on my website?
                  </button>
                  <button 
                    onClick={() => {
                      setInput("How is my website performing?");
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="p-3 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
                  >
                    How is my website performing?
                  </button>
                </div>
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
                placeholder={selectedSite ? "Ask about your analytics..." : "Select a website first to ask questions"}
                disabled={!selectedSite || isLoading}
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968] disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedSite}
                className={`px-6 rounded-lg flex items-center gap-2 ${
                  isLoading || !input.trim() || !selectedSite
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