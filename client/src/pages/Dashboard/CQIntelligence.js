import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BarChart } from 'lucide-react';
import Header from "../../components/Header";
import axiosInstance from "../../axiosInstance";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';

// 3D Cube Component for Loading Animation
const LoadingCube = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <Box ref={meshRef} args={[1, 1, 1]}>
      <meshStandardMaterial
        color="#caa968"
        metalness={0.7}
        roughness={0.2}
        emissive="#553a20"
        emissiveIntensity={0.2}
      />
    </Box>
  );
};

// Blockchain Node Component
const BlockchainNode = ({ position, color }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <group position={position}>
      <Box ref={meshRef} args={[1, 1, 1]}>
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </Box>
    </group>
  );
};

// Background Blockchain Animation
const BlockchainBackground = () => {
  const nodes = [
    { pos: [-4, 2, -5], color: "#1d0c46" },
    { pos: [4, -2, -5], color: "#caa968" },
    { pos: [-2, -3, -5], color: "#553a20" },
    { pos: [3, 3, -5], color: "#1d0c46" },
  ];

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {nodes.map((node, i) => (
        <BlockchainNode key={i} position={node.pos} color={node.color} />
      ))}
    </>
  );
};

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

    // Enhanced prompt structure with clear sections and formatting rules
    return `
      [SYSTEM CONTEXT]
      You are CQ Intelligence, an advanced analytics AI assistant specializing in Web3 and blockchain analytics.
      
      FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:
      
      1. Use "### " for section headers (no extra newlines before or after)
      2. Format metrics as "**Metric Name:** \`value\`" on new lines
      3. Use single newlines between items within sections
      4. Use "---" on its own line between major sections
      5. Format recommendations as numbered blockquotes with bold headers
      6. Use bullet points (*) for insights and trends
      7. Keep related metrics grouped on consecutive lines
      8. Use *italics* for trend descriptions and insights
      9. Format code/values consistently using \`backticks\`
      10. No extra blank lines except around horizontal rules
      11. Use **bold** for key metrics and important findings
      12. Use *italics* for trend descriptions and insights
      13. Understand the context of the data and provide insights based on the data

      REQUIRED SECTIONS (in order):
      1. ### Summary of Findings
      2. ### Key Metrics
      3. ### Trends & Insights
      4. ### Actionable Recommendations

      EXAMPLE FORMAT:
      ### Summary of Findings
      Concise summary with key points.
      
      ---
      ### Key Metrics
      **Metric One:** \`value\`
      **Metric Two:** \`value\`
      
      ---
      ### Trends & Insights
      * *First Trend:* Description with \`values\`
      * *Second Trend:* More details
      
      ---
      ### Actionable Recommendations
      > **First Recommendation**
      Clear action item with specific steps
      
      > **Second Recommendation**
      Another clear action item
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
    let formattedText = response.trim()
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Ensure consistent spacing around backticks
      .replace(/\s+`/g, ' `')
      .replace(/`\s+/g, '` ')
      // Format headers with single newline
      .replace(/###\s*(.*?)(?=\n)/g, '### $1')
      // Format metrics consistently
      .replace(/\*\*(.*?):\*\*/g, '**$1:**')
      // Format blockquotes consistently
      .replace(/>\s*(.*?)(?=\n|$)/g, '> $1')
      // Format bullet points consistently
      .replace(/^\s*\*\s+/gm, '* ')
      // Ensure single newline after horizontal rules
      .replace(/---\s*/g, '---\n')
      // Remove extra spaces at start of lines
      .replace(/^\s+/gm, '')
      // Ensure single newlines between items
      .replace(/\n\n+/g, '\n\n');

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
      <div className={`max-w-[90%] p-4 rounded-lg ${
        message.role === 'user'
          ? 'bg-[#1d0c46] text-white'
          : 'bg-white shadow-sm border border-gray-100'
      }`}>
        <div className="prose prose-sm max-w-none">
          {message.role === 'assistant' ? (
            <div className="markdown-content whitespace-pre-wrap" style={{ counterReset: 'recommendation' }}>
              {message.content}
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    );
  };

  // Styles for 3D and futuristic design
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500&display=swap');

    .futuristic-container {
      background: linear-gradient(135deg, rgba(29, 12, 70, 0.05) 0%, rgba(202, 169, 104, 0.05) 100%);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .blockchain-input {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }

    .blockchain-input:focus {
      background: rgba(255, 255, 255, 0.1);
      border-color: #caa968;
      box-shadow: 0 0 15px rgba(202, 169, 104, 0.2);
    }

    .message-container {
      position: relative;
      z-index: 1;
    }

    .message-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(29, 12, 70, 0.05) 0%, rgba(202, 169, 104, 0.05) 100%);
      border-radius: inherit;
      z-index: -1;
    }

    .loading-container {
      width: 100px;
      height: 100px;
      perspective: 1000px;
    }

    .markdown-content {
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      line-height: 1.6;
    }

    .markdown-content h3 {
      font-family: 'Montserrat', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
      color: #1d0c46;
      letter-spacing: -0.02em;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 0.5rem;
    }

    .markdown-content h3:first-child {
      margin-top: 0;
    }

    .markdown-content p {
      margin: 0.75rem 0;
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
    }

    .markdown-content strong {
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      color: #1d0c46;
    }

    .markdown-content ul {
      margin: 0.75rem 0;
      padding-left: 1.5rem;
      list-style-type: none;
    }

    .markdown-content ul li {
      margin: 0.5rem 0;
      position: relative;
    }

    .markdown-content ul li::before {
      content: "•";
      color: #caa968;
      font-weight: bold;
      position: absolute;
      left: -1rem;
    }

    .markdown-content blockquote {
      border-left: 4px solid #caa968;
      padding: 0.5rem 0 0.5rem 1rem;
      margin: 0.75rem 0;
      background-color: #f8f9fa;
      font-family: 'Poppins', sans-serif;
    }

    .markdown-content blockquote p {
      margin: 0;
    }

    .markdown-content code {
      background-color: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      color: #1d0c46;
    }

    .markdown-content hr {
      margin: 1.5rem 0;
      border: 0;
      border-top: 1px solid #e5e7eb;
    }

    .markdown-content em {
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      font-style: italic;
      color: #4b5563;
    }

    .markdown-content blockquote strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .markdown-content blockquote:not(:last-child) {
      margin-bottom: 1rem;
    }

    /* Number the recommendations */
    .markdown-content blockquote {
      counter-increment: recommendation;
    }

    .markdown-content blockquote strong::before {
      content: counter(recommendation) ". ";
      font-weight: 600;
      color: #caa968;
    }
  `;

  // Add the styles to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Header onMenuClick={onMenuClick} screenSize={screenSize} />
      
      <div className="flex-1 p-6 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto futuristic-container rounded-xl h-full flex flex-col relative overflow-hidden">
          {/* 3D Background */}
          <div className="absolute inset-0 opacity-30">
            <Canvas>
              <BlockchainBackground />
            </Canvas>
          </div>

          {/* Header with Website Selector */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-b border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Bot className="text-[#caa968]" size={24} />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold text-white">CQ Intelligence</h1>
                  <p className="text-gray-400 mt-1">Ask anything about your website's analytics and performance</p>
                </div>
              </div>
              
              {/* Website Selector */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 min-w-[300px]"
              >
                <select
                  value={selectedSite}
                  onChange={handleSiteChange}
                  className="w-full p-2 blockchain-input rounded-lg text-white focus:outline-none text-sm bg-opacity-20"
                >
                  <option value="">Select a website</option>
                  {websiteArray.map(website => (
                    <option key={website.siteId} value={website.siteId}>
                      {website.Domain} {website.Name ? `(${website.Name})` : ''}
                    </option>
                  ))}
                </select>
              </motion.div>
            </div>
          </motion.div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12"
                >
                  <div className="w-24 h-24 mb-6">
                    <Canvas>
                      <ambientLight intensity={0.5} />
                      <pointLight position={[10, 10, 10]} />
                      <LoadingCube />
                    </Canvas>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Welcome to CQ Intelligence</h2>
                  <p className="text-gray-400 max-w-md mb-8">
                    I can help you analyze your website's performance, track user behavior, and provide insights about your analytics data.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {['What are the top pages on my website?',
                      'How is my website performing?',
                      'Show me my Web3 user analytics',
                      'What are my traffic sources?'].map((question, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(202, 169, 104, 0.1)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setInput(question);
                          setTimeout(() => handleSend(), 100);
                        }}
                        className="p-4 blockchain-input rounded-lg text-left hover:text-white transition-colors"
                      >
                        {question}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`message-container max-w-[90%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[#1d0c46] text-white'
                        : 'bg-white/10 text-white'
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
                  </motion.div>
                ))
              )}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="loading-container">
                    <Canvas>
                      <ambientLight intensity={0.5} />
                      <pointLight position={[10, 10, 10]} />
                      <LoadingCube />
                    </Canvas>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-t border-gray-800 bg-gray-900/50"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={selectedSite ? "Ask about your analytics..." : "Select a website first to ask questions"}
                disabled={!selectedSite || isLoading}
                className="flex-1 p-4 blockchain-input rounded-lg text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedSite}
                className={`px-8 rounded-lg flex items-center gap-2 ${
                  isLoading || !input.trim() || !selectedSite
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-[#caa968] text-white hover:bg-[#caa968]/90'
                }`}
              >
                <Send size={20} />
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CQIntelligence; 