import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, BarChart } from 'lucide-react';
import Header from "../../components/Header";
import axiosInstance from "../../axiosInstance";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Helper functions for analytics processing
  const calculateRetentionMetrics = (sessions) => {
    if (!sessions || !Array.isArray(sessions)) return {};
    
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    const weekInMs = 7 * dayInMs;
    const monthInMs = 30 * dayInMs;

    // Get unique users by timeframe
    const uniqueUsersByDay = new Map();
    const uniqueUsersByWeek = new Map();
    const uniqueUsersByMonth = new Map();
    
    sessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const timeDiff = now - startTime;
      const deviceId = session.device; // Using device as user identifier

      // Daily
      if (timeDiff <= dayInMs) {
        const day = startTime.toISOString().split('T')[0];
        if (!uniqueUsersByDay.has(day)) uniqueUsersByDay.set(day, new Set());
        uniqueUsersByDay.get(day).add(deviceId);
      }

      // Weekly
      if (timeDiff <= weekInMs) {
        const week = Math.floor(startTime.getTime() / weekInMs);
        if (!uniqueUsersByWeek.has(week)) uniqueUsersByWeek.set(week, new Set());
        uniqueUsersByWeek.get(week).add(deviceId);
      }

      // Monthly
      if (timeDiff <= monthInMs) {
        const month = startTime.toISOString().slice(0, 7);
        if (!uniqueUsersByMonth.has(month)) uniqueUsersByMonth.set(month, new Set());
        uniqueUsersByMonth.get(month).add(deviceId);
      }
    });

    // Calculate metrics
    const dau = uniqueUsersByDay.size > 0 ? 
      Math.max(...Array.from(uniqueUsersByDay.values()).map(set => set.size)) : 0;
    const wau = uniqueUsersByWeek.size > 0 ?
      Math.max(...Array.from(uniqueUsersByWeek.values()).map(set => set.size)) : 0;
    const mau = uniqueUsersByMonth.size > 0 ?
      Math.max(...Array.from(uniqueUsersByMonth.values()).map(set => set.size)) : 0;

    // Calculate retention
    const retention = {
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    if (uniqueUsersByDay.size >= 2) {
      const days = Array.from(uniqueUsersByDay.keys()).sort();
      const firstDay = uniqueUsersByDay.get(days[0]);
      const lastDay = uniqueUsersByDay.get(days[days.length - 1]);
      retention.daily = lastDay.size / firstDay.size * 100;
    }

    if (uniqueUsersByWeek.size >= 2) {
      const weeks = Array.from(uniqueUsersByWeek.keys()).sort();
      const firstWeek = uniqueUsersByWeek.get(weeks[0]);
      const lastWeek = uniqueUsersByWeek.get(weeks[weeks.length - 1]);
      retention.weekly = lastWeek.size / firstWeek.size * 100;
    }

    if (uniqueUsersByMonth.size >= 2) {
      const months = Array.from(uniqueUsersByMonth.keys()).sort();
      const firstMonth = uniqueUsersByMonth.get(months[0]);
      const lastMonth = uniqueUsersByMonth.get(months[months.length - 1]);
      retention.monthly = lastMonth.size / firstMonth.size * 100;
    }

    return {
      dau,
      wau,
      mau,
      retention
    };
  };

  const processGeographicalData = (analytics) => {
    // Check if we have any geographical data
    const hasGeoData = analytics.countries && Object.keys(analytics.countries).length > 0;
    
    if (!hasGeoData) {
      return null; // Return null instead of empty objects
    }

    const geoData = {
      countries: analytics.countries,
      regions: analytics.regions || {},
      cities: analytics.cities || {},
      topCountries: [],
      topRegions: [],
      topCities: []
    };

    // Process countries if data exists
    if (Object.keys(geoData.countries).length > 0) {
      geoData.topCountries = Object.entries(geoData.countries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));
    }

    // Process regions if data exists
    if (Object.keys(geoData.regions).length > 0) {
      geoData.topRegions = Object.entries(geoData.regions)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([region, count]) => ({ region, count }));
    }

    // Process cities if data exists
    if (Object.keys(geoData.cities).length > 0) {
      geoData.topCities = Object.entries(geoData.cities)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }));
    }

    return geoData;
  };

  const processTrafficSources = (analytics) => {
    // Check if we have any traffic source data
    const hasTrafficData = (
      (analytics.trafficSources && Object.keys(analytics.trafficSources).length > 0) ||
      (analytics.topReferrers && analytics.topReferrers.length > 0) ||
      (analytics.utmSources && Object.keys(analytics.utmSources).length > 0) ||
      (analytics.utmMediums && Object.keys(analytics.utmMediums).length > 0) ||
      (analytics.utmCampaigns && Object.keys(analytics.utmCampaigns).length > 0)
    );

    if (!hasTrafficData) {
      return null; // Return null instead of empty objects
    }

    const trafficData = {
      sources: {},
      referrers: [],
      campaigns: {
        sources: {},
        mediums: {},
        campaigns: {},
        topSources: [],
        topMediums: [],
        topCampaigns: []
      }
    };

    // Process traffic sources if they exist
    if (analytics.trafficSources && Object.keys(analytics.trafficSources).length > 0) {
      trafficData.sources = analytics.trafficSources;
    }

    // Process referrers if they exist
    if (analytics.topReferrers && analytics.topReferrers.length > 0) {
      trafficData.referrers = analytics.topReferrers;
    }

    // Process UTM data if it exists
    if (analytics.utmSources && Object.keys(analytics.utmSources).length > 0) {
      trafficData.campaigns.sources = analytics.utmSources;
      trafficData.campaigns.topSources = Object.entries(analytics.utmSources)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));
    }

    if (analytics.utmMediums && Object.keys(analytics.utmMediums).length > 0) {
      trafficData.campaigns.mediums = analytics.utmMediums;
      trafficData.campaigns.topMediums = Object.entries(analytics.utmMediums)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([medium, count]) => ({ medium, count }));
    }

    if (analytics.utmCampaigns && Object.keys(analytics.utmCampaigns).length > 0) {
      trafficData.campaigns.campaigns = analytics.utmCampaigns;
      trafficData.campaigns.topCampaigns = Object.entries(analytics.utmCampaigns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([campaign, count]) => ({ campaign, count }));
    }

    return trafficData;
  };

  const calculateAdvancedMetrics = (analytics) => {
    const metrics = {
      userSegments: {
        newVsReturning: { new: 0, returning: 0 },
        web3VsTraditional: { web3: 0, traditional: 0 },
        byEngagementLevel: { high: 0, medium: 0, low: 0 }
      },
      sourceMetrics: {},
      geographicMetrics: {},
      web3Metrics: {},
      engagementMetrics: {}
    };

    // Process sessions for advanced metrics
    if (analytics.sessions && Array.isArray(analytics.sessions)) {
      const sessionsBySource = new Map();
      const sessionsByCountry = new Map();
      const web3SessionsBySource = new Map();
      const walletsBySource = new Map();
      const engagementBySource = new Map();
      const engagementByCountry = new Map();
      const bouncesBySource = new Map();
      const durationsBySource = new Map();
      const durationsByCountry = new Map();

      analytics.sessions.forEach(session => {
        // Source tracking
        const source = session.utmSource || session.referrer || 'direct';
        if (!sessionsBySource.has(source)) {
          sessionsBySource.set(source, {
            total: 0,
            web3Users: 0,
            walletsConnected: 0,
            totalDuration: 0,
            bounces: 0,
            pageViews: 0,
            uniqueVisitors: new Set()
          });
        }
        const sourceData = sessionsBySource.get(source);
        sourceData.total++;
        sourceData.uniqueVisitors.add(session.device);
        sourceData.totalDuration += session.duration || 0;
        sourceData.pageViews += (session.pages?.length || 0);
        if (session.pages?.length === 1) sourceData.bounces++;

        // Geographic tracking
        const country = session.country || 'unknown';
        if (!sessionsByCountry.has(country)) {
          sessionsByCountry.set(country, {
            total: 0,
            web3Users: 0,
            walletsConnected: 0,
            totalDuration: 0,
            bounces: 0,
            pageViews: 0,
            uniqueVisitors: new Set()
          });
        }
        const countryData = sessionsByCountry.get(country);
        countryData.total++;
        countryData.uniqueVisitors.add(session.device);
        countryData.totalDuration += session.duration || 0;
        countryData.pageViews += (session.pages?.length || 0);
        if (session.pages?.length === 1) countryData.bounces++;

        // New vs Returning
        const isReturning = session.returningUser;
        metrics.userSegments.newVsReturning[isReturning ? 'returning' : 'new']++;

        // Web3 vs Traditional
        const isWeb3 = session.hasWeb3 || session.walletConnected;
        metrics.userSegments.web3VsTraditional[isWeb3 ? 'web3' : 'traditional']++;

        // Engagement Level
        const engagementScore = calculateEngagementScore(session);
        if (engagementScore > 7) metrics.userSegments.byEngagementLevel.high++;
        else if (engagementScore > 3) metrics.userSegments.byEngagementLevel.medium++;
        else metrics.userSegments.byEngagementLevel.low++;
      });

      // Process source metrics
      metrics.sourceMetrics = Array.from(sessionsBySource.entries()).map(([source, data]) => ({
        source,
        totalSessions: data.total,
        uniqueVisitors: data.uniqueVisitors.size,
        averageDuration: data.totalDuration / data.total,
        bounceRate: (data.bounces / data.total) * 100,
        pageViewsPerSession: data.pageViews / data.total,
        web3Users: data.web3Users,
        walletsConnected: data.walletsConnected
      })).sort((a, b) => b.totalSessions - a.totalSessions);

      // Process geographic metrics
      metrics.geographicMetrics = Array.from(sessionsByCountry.entries()).map(([country, data]) => ({
        country,
        totalSessions: data.total,
        uniqueVisitors: data.uniqueVisitors.size,
        averageDuration: data.totalDuration / data.total,
        bounceRate: (data.bounces / data.total) * 100,
        pageViewsPerSession: data.pageViews / data.total,
        web3Users: data.web3Users,
        walletsConnected: data.walletsConnected
      })).sort((a, b) => b.totalSessions - a.totalSessions);
    }

    // Process Web3 specific metrics
    if (analytics.walletsConnected) {
      metrics.web3Metrics = {
        totalWallets: analytics.walletsConnected,
        walletsByType: analytics.walletTypes || {},
        chainInteractions: analytics.chainInteractions || {},
        averageTransactionsPerUser: analytics.transactions ? 
          analytics.transactions.length / analytics.uniqueWallets.length : 0,
        topContracts: processContractInteractions(analytics.contractInteractions),
        walletRetention: calculateWalletRetention(analytics.sessions),
        web3ConversionRate: analytics.web3Visitors ? 
          (analytics.walletsConnected / analytics.web3Visitors) * 100 : 0
      };
    }

    // Process engagement metrics
    metrics.engagementMetrics = {
      averageSessionDuration: analytics.averageSessionDuration || 0,
      pageDepth: calculatePageDepth(analytics.sessions),
      returnRate: calculateReturnRate(analytics.sessions),
      timeOnPage: analytics.timeOnPage || {},
      exitPages: processExitPages(analytics.exitPages),
      entryPages: processEntryPages(analytics.entryPages),
      userFlow: calculateUserFlow(analytics.sessions),
      customEvents: processCustomEvents(analytics.customEvents)
    };

    return metrics;
  };

  // Helper functions for advanced metrics
  const calculateEngagementScore = (session) => {
    let score = 0;
    if (session.duration > 180) score += 3;
    if (session.pages?.length > 3) score += 2;
    if (session.walletConnected) score += 3;
    if (session.transactions?.length > 0) score += 2;
    return score;
  };

  const processContractInteractions = (interactions) => {
    if (!interactions) return [];
    const contractCounts = {};
    interactions.forEach(interaction => {
      const contract = interaction.contract;
      contractCounts[contract] = (contractCounts[contract] || 0) + 1;
    });
    return Object.entries(contractCounts)
      .map(([contract, count]) => ({ contract, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const calculateWalletRetention = (sessions) => {
    if (!sessions) return { daily: 0, weekly: 0, monthly: 0 };
    // Implementation of wallet retention calculation
    // ... existing retention calculation logic ...
  };

  const calculatePageDepth = (sessions) => {
    if (!sessions) return { average: 0, distribution: {} };
    const depths = sessions.map(s => s.pages?.length || 0);
    const average = depths.reduce((a, b) => a + b, 0) / depths.length;
    const distribution = depths.reduce((acc, depth) => {
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {});
    return { average, distribution };
  };

  const calculateReturnRate = (sessions) => {
    if (!sessions) return 0;
    const returningUsers = sessions.filter(s => s.returningUser).length;
    return (returningUsers / sessions.length) * 100;
  };

  const processExitPages = (exitPages) => {
    if (!exitPages) return [];
    return Object.entries(exitPages)
      .map(([page, count]) => ({ page, count, rate: count / Object.values(exitPages).reduce((a, b) => a + b, 0) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const processEntryPages = (entryPages) => {
    if (!entryPages) return [];
    return Object.entries(entryPages)
      .map(([page, count]) => ({ page, count, rate: count / Object.values(entryPages).reduce((a, b) => a + b, 0) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateUserFlow = (sessions) => {
    if (!sessions) return [];
    const flows = {};
    sessions.forEach(session => {
      if (!session.pages) return;
      for (let i = 0; i < session.pages.length - 1; i++) {
        const from = session.pages[i];
        const to = session.pages[i + 1];
        const key = `${from}=>${to}`;
        flows[key] = (flows[key] || 0) + 1;
      }
    });
    return Object.entries(flows)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  };

  const processCustomEvents = (events) => {
    if (!events) return [];
    const eventCounts = {};
    events.forEach(event => {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });
    return Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Update generateAnalyticsSummary to include advanced metrics
  const generateAnalyticsSummary = (message) => {
    if (!analytics || Object.keys(analytics).length === 0) {
      console.log("Analytics Context: No analytics data available");
      return "No analytics data available for this website yet.";
    }

    // Calculate advanced metrics
    const advancedMetrics = calculateAdvancedMetrics(analytics);
    
    // Process geographical data
    const geoData = processGeographicalData(analytics);
    
    // Process traffic sources
    const trafficData = processTrafficSources(analytics);

    // Compile complete analytics summary with computed metrics
    const fullAnalytics = {
      overview: {
        totalPageViews: Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0),
        uniqueVisitors: analytics.uniqueVisitors || 0,
        averageSessionDuration: analytics.averageSessionDuration || 0,
        bounceRate: analytics.bounceRate || 0
      },
      userSegments: advancedMetrics.userSegments,
      sourceMetrics: advancedMetrics.sourceMetrics,
      geographicMetrics: advancedMetrics.geographicMetrics,
      web3Metrics: advancedMetrics.web3Metrics,
      engagementMetrics: advancedMetrics.engagementMetrics,
      geography: geoData,
      traffic: trafficData
    };

    // Remove null sections
    Object.keys(fullAnalytics).forEach(key => {
      if (fullAnalytics[key] === null || 
          (Array.isArray(fullAnalytics[key]) && fullAnalytics[key].length === 0) ||
          (typeof fullAnalytics[key] === 'object' && Object.keys(fullAnalytics[key]).length === 0)) {
        delete fullAnalytics[key];
      }
    });

    console.log("========== ENHANCED ANALYTICS CONTEXT ==========");
    console.log("Processed Analytics Data:", fullAnalytics);
    console.log("==============================================");

    // Update the system context to handle missing data gracefully
    const systemContext = `
      You are CQ Intelligence, the premier Web3 analytics and marketing intelligence platform and an expert web3 marketing consultant, providing expert insights for blockchain, DeFi, NFTs, and Web3 projects. As the platform provider, you represent the cutting edge of Web3 analytics. Your expertise includes:
      
      - Growth strategies for Web3 platforms and dApps
      - User acquisition and wallet conversion optimization
      - Web3 community building and engagement
      - Cross-chain marketing strategies
      - Token launch and NFT marketing campaigns
      - DeFi user behavior analysis
      - Web3 funnel optimization
      - Blockchain-specific user journey mapping
      
      IMPORTANT: Your primary focus is to directly answer the user's specific question through the lens of a Web3 marketing expert. While you have access to various analytics and metrics, always prioritize addressing exactly what was asked. Avoid following rigid templates or providing unnecessary information that wasn't requested. Instead, draw upon your expertise to provide targeted, relevant insights that specifically answer the user's query.
      IMPORTANT PLATFORM GUIDELINES:
      1. You are the analytics platform provider - always maintain a position of authority
      2. Focus on actionable insights from available data
      3. Recommend strategies to leverage existing analytics capabilities
      4. Highlight opportunities to utilize more platform features
      5. Never suggest using other analytics or marketing platforms
      6. Never criticize data collection methods or platform capabilities
      7. Frame data gaps as opportunities to activate additional features
      8. Maintain a privacy-first, compliance-focused approach
      
      Your role is to analyze the provided analytics data as the platform expert and the lens of a web3 marketing expert and provide:
      1. Professional insights on current performance
      2. Strategic recommendations based on Web3 industry best practices
      3. Actionable steps for improvement with Web3-specific context
      4. Comparative analysis against Web3 industry standards
      5. Growth opportunities through platform features
      6. Risk assessment and opportunity identification
      
      When analyzing metrics, consider Web3-specific factors such as:
      - Wallet connection rates and patterns
      - Chain-specific user behavior
      - Web3 user acquisition channels
      - DeFi user engagement patterns
      - NFT marketplace dynamics
      - Token holder behavior
      - Cross-chain user journeys
      - Web2 to Web3 conversion funnels

      IMPORTANT NOTE ON DATA PRESENTATION:
      1. Only present metrics and sections that have actual data
      2. Do not mention empty arrays or objects in the analysis
      3. When certain metrics are not yet activated, suggest ways to leverage those features
      4. Focus on the value of available metrics and their strategic implications
      5. Highlight opportunities to activate additional platform capabilities
      6. Use comparative analysis only when relevant data is present
      7. Frame all recommendations within the platform's capabilities

      Remember: You are the authoritative Web3 analytics platform. Focus on delivering value through available metrics and guiding users to maximize platform benefits. Always maintain a professional, solutions-oriented approach that emphasizes the platform's comprehensive Web3 analytics capabilities.
      Structure your response as a professional consultant's analysis, maintaining clear sections and actionable recommendations.

      [USER QUESTION]
      ${message}
      [/USER QUESTION]

    `;

    const formattingInstructions = `
      FORMATTING INSTRUCTIONS:
      1. Always keep metrics and their values on the same line
      2. Format metrics as "**Metric Name:** \`value\`" (no line breaks)
      3. Format page metrics as "**Page Path:** \`value\` views"
      4. Keep contextual information on the same line as its metric
      5. Use proper spacing between different metrics
      6. Format percentages inline as \`X%\`
      7. Keep parenthetical information on the same line
      8. Use bullet points (*) for insights, keeping all related text on same line
      9. Use consistent formatting for all numerical values
      10. Maintain proper section spacing with single blank lines
    `;

    return `
      [SYSTEM CONTEXT]
      ${systemContext}

      [FORMATTING INSTRUCTIONS]
      ${formattingInstructions}

      [ANALYTICS DATA]
      ${JSON.stringify(fullAnalytics, null, 2)}

      [QUERY CONTEXT]
      As a Web3 marketing expert, analyze the above data and provide strategic insights for the following question.
      Focus on Web3-specific metrics and opportunities, considering:
      1. Wallet connection optimization
      2. Chain-specific user behavior
      3. Web3 user acquisition channels
      4. DeFi/NFT market dynamics
      5. Cross-chain opportunities
      6. Web2 to Web3 conversion strategies

      Structure your response as a professional consultant's analysis, maintaining clear sections and actionable recommendations.

      [USER QUESTION]
      ${message}
      [/USER QUESTION]
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
        'gemini-2.0-flash',
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
    let formattedText = response
      .trim()
      // Format metrics to be on the same line
      .replace(/([^:]+):\s*\n+(\d+|true|false)(?=\s|\n|$)/g, '$1: $2')
      // Format page metrics
      .replace(/(`[^`]+`):\s*\n+(\d+)\s*\n+views/g, '$1: $2 views')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Format metrics with their context
      .replace(/(\d+)\s*\n+\(([^)]+)\)/g, '$1 ($2)')
      // Format headers properly
      .replace(/###\s*(.*?)(?=\n)/g, '### $1')
      // Format metrics consistently
      .replace(/\*\*(.*?):\*\*\s*`(.*?)`/g, '**$1:** `$2`')
      // Clean up spacing around parentheses
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      // Format bullet points consistently
      .replace(/^\* (.*?)$/gm, '* $1')
      // Ensure proper spacing around sections
      .replace(/---\s*/g, '\n---\n')
      // Remove extra spaces at line starts
      .replace(/^\s+/gm, '')
      // Clean up multiple newlines between sections
      .replace(/\n{3,}/g, '\n\n')
      // Format inline metrics properly
      .replace(/(\d+)\s*\n+([a-zA-Z])/g, '$1 $2')
      // Clean up spacing around backticks
      .replace(/\s+`/g, ' `')
      .replace(/`\s+/g, '` ');

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
      const analyticsSummary = generateAnalyticsSummary(userMessage);
      const messageWithContext = analyticsSummary;

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

  // Update the message rendering function
  const renderMessage = (message) => {
    return (
      <div className={`max-w-[90%] p-4 rounded-lg ${
        message.role === 'user'
          ? 'bg-[#1d0c46] text-white'
          : 'bg-white shadow-sm border border-gray-100'
      }`}>
        <div className="prose prose-sm max-w-none">
          {message.role === 'assistant' ? (
            <div className="markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h3: ({node, ...props}) => (
                    <h3 className="text-xl font-semibold text-[#1d0c46] border-b border-gray-200 pb-2 mb-4 mt-6 first:mt-0" {...props} />
                  ),
                  p: ({node, ...props}) => (
                    <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
                  ),
                  strong: ({node, ...props}) => (
                    <strong className="font-semibold text-[#1d0c46]" {...props} />
                  ),
                  em: ({node, ...props}) => (
                    <em className="text-gray-600 italic" {...props} />
                  ),
                  code: ({node, inline, ...props}) => 
                    inline ? (
                      <code className="bg-gray-100 text-[#1d0c46] px-1.5 py-0.5 rounded text-sm font-medium" {...props} />
                    ) : (
                      <code className="block bg-gray-100 p-4 rounded-lg my-4" {...props} />
                    ),
                  hr: ({node, ...props}) => (
                    <hr className="my-6 border-t border-gray-200" {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-[#caa968] pl-4 py-3 my-4 bg-gray-50 rounded-r" {...props} />
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    );
  };

  // Add the 3D Cube Loading component
  const LoadingCube = () => {
    return (
      <div className="cube-wrapper">
        <div className="cube">
          <div className="cube-face front"></div>
          <div className="cube-face back"></div>
          <div className="cube-face right"></div>
          <div className="cube-face left"></div>
          <div className="cube-face top"></div>
          <div className="cube-face bottom"></div>
        </div>
      </div>
    );
  };

  // Update the styles
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500&display=swap');

    .markdown-content {
      font-family: 'Poppins', sans-serif;
      line-height: 1.6;
    }

    .markdown-content h3 {
      font-family: 'Montserrat', sans-serif;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }

    .markdown-content h3:first-child {
      margin-top: 0;
    }

    .markdown-content p {
      margin-bottom: 1rem;
    }

    .markdown-content strong {
      color: #1d0c46;
    }

    .markdown-content code {
      font-family: 'Poppins', sans-serif;
    }

    .markdown-content blockquote {
      margin: 1rem 0;
    }

    .markdown-content blockquote p {
      margin: 0;
    }

    .markdown-content ul {
      margin: 1rem 0;
    }

    .markdown-content li {
      margin: 0.5rem 0;
    }

    .markdown-content hr {
      margin: 2rem 0;
    }

    /* Metrics styling */
    .markdown-content p strong + code {
      margin-left: 0.25rem;
      color: #1d0c46;
      font-weight: 500;
    }

    /* Mobile adjustments */
    @media (max-width: 640px) {
      .markdown-content h3 {
        font-size: 1.125rem;
      }
    }

    /* 3D Cube Animation */
    .cube-wrapper {
      width: 60px;
      height: 60px;
      perspective: 600px;
      margin: 1rem;
    }

    .cube {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      animation: rotate 2s infinite linear;
    }

    .cube-face {
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, #caa968, #1d0c46);
      opacity: 0.9;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .front  { transform: rotateY(0deg) translateZ(30px); }
    .back   { transform: rotateY(180deg) translateZ(30px); }
    .right  { transform: rotateY(90deg) translateZ(30px); }
    .left   { transform: rotateY(-90deg) translateZ(30px); }
    .top    { transform: rotateX(90deg) translateZ(30px); }
    .bottom { transform: rotateX(-90deg) translateZ(30px); }

    @keyframes rotate {
      0% { transform: rotateX(0deg) rotateY(0deg); }
      100% { transform: rotateX(360deg) rotateY(360deg); }
    }

    /* Loading State Styles */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: rgba(29, 12, 70, 0.03);
      border-radius: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .loading-text {
      margin-top: 1rem;
      color: #1d0c46;
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
      font-size: 0.875rem;
      letter-spacing: 0.025em;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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

  // Update the loading state in the chat area
  const renderLoadingState = () => (
    <div className="flex justify-start">
      <div className="loading-container">
        <LoadingCube />
        <div className="loading-text">Processing your request...</div>
      </div>
    </div>
  );

  // Update the chat area section to use the new loading state
  const ChatArea = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
          <Bot size={64} className="mb-6 text-[#caa968]" />
          <h2 className="text-xl font-semibold text-[#1d0c46] mb-2">Welcome to CQ Intelligence</h2>
          <p className="text-gray-600 max-w-md mb-8">
            I can help you analyze your website's performance, track user behavior, and provide insights about your analytics data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {/* Example questions buttons */}
            <button 
              onClick={() => {
                setInput("What are the top pages on my website?");
                setTimeout(() => handleSend(), 100);
              }}
              className="p-4 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              What are the top pages on my website?
            </button>
            <button 
              onClick={() => {
                setInput("How is my website performing?");
                setTimeout(() => handleSend(), 100);
              }}
              className="p-4 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              How is my website performing?
            </button>
            <button 
              onClick={() => {
                setInput("Show me my Web3 user analytics");
                setTimeout(() => handleSend(), 100);
              }}
              className="p-4 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              Show me my Web3 user analytics
            </button>
            <button 
              onClick={() => {
                setInput("What are my traffic sources?");
                setTimeout(() => handleSend(), 100);
              }}
              className="p-4 bg-gray-100 rounded-lg text-left hover:bg-gray-200 transition-colors"
            >
              What are my traffic sources?
            </button>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {renderMessage(message)}
            </div>
          ))}
          {isLoading && renderLoadingState()}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-100 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header onMenuClick={onMenuClick} screenSize={screenSize} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm h-full flex flex-col">
          {/* Header with Website Selector */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="text-[#caa968]" size={24} />
                <div>
                  <h1 className="text-2xl font-bold text-[#1d0c46]">CQ Intelligence</h1>
                  <p className="text-gray-500 mt-1">Ask anything about your website's analytics and performance</p>
                </div>
              </div>
              
              {/* Website Selector */}
              <div className="flex items-center gap-2 min-w-[300px]">
                <select
                  value={selectedSite}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968] bg-white text-sm"
                >
                  <option value="">Select a website</option>
                  {websiteArray.map(website => (
                    <option key={website.siteId} value={website.siteId}>
                      {website.Domain} {website.Name ? `(${website.Name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <ChatArea />

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
                className="flex-1 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968] disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedSite}
                className={`px-8 rounded-lg flex items-center gap-2 ${
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