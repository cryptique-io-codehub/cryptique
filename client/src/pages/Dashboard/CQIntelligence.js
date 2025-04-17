import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BarChart } from 'lucide-react';
import Header from "../../components/Header";
import axiosInstance from "../../axiosInstance";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Generate comprehensive analytics summary for the AI context
  const generateAnalyticsSummary = () => {
    if (!analytics || Object.keys(analytics).length === 0) {
      console.log("Analytics Context: No analytics data available");
      return "No analytics data available for this website yet.";
    }

    // Helper function to format date objects in sessions
    const formatDate = (dateStr) => {
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };

    // Helper function to format session data
    const formatSessions = (sessions) => {
      if (!sessions || !Array.isArray(sessions)) return [];
      return sessions.map(session => ({
        startTime: formatDate(session.startTime),
        endTime: formatDate(session.endTime),
        duration: session.duration,
        pages: session.pages,
        referrer: session.referrer,
        utm: {
          source: session.utmSource,
          medium: session.utmMedium,
          campaign: session.utmCampaign,
          term: session.utmTerm,
          content: session.utmContent
        },
        device: session.device,
        browser: session.browser,
        os: session.os,
        country: session.country,
        region: session.region,
        city: session.city
      }));
    };

    // Format page views data
    const pageViewsData = analytics.pageViews || {};
    const totalPageViews = Object.values(pageViewsData).reduce((sum, views) => sum + views, 0);
    const pageViewsByPath = Object.entries(pageViewsData).map(([path, views]) => ({
      path,
      views
    }));

    // Format traffic sources
    const trafficSources = analytics.trafficSources || {};
    
    // Format wallet data
    const walletData = {
      totalWallets: analytics.walletsConnected || 0,
      uniqueWallets: analytics.uniqueWallets || [],
      walletTypes: analytics.walletTypes || {},
      web3Visitors: analytics.web3Visitors || 0,
      chainInteractions: analytics.chainInteractions || {}
    };

    // Compile complete analytics summary
    const fullAnalytics = {
      overview: {
        totalPageViews,
        uniqueVisitors: analytics.uniqueVisitors || 0,
        averageSessionDuration: analytics.averageSessionDuration || 0,
        bounceRate: analytics.bounceRate || 0
      },
      pageViews: {
        total: totalPageViews,
        byPath: pageViewsByPath
      },
      sessions: {
        total: analytics.sessions?.length || 0,
        details: formatSessions(analytics.sessions)
      },
      traffic: {
        sources: trafficSources,
        topReferrers: analytics.topReferrers || [],
        utmSources: analytics.utmSources || {},
        utmMediums: analytics.utmMediums || {},
        utmCampaigns: analytics.utmCampaigns || {}
      },
      web3Data: {
        ...walletData,
        transactions: analytics.transactions || [],
        contractInteractions: analytics.contractInteractions || []
      },
      geography: {
        countries: analytics.countries || {},
        regions: analytics.regions || {},
        cities: analytics.cities || {}
      },
      technology: {
        browsers: analytics.browsers || {},
        devices: analytics.devices || {},
        operatingSystems: analytics.operatingSystems || {}
      },
      customEvents: analytics.customEvents || [],
      timeOnPage: analytics.timeOnPage || {},
      exitPages: analytics.exitPages || {},
      entryPages: analytics.entryPages || {}
    };

    console.log("========== ANALYTICS CONTEXT BEING SENT TO GEMINI ==========");
    console.log("Raw Analytics Object:", analytics);
    console.log("Processed Analytics Data:", fullAnalytics);
    console.log("==========================================================");

    // Enhanced prompt structure with clear sections
    return `
      [SYSTEM CONTEXT]
      You are CQ Intelligence, an advanced analytics AI assistant specializing in Web3 and blockchain analytics.
      Your responses should be:
      1. Well-structured using markdown formatting
      2. Data-driven with specific metrics
      3. Action-oriented with clear recommendations
      4. Organized with clear sections using headers
      5. Highlighted with important insights using bold and italics
      
      Format your responses using:
      - **Bold** for key metrics and important findings
      - *Italic* for trends and changes
      - ### Headers for main sections
      - > Blockquotes for actionable recommendations
      - Lists for multiple points
      - \`code\` for specific values or metrics
      - --- for separating sections
      
      Always include these sections in your response:
      1. Summary of Findings
      2. Key Metrics Analysis
      3. Trends & Insights
      4. Actionable Recommendations
      [/SYSTEM CONTEXT]

      [ANALYTICS DATA]
      ${JSON.stringify(fullAnalytics, null, 2)}
      [/ANALYTICS DATA]
    `;
  };

  // Initialize Gemini AI
  const initializeAI = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API || 
                  window.ENV?.NEXT_PUBLIC_GEMINI_API || 
                  'AIzaSyBNFkokKOYP4knvadeqxVupH5baqkML1dg';
    return new GoogleGenerativeAI(apiKey, {
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta'
    });
  };

  // Verify model availability
  const verifyModel = async () => {
    try {
      console.log('Fetching available models...');
      const response = await axiosInstance.get('/ai/models');
      const data = response.data;
      console.log("Available models:", data.models?.map(m => m.name));
      
      // Define preferred models in order of preference
      const preferredModels = [
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.5-pro-latest'
      ];
      
      const models = data.models || [];
      
      // Try to find any of our preferred models
      for (const preferredModel of preferredModels) {
        const hasModel = models.some(m => m.name.includes(preferredModel));
        if (hasModel) {
          console.log(`Using preferred model: ${preferredModel}`);
          return preferredModel;
        }
      }
      
      // If no preferred model found, find first model that supports generateContent
      const modelName = models.find(m => 
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name.includes('pro') // Prefer pro models
      )?.name;
      
      if (modelName) {
        const cleanedName = modelName.replace('models/', '');
        console.log(`Using alternative model: ${cleanedName}`);
        return cleanedName;
      }
      
      // Default fallback
      console.log('Falling back to default model: gemini-1.5-pro');
      return 'gemini-1.5-pro';
    } catch (error) {
      console.error("Error fetching models:", error.response?.data || error);
      return 'gemini-1.5-pro'; // Default fallback
    }
  };

  const formatResponse = (response) => {
    // Clean up any extra whitespace and line breaks
    let formattedText = response.trim().replace(/\n{3,}/g, '\n\n');

    // Format headers with proper spacing
    formattedText = formattedText.replace(/###\s*(.*)/g, '\n\n### $1\n');

    // Format metrics with proper spacing
    formattedText = formattedText.replace(/\*\*(.*?):\*\*/g, '\n**$1:**');

    // Format blockquotes with proper spacing
    formattedText = formattedText.replace(/>\s*(.*)/g, '\n> $1\n');

    // Format bullet points with proper spacing
    formattedText = formattedText.replace(/\*\s+(.*)/g, '\n* $1');

    // Add extra spacing around horizontal rules
    formattedText = formattedText.replace(/---/g, '\n\n---\n\n');

    // Ensure proper spacing around code blocks
    formattedText = formattedText.replace(/`([^`]+)`/g, ' `$1` ');

    return formattedText;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const analyticsSummary = generateAnalyticsSummary();
      const messageWithContext = `
        ${analyticsSummary}

        [QUERY CONTEXT]
        Analyze the above data and provide insights for the following question.
        Follow these formatting rules strictly:
        1. Use proper spacing between sections (double line breaks)
        2. Format metrics as "**Metric Name:** \`value\`"
        3. Use bullet points for lists with proper indentation
        4. Use blockquotes (>) for recommendations with proper spacing
        5. Use italics (*) for trends and insights
        6. Keep related information grouped together
        7. Use horizontal rules (---) to separate major sections
        8. Ensure each section has a clear header (###)
        9. Format numbers and percentages consistently using \`backticks\`
        10. Use sub-bullets where appropriate (indent with 2 spaces)

        Structure your response in this order:
        1. ### Summary of Findings (High-level overview)
        2. ### Key Metrics (Formatted as "**Metric:** \`value\`")
        3. ### Trends & Insights (Use bullets and italics)
        4. ### Actionable Recommendations (Use numbered blockquotes)

        [/QUERY CONTEXT]

        [USER QUESTION]
        ${userMessage}
        [/USER QUESTION]
      `;

      let botMessage;

      try {
        // Try SDK approach first
        const ai = initializeAI();
        const modelName = await verifyModel();
        console.log("Using model for SDK:", modelName);
        
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(messageWithContext);
        const response = await result.response;
        botMessage = response.text();
      } catch (sdkError) {
        console.log("SDK approach failed, falling back to REST API:", sdkError);
        
        const modelName = await verifyModel();
        console.log("Using model for REST API:", modelName);
        
        const requestBody = {
          model: modelName,
          contents: [
            {
              parts: [
                { text: messageWithContext }
              ]
            }
          ]
        };

        console.log("Sending request to backend:", requestBody);
        const response = await axiosInstance.post('/ai/generate', requestBody);
        
        if (!response.data) {
          throw new Error('No response data received from backend');
        }

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        botMessage = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process your request.";
      }

      // Format the response before displaying
      const formattedMessage = formatResponse(botMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: formattedMessage,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error('Full Error Details:', err.response?.data || err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message;
      setError(`Failed to get response: ${errorMessage}`);
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

  // Update the message rendering in the JSX to preserve formatting
  const renderMessage = (message) => {
    return (
      <div className={`max-w-[80%] p-4 rounded-lg ${
        message.role === 'user'
          ? 'bg-[#1d0c46] text-white'
          : 'bg-gray-100 text-gray-800'
      }`}>
        <div className="prose prose-sm max-w-none">
          {message.role === 'assistant' ? (
            <div className="markdown-content whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    );
  };

  // Update the CSS styles in the component
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500&display=swap');

    .markdown-content {
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      line-height: 1.6;
    }

    .markdown-content h3 {
      font-family: 'Montserrat', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin: 1.5rem 0 1rem;
      color: #1d0c46;
      letter-spacing: -0.02em;
    }

    .markdown-content p {
      margin: 0.75rem 0;
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
    }

    .markdown-content strong {
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
    }

    .markdown-content ul {
      margin: 0.75rem 0;
      padding-left: 1.5rem;
      font-family: 'Poppins', sans-serif;
    }

    .markdown-content blockquote {
      border-left: 4px solid #caa968;
      padding-left: 1rem;
      margin: 1rem 0;
      background-color: #f8f9fa;
      font-family: 'Poppins', sans-serif;
      font-weight: 300;
      font-style: italic;
    }

    .markdown-content code {
      background-color: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
    }

    .markdown-content hr {
      margin: 2rem 0;
      border-color: #e5e7eb;
    }

    .markdown-content em {
      font-family: 'Poppins', sans-serif;
      font-weight: 300;
      color: #666;
    }

    .markdown-content li {
      margin: 0.5rem 0;
    }

    .markdown-content blockquote strong {
      color: #1d0c46;
      font-weight: 600;
    }
  `;

  // Add the styles to the document
  useEffect(() => {
    // Add font preload links for better performance
    const fontPreloads = [
      { href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap', rel: 'preload', as: 'style' },
      { href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap', rel: 'preload', as: 'style' }
    ];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.href = font.href;
      link.rel = font.rel;
      link.as = font.as;
      document.head.appendChild(link);
    });

    // Add the actual font stylesheets
    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.href = font.href;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });

    // Add component styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Cleanup function
    return () => {
      document.head.removeChild(styleSheet);
      // Remove font links on cleanup
      const links = document.head.getElementsByTagName('link');
      for (let i = links.length - 1; i >= 0; i--) {
        const link = links[i];
        if (link.href.includes('fonts.googleapis.com')) {
          document.head.removeChild(link);
        }
      }
    };
  }, []);

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
                  {renderMessage(message)}
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