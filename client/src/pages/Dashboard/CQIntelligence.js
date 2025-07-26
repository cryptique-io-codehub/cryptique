import React, { useState, useRef, useEffect, useContext } from 'react';
import { Send, Bot, BarChart } from 'lucide-react';
import Header from "../../components/Header";
import axiosInstance from "../../axiosInstance";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isWeb3User, calculateAverageDuration, formatDuration } from '../../utils/analyticsHelpers';

// Import knowledge base
import expertKnowledge from '../../data/web3_expert_knowledge.txt';

// Add knowledge base loading function
const loadExpertKnowledge = async () => {
  try {
    const response = await fetch(expertKnowledge);
    const knowledge = await response.text();
    return knowledge;
  } catch (error) {
    console.error('Error loading expert knowledge:', error);
    return '';
  }
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

  // Add state for smart contract selection
  const [contractArray, setContractArray] = useState([]);
  const [selectedContract, setSelectedContract] = useState('');
  const [contractTransactions, setContractTransactions] = useState([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [loadedTransactionCount, setLoadedTransactionCount] = useState(0);

  // Add state for expert knowledge
  const [expertContext, setExpertContext] = useState('');

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
        // Use the correct GET endpoint with team name in path parameter
        const response = await axiosInstance.get(`/website/team/${selectedTeam}`);
        
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
    fetchSmartContracts(); // Fetch smart contracts on component mount
  }, []);

  // Function to fetch smart contracts for the current team
  const fetchSmartContracts = async () => {
    try {
      setIsLoadingContracts(true);
      const selectedTeam = localStorage.getItem("selectedTeam");
      
      if (!selectedTeam) {
        setIsLoadingContracts(false);
        return;
      }

      const response = await axiosInstance.get(`/contracts/team/${selectedTeam}`);
      
      if (response.data && response.data.contracts) {
        // Format contract data
        const contracts = response.data.contracts.map(contract => {
          const contractType = contract.contractType || 'main';
          console.log(`CQIntelligence loading contract: ${contract.name} with type: ${contractType} (raw: ${contract.contractType})`);
          
          return {
            id: contract.contractId,
            address: contract.address,
            name: contract.name || `Contract ${contract.address.substring(0, 6)}...${contract.address.substring(contract.address.length - 4)}`,
            blockchain: contract.blockchain,
            tokenSymbol: contract.tokenSymbol,
            contractType: contractType,
            stakingDetails: contract.stakingDetails || null
          };
        });
        
        setContractArray(contracts);
        console.log(`Loaded ${contracts.length} contracts for team ${selectedTeam}`);
      }
    } catch (error) {
      console.error("Error fetching smart contracts:", error);
      setError("Failed to load smart contracts. Please try again later.");
    } finally {
      setIsLoadingContracts(false);
    }
  };

  // Function to fetch transactions for a selected smart contract
  const fetchContractTransactions = async (contractId) => {
    if (!contractId) return;
    
    try {
      setIsLoadingTransactions(true);
      setError(null); // Clear any previous errors
      setLoadedTransactionCount(0); // Reset counter
      console.log(`Fetching transactions for contract ID: ${contractId}`);
      
      let allTransactions = [];
      let hasMore = true;
      let page = 1;
      const pageSize = 100000; // Fetch 100000 transactions per request
      
      // Loop to fetch all transactions with pagination
      while (hasMore) {
        console.log(`Fetching page ${page} of transactions (${pageSize} per page)`);
        
        const response = await axiosInstance.get(`/transactions/contract/${contractId}`, {
          params: { 
            limit: pageSize,
            page: page
          }
        });
        
        if (response.data && response.data.transactions) {
          const fetchedTransactions = response.data.transactions;
          
          // Add to our accumulated transactions
          allTransactions = [...allTransactions, ...fetchedTransactions];
          
          // Update the progress counter
          setLoadedTransactionCount(allTransactions.length);
          
          console.log(`Fetched ${fetchedTransactions.length} transactions on page ${page}`);
          
          // Check if we need to fetch more
          hasMore = response.data.metadata?.hasMore;
          
          // If we got fewer transactions than the page size, we're done
          if (fetchedTransactions.length < pageSize) {
            hasMore = false;
          }
          
          // Move to next page
          page++;
          
          // Safety check - don't loop more than 10 times (1,000,000 transactions)
          if (page > 10) {
            console.log("Reached maximum page fetch limit (1,000,000 transactions)");
            hasMore = false;
          }
          
          if (page % 10 === 0) {
            // Log progress every 10 pages
            console.log(`Fetched ${allTransactions.length} transactions so far...`);
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } else {
          hasMore = false;
        }
      }
      
      setContractTransactions(allTransactions);
      setError(null); // Clear any status messages
      console.log(`Loaded ${allTransactions.length} total transactions for contract ${contractId}`);
      return allTransactions;
    } catch (error) {
      console.error("Error fetching contract transactions:", error);
      setError("Failed to load contract transactions. Please try again.");
      return [];
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Handle contract selection change
  const handleContractChange = async (e) => {
    const contractId = e.target.value;
    setSelectedContract(contractId);
    
    if (contractId) {
      await fetchContractTransactions(contractId);
    } else {
      setContractTransactions([]);
    }
  };

  // Function to fetch analytics data for a selected website
  const fetchAnalyticsData = async (siteId) => {
    setIsDataLoading(true);
    try {
      // Create a direct axios call without withCredentials for this specific endpoint
      // to avoid CORS issues with the wildcard Access-Control-Allow-Origin
      const response = await axiosInstance.get(`/sdk/analytics/${siteId}`, {
        withCredentials: false, // Explicitly set to false for this request
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
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

  // Load expert knowledge on component mount
  useEffect(() => {
    const loadKnowledge = async () => {
      const knowledge = await loadExpertKnowledge();
      setExpertContext(knowledge);
    };
    loadKnowledge();
  }, []);

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

  // Add helper function for source normalization
  const normalizeTrafficSource = (session) => {
    // First priority: UTM source
    if (session.utmSource) {
      return session.utmSource.toLowerCase();
    }

    // Second priority: Referrer
    if (session.referrer) {
      try {
        // Parse the URL
        const url = new URL(session.referrer);
        // Get hostname and remove www. if present
        let hostname = url.hostname.replace(/^www\./i, '');
        // Extract domain without subdomain
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
          // If has subdomain, take last two parts
          hostname = domainParts.slice(-2).join('.');
        }
        return hostname;
      } catch (e) {
        // If URL parsing fails, return the referrer as is, cleaned
        return session.referrer.toLowerCase()
          .replace(/^www\./i, '')
          .replace(/^https?:\/\//i, '')
          .split('/')[0];
      }
    }

    // Default: direct
    return 'direct';
  };

  // Update processTrafficSources function
  const processTrafficSources = (analytics) => {
    if (!analytics || !analytics.sessions || !Array.isArray(analytics.sessions)) {
      return null;
    }

    const trafficData = {
      sources: {},
      sourceTimeline: {},
      referrers: [],
      campaigns: {
        sources: {},
        mediums: {},
        campaigns: {},
        topSources: [],
        topMediums: [],
        topCampaigns: [],
        timeline: {}
      }
    };

    // Process sessions for traffic data
    const timeframes = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const now = new Date();
    const sourceMetrics = new Map(); // Store detailed metrics per source

    analytics.sessions.forEach(session => {
      const source = normalizeTrafficSource(session);
      const timestamp = new Date(session.startTime);
      
      // Initialize source metrics if not exists
      if (!sourceMetrics.has(source)) {
        sourceMetrics.set(source, {
          total: 0,
          uniqueVisitors: new Set(),
          web3Users: 0,
          walletsConnected: 0,
          bounces: 0,
          totalDuration: 0,
          timeline: {
            '24h': { visits: 0, web3: 0, wallets: 0 },
            '7d': { visits: 0, web3: 0, wallets: 0 },
            '30d': { visits: 0, web3: 0, wallets: 0 }
          }
        });
      }

      const metrics = sourceMetrics.get(source);
      metrics.total++;
      metrics.uniqueVisitors.add(session.device);
      if (session.hasWeb3 || session.walletConnected) metrics.web3Users++;
      if (session.walletConnected) metrics.walletsConnected++;
      if (session.pages?.length === 1) metrics.bounces++;
      if (session.duration) metrics.totalDuration += session.duration;

      // Update timeline metrics
      Object.entries(timeframes).forEach(([period, ms]) => {
        if ((now - timestamp) <= ms) {
          metrics.timeline[period].visits++;
          if (session.hasWeb3 || session.walletConnected) {
            metrics.timeline[period].web3++;
          }
          if (session.walletConnected) {
            metrics.timeline[period].wallets++;
          }
        }
      });

      // Process UTM data if available
      if (session.utmSource) {
        const utmData = {
          source: session.utmSource.toLowerCase(),
          medium: session.utmMedium?.toLowerCase(),
          campaign: session.utmCampaign?.toLowerCase()
        };

        // Update campaign metrics
        ['source', 'medium', 'campaign'].forEach(type => {
          if (utmData[type]) {
            const key = `utm${type.charAt(0).toUpperCase() + type.slice(1)}s`;
            trafficData.campaigns[key] = trafficData.campaigns[key] || {};
            trafficData.campaigns[key][utmData[type]] = (trafficData.campaigns[key][utmData[type]] || 0) + 1;

            // Update timeline
            if (!trafficData.campaigns.timeline[type]) {
              trafficData.campaigns.timeline[type] = {};
            }
            Object.entries(timeframes).forEach(([period, ms]) => {
              if ((now - timestamp) <= ms) {
                if (!trafficData.campaigns.timeline[type][period]) {
                  trafficData.campaigns.timeline[type][period] = {};
                }
                trafficData.campaigns.timeline[type][period][utmData[type]] = 
                  (trafficData.campaigns.timeline[type][period][utmData[type]] || 0) + 1;
              }
            });
          }
        });
      }
    });

    // Convert source metrics to final format
    sourceMetrics.forEach((metrics, source) => {
      if (metrics.total > 0) {
        trafficData.sources[source] = {
          visits: metrics.total,
          uniqueVisitors: metrics.uniqueVisitors.size,
          web3Users: metrics.web3Users,
          walletsConnected: metrics.walletsConnected,
          bounceRate: (metrics.bounces / metrics.total) * 100,
          avgDuration: metrics.totalDuration / metrics.total
        };

        // Add timeline data
        Object.entries(metrics.timeline).forEach(([period, data]) => {
          if (data.visits > 0) {
            if (!trafficData.sourceTimeline[period]) {
              trafficData.sourceTimeline[period] = {};
            }
            trafficData.sourceTimeline[period][source] = data;
          }
        });
      }
    });

    // Process top sources for each category
    ['sources', 'mediums', 'campaigns'].forEach(type => {
      const data = trafficData.campaigns[`utm${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1)}`];
      if (data && Object.keys(data).length > 0) {
        trafficData.campaigns[`top${type.charAt(0).toUpperCase() + type.slice(1)}`] = 
          Object.entries(data)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
      }
    });

    // Clean up empty sections
    Object.keys(trafficData).forEach(key => {
      if (typeof trafficData[key] === 'object' && Object.keys(trafficData[key]).length === 0) {
        delete trafficData[key];
      }
    });

    return Object.keys(trafficData).length > 0 ? trafficData : null;
  };

  // Add utility function for value validation
  const isValidValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && (value === 0 || isNaN(value))) return false;
    if (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'unknown')) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    return true;
  };

  // Add time-based analysis helper function
  const getTimeBasedMetrics = (sessions) => {
    if (!sessions || !Array.isArray(sessions)) return null;
    
    const now = new Date();
    const timeframes = {
      day: { ms: 24 * 60 * 60 * 1000, label: '24h' },
      week: { ms: 7 * 24 * 60 * 60 * 1000, label: '7d' },
      month: { ms: 30 * 24 * 60 * 60 * 1000, label: '30d' },
      year: { ms: 365 * 24 * 60 * 60 * 1000, label: '1y' }
    };

    const metrics = {
      visitors: {},
      web3Users: {},
      walletsConnected: {},
      engagement: {},
      retention: {}
    };

    Object.entries(timeframes).forEach(([period, { ms, label }]) => {
      const periodSessions = sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return (now - sessionDate) <= ms;
      });

      if (periodSessions.length > 0) {
        // Unique visitors
        const uniqueVisitors = new Set(periodSessions.map(s => s.device)).size;
        if (uniqueVisitors > 0) metrics.visitors[label] = uniqueVisitors;

        // Web3 users - use standardized function
        const web3Users = periodSessions.filter(s => isWeb3User(s)).length;
        if (web3Users > 0) metrics.web3Users[label] = web3Users;

        // Connected wallets
        const connectedWallets = periodSessions.filter(s => s.wallet && s.wallet.walletAddress && s.wallet.walletAddress !== '' && s.wallet.walletAddress !== 'No Wallet Detected').length;
        if (connectedWallets > 0) metrics.walletsConnected[label] = connectedWallets;

        // Average engagement time
        const validDurations = periodSessions.filter(s => s.duration > 0).map(s => s.duration);
        if (validDurations.length > 0) {
          metrics.engagement[label] = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
        }

        // Retention calculation
        const uniqueReturningUsers = new Set(
          periodSessions.filter(s => s.returningUser).map(s => s.device)
        ).size;
        if (uniqueReturningUsers > 0) {
          metrics.retention[label] = (uniqueReturningUsers / uniqueVisitors) * 100;
        }
      }
    });

    // Remove empty metric categories
    Object.keys(metrics).forEach(key => {
      if (Object.keys(metrics[key]).length === 0) {
        delete metrics[key];
      }
    });

    return Object.keys(metrics).length > 0 ? metrics : null;
  };

  // Update calculateAdvancedMetrics function
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
      engagementMetrics: {},
      timeBasedMetrics: null
    };

    if (analytics.sessions && Array.isArray(analytics.sessions)) {
      const validSessions = analytics.sessions.filter(session => 
        session && 
        (session.duration || session.pages?.length || session.walletConnected || session.transactions?.length)
      );

      if (validSessions.length === 0) return null;

      const sessionsBySource = new Map();
      const sessionsByCountry = new Map();

      validSessions.forEach(session => {
        // Use normalized source
        const source = normalizeTrafficSource(session);
        const country = session.country;
        
        // Skip if country is unknown or empty
        if (country && country.toLowerCase() !== 'unknown') {
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
          if (session.device) countryData.uniqueVisitors.add(session.device);
          if (session.duration) countryData.totalDuration += session.duration;
          if (session.pages?.length) {
            countryData.pageViews += session.pages.length;
            if (session.pages.length === 1) countryData.bounces++;
          }
          if (session.hasWeb3) countryData.web3Users++;
          if (session.walletConnected) countryData.walletsConnected++;
        }

        // Process source data
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
        if (session.device) sourceData.uniqueVisitors.add(session.device);
        if (session.duration) sourceData.totalDuration += session.duration;
        if (session.pages?.length) {
          sourceData.pageViews += session.pages.length;
          if (session.pages.length === 1) sourceData.bounces++;
        }
        if (session.hasWeb3) sourceData.web3Users++;
        if (session.walletConnected) sourceData.walletsConnected++;

        // Only count user segments with valid data
        if (session.returningUser !== undefined) {
          metrics.userSegments.newVsReturning[session.returningUser ? 'returning' : 'new']++;
        }
        
        // Use standardized isWeb3User function
        if (isWeb3User(session)) {
          metrics.userSegments.web3VsTraditional.web3++;
        } else {
          metrics.userSegments.web3VsTraditional.traditional++;
        }

        const engagementScore = calculateEngagementScore(session);
        if (engagementScore > 0) {
          if (engagementScore > 7) metrics.userSegments.byEngagementLevel.high++;
          else if (engagementScore > 3) metrics.userSegments.byEngagementLevel.medium++;
          else metrics.userSegments.byEngagementLevel.low++;
        }
      });

      // Process and filter source metrics
      metrics.sourceMetrics = Array.from(sessionsBySource.entries())
        .map(([source, data]) => ({
          source,
          totalSessions: data.total,
          uniqueVisitors: data.uniqueVisitors.size,
          averageDuration: data.totalDuration / data.total,
          bounceRate: (data.bounces / data.total) * 100,
          pageViewsPerSession: data.pageViews / data.total,
          web3Users: data.web3Users,
          walletsConnected: data.walletsConnected
        }))
        .filter(metric => 
          metric.totalSessions > 0 && 
          (metric.uniqueVisitors > 0 || metric.web3Users > 0 || metric.walletsConnected > 0)
        )
        .sort((a, b) => b.totalSessions - a.totalSessions);

      // Process and filter geographic metrics
      metrics.geographicMetrics = Array.from(sessionsByCountry.entries())
        .map(([country, data]) => ({
          country,
          totalSessions: data.total,
          uniqueVisitors: data.uniqueVisitors.size,
          averageDuration: data.totalDuration / data.total,
          bounceRate: (data.bounces / data.total) * 100,
          pageViewsPerSession: data.pageViews / data.total,
          web3Users: data.web3Users,
          walletsConnected: data.walletsConnected
        }))
        .filter(metric => 
          metric.totalSessions > 0 && 
          (metric.uniqueVisitors > 0 || metric.web3Users > 0 || metric.walletsConnected > 0)
        )
        .sort((a, b) => b.totalSessions - a.totalSessions);
    }

    // Add time-based metrics
    if (analytics.sessions && Array.isArray(analytics.sessions)) {
      const timeBasedMetrics = getTimeBasedMetrics(analytics.sessions);
      if (timeBasedMetrics) {
        metrics.timeBasedMetrics = timeBasedMetrics;
      }
    }

    // Enhanced Web3 metrics
    if (analytics.walletsConnected && analytics.walletsConnected > 0) {
      const web3Metrics = {
        totalWallets: analytics.walletsConnected,
        walletsByType: {},
        chainInteractions: {},
        topContracts: [],
        walletActivity: {
          activeWallets: {},
          transactionVolume: {},
          uniqueContracts: {}
        }
      };

      // Process wallet types with timeline data
      if (analytics.walletTypes) {
        const walletTimeline = {};
        Object.entries(analytics.walletTypes).forEach(([type, data]) => {
          if (typeof data === 'object') {
            // If we have timeline data
            Object.entries(data).forEach(([period, count]) => {
              if (!walletTimeline[period]) walletTimeline[period] = {};
              if (count > 0) walletTimeline[period][type] = count;
            });
          } else if (data > 0) {
            // If we just have total counts
            web3Metrics.walletsByType[type] = data;
          }
        });
        if (Object.keys(walletTimeline).length > 0) {
          web3Metrics.walletsByType = { ...web3Metrics.walletsByType, timeline: walletTimeline };
        }
      }

      // Process chain interactions with timeline data
      if (analytics.chainInteractions) {
        const chainTimeline = {};
        Object.entries(analytics.chainInteractions).forEach(([chain, data]) => {
          if (typeof data === 'object') {
            // If we have timeline data
            Object.entries(data).forEach(([period, count]) => {
              if (!chainTimeline[period]) chainTimeline[period] = {};
              if (count > 0) chainTimeline[period][chain] = count;
            });
          } else if (data > 0) {
            // If we just have total counts
            web3Metrics.chainInteractions[chain] = data;
          }
        });
        if (Object.keys(chainTimeline).length > 0) {
          web3Metrics.chainInteractions = { ...web3Metrics.chainInteractions, timeline: chainTimeline };
        }
      }

      // Process wallet activity metrics
      if (analytics.sessions) {
        const timeframes = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
          '1y': 365
        };

        Object.entries(timeframes).forEach(([label, days]) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);

          const periodSessions = analytics.sessions.filter(s => 
            new Date(s.startTime) >= cutoff && s.walletConnected
          );

          if (periodSessions.length > 0) {
            // Active wallets
            const activeWallets = new Set(periodSessions.map(s => s.walletAddress)).size;
            if (activeWallets > 0) web3Metrics.walletActivity.activeWallets[label] = activeWallets;

            // Transaction volume
            const transactions = periodSessions.reduce((sum, s) => {
              const value = parseFloat((s.transactions?.value_eth || '0').replace(/,/g, '')) || 0;
              return isNaN(value) ? sum : sum + value;
            }, 0);
            if (transactions > 0) web3Metrics.walletActivity.transactionVolume[label] = transactions;

            // Unique contracts
            const uniqueContracts = new Set(
              periodSessions.flatMap(s => s.contractInteractions?.map(i => i.contract) || [])
            ).size;
            if (uniqueContracts > 0) web3Metrics.walletActivity.uniqueContracts[label] = uniqueContracts;
          }
        });
      }

      // Clean up empty categories in wallet activity
      Object.keys(web3Metrics.walletActivity).forEach(key => {
        if (Object.keys(web3Metrics.walletActivity[key]).length === 0) {
          delete web3Metrics.walletActivity[key];
        }
      });
      if (Object.keys(web3Metrics.walletActivity).length === 0) {
        delete web3Metrics.walletActivity;
      }

      // Only include if we have actual data
      if (Object.keys(web3Metrics).length > 0) {
        metrics.web3Metrics = web3Metrics;
      }
    }

    // Filter engagement metrics to only include valid data
    const engagementMetrics = {};
    
    if (analytics.averageSessionDuration > 0) {
      engagementMetrics.averageSessionDuration = analytics.averageSessionDuration;
    }

    const pageDepth = calculatePageDepth(analytics.sessions);
    if (pageDepth.average > 0) {
      engagementMetrics.pageDepth = pageDepth;
    }

    const returnRate = calculateReturnRate(analytics.sessions);
    if (returnRate > 0) {
      engagementMetrics.returnRate = returnRate;
    }

    const timeOnPage = Object.entries(analytics.timeOnPage || {})
      .filter(([_, duration]) => duration > 0)
      .reduce((acc, [page, duration]) => ({ ...acc, [page]: duration }), {});
    if (Object.keys(timeOnPage).length > 0) {
      engagementMetrics.timeOnPage = timeOnPage;
    }

    const exitPages = processExitPages(analytics.exitPages)
      .filter(page => page.count > 0);
    if (exitPages.length > 0) {
      engagementMetrics.exitPages = exitPages;
    }

    const entryPages = processEntryPages(analytics.entryPages)
      .filter(page => page.count > 0);
    if (entryPages.length > 0) {
      engagementMetrics.entryPages = entryPages;
    }

    const userFlow = calculateUserFlow(analytics.sessions)
      .filter(flow => flow.count > 0);
    if (userFlow.length > 0) {
      engagementMetrics.userFlow = userFlow;
    }

    if (Object.keys(engagementMetrics).length > 0) {
      metrics.engagementMetrics = engagementMetrics;
    }

    // Remove any empty metric categories
    Object.keys(metrics).forEach(key => {
      if (!isValidValue(metrics[key])) {
        delete metrics[key];
      }
    });

    return Object.keys(metrics).length > 0 ? metrics : null;
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

  // Update the generateAnalyticsSummary function
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
      }
    };

    // Add DAU/WAU/MAU if available
    const activityMetrics = calculateRetentionMetrics(analytics.sessions);
    if (activityMetrics) {
      if (activityMetrics.dau > 0) fullAnalytics.overview.dau = activityMetrics.dau;
      if (activityMetrics.wau > 0) fullAnalytics.overview.wau = activityMetrics.wau;
      if (activityMetrics.mau > 0) fullAnalytics.overview.mau = activityMetrics.mau;
      if (Object.keys(activityMetrics.retention).length > 0) {
        fullAnalytics.overview.retention = activityMetrics.retention;
      }
    }

    // Only include metrics with valid values
    if (fullAnalytics.overview.totalPageViews === 0) delete fullAnalytics.overview.totalPageViews;
    if (fullAnalytics.overview.uniqueVisitors === 0) delete fullAnalytics.overview.uniqueVisitors;
    if (fullAnalytics.overview.averageSessionDuration === 0) delete fullAnalytics.overview.averageSessionDuration;
    if (fullAnalytics.overview.bounceRate === 0) delete fullAnalytics.overview.bounceRate;

    // Add advanced metrics if they exist
    if (advancedMetrics) {
      Object.entries(advancedMetrics).forEach(([key, value]) => {
        if (isValidValue(value)) {
          fullAnalytics[key] = value;
        }
      });
    }

    // Add geographical and traffic data if they exist
    if (geoData && isValidValue(geoData)) fullAnalytics.geography = geoData;
    if (trafficData && isValidValue(trafficData)) fullAnalytics.traffic = trafficData;

    // Add smart contract transaction data if available
    if (selectedContract && contractTransactions && contractTransactions.length > 0) {
      // Find the selected contract details
      const contractDetails = contractArray.find(contract => contract.id === selectedContract);
      
      // Process transaction data
      if (contractDetails) {
        const contractData = processContractTransactions(contractDetails, contractTransactions);
        fullAnalytics.smartContract = contractData;
      }
    }

    // Remove empty sections
    Object.keys(fullAnalytics).forEach(key => {
      if (!isValidValue(fullAnalytics[key])) {
        delete fullAnalytics[key];
      }
    });

    console.log("========== ENHANCED ANALYTICS CONTEXT ==========");
    console.log("Processed Analytics Data:", fullAnalytics);
    console.log("==============================================");

    // Update the system context to include expert knowledge
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
      
      EXPERT KNOWLEDGE BASE:
      ${expertContext}
      
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
      FORMATTING INSTRUCTIONS (CRITICALLY IMPORTANT):
      1. Format all responses with extreme care for readability and conciseness
      2. Always keep metrics and their values on the same line - never split them with line breaks
      3. Format metrics uniformly as "**Metric Name:** value" (no line breaks)
      4. Format page metrics as "**Page Path:** value views"
      5. Use proper spacing and maintain consistent indentation
      6. Format percentages inline as "X%"
      7. Keep parenthetical information on the same line as the data it elaborates on
      8. Format lists consistently - use bullet points (*) with clear, concise text
      9. Maintain a structured hierarchy with section headings (use ###)
      10. Always properly format numerical values with appropriate units
      11. When displaying multiple metrics, group related ones together
      12. Keep the output visually clean and structured
      13. Ensure each heading is followed by explanatory text, not immediately by metrics
      14. Place all bulleted items at the same indentation level
      15. Format numbered lists with consistent indentation
      16. Always maintain a clear, professional tone focused on insights
      17. Sections should be clearly demarcated with proper spacing
      18. Keep explanations concise but informative
      19. Never repeat the same information in different sections
      20. Avoid unnecessary line breaks between related content
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

  // Helper function to process smart contract transaction data
  const processContractTransactions = (contractDetails, transactions) => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return null;
    }

    // Start with basic contract info
    const contractData = {
      contractInfo: {
        address: contractDetails.address,
        name: contractDetails.name,
        blockchain: contractDetails.blockchain,
        tokenSymbol: contractDetails.tokenSymbol || 'Unknown',
        totalTransactions: transactions.length,
        firstTransaction: null,
        latestTransaction: null
      },
      summary: {
        uniqueUsers: new Set(transactions.map(tx => tx.from_address)).size,
        uniqueReceivers: new Set(transactions.map(tx => tx.to_address)).size,
        totalVolume: transactions.reduce((sum, tx) => {
          const value = parseFloat((tx.value_eth || '0').replace(/,/g, '')) || 0;
          return isNaN(value) ? sum : sum + value;
        }, 0),
        averageTransactionValue: 0,
        medianTransactionValue: 0
      },
      timeSeries: {
        hourly: {},
        daily: {},
        weekly: {},
        monthly: {}
      },
      walletAnalytics: {
        topSenders: [],
        topReceivers: [],
        mostFrequentUsers: [],
        walletActivity: {}
      },
      transactionSizeDistribution: {
        small: 0,     // < 0.1
        medium: 0,    // 0.1 - 1
        large: 0,     // 1 - 10
        whale: 0      // > 10
      },
      timeOfDayDistribution: {
        morning: 0,   // 6am - 12pm
        afternoon: 0, // 12pm - 6pm
        evening: 0,   // 6pm - 12am
        night: 0      // 12am - 6am
      },
      dayOfWeekDistribution: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0
      }
    };

    // Sort transactions by block time
    const sortedTransactions = [...transactions].sort((a, b) => {
      return new Date(a.block_time) - new Date(b.block_time);
    });

    // Set first and last transaction times
    if (sortedTransactions.length > 0) {
      contractData.contractInfo.firstTransaction = sortedTransactions[0].block_time;
      contractData.contractInfo.latestTransaction = sortedTransactions[sortedTransactions.length - 1].block_time;
    }

    // Calculate average and median transaction values
    const values = transactions.map(tx => parseFloat((tx.value_eth || '0').replace(/,/g, '')) || 0).filter(val => !isNaN(val) && val > 0);
    
    if (values.length > 0) {
      contractData.summary.averageTransactionValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      contractData.summary.medianTransactionValue = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    }
    
    // Process transaction size distribution
    transactions.forEach(tx => {
      const value = parseFloat((tx.value_eth || '0').replace(/,/g, '')) || 0;
      if (!isNaN(value) && value > 0) {
        if (value < 0.1) contractData.transactionSizeDistribution.small++;
        else if (value < 1) contractData.transactionSizeDistribution.medium++;
        else if (value < 10) contractData.transactionSizeDistribution.large++;
        else contractData.transactionSizeDistribution.whale++;
      }

      // Track sender volumes and counts
      if (tx.from_address) {
        senderCounts[tx.from_address] = (senderCounts[tx.from_address] || 0) + 1;
        const senderValue = parseFloat((tx.value_eth || '0').replace(/,/g, '')) || 0;
        senderVolumes[tx.from_address] = (senderVolumes[tx.from_address] || 0) + senderValue;
      }
    });

    // Create wallet analysis
    const senderVolumes = {};
    const receiverVolumes = {};
    const senderCounts = {};
    const receiverCounts = {};
    const walletActivity = {};

    // Get top senders and receivers by volume and frequency
    contractData.walletAnalytics.topSenders = Object.entries(senderVolumes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, volume]) => ({
        address,
        volume,
        transactionCount: senderCounts[address] || 0
      }));

    contractData.walletAnalytics.topReceivers = Object.entries(receiverVolumes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, volume]) => ({
        address,
        volume,
        transactionCount: receiverCounts[address] || 0
      }));

    // Most active wallets by total transaction count (sent + received)
    const combinedActivity = {};
    Object.keys(walletActivity).forEach(address => {
      combinedActivity[address] = walletActivity[address].sent.count + walletActivity[address].received.count;
    });

    contractData.walletAnalytics.mostFrequentUsers = Object.entries(combinedActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, totalCount]) => ({
        address,
        totalTransactions: totalCount,
        sentTransactions: walletActivity[address].sent.count,
        receivedTransactions: walletActivity[address].received.count,
        totalVolume: walletActivity[address].sent.volume + walletActivity[address].received.volume,
        firstSeen: walletActivity[address].firstSeen,
        lastSeen: walletActivity[address].lastSeen
      }));

    // Generate time series data
    const hourlyData = {};
    const dailyData = {};
    const weeklyData = {};
    const monthlyData = {};

    transactions.forEach(tx => {
      const date = new Date(tx.block_time);
      const value = parseFloat((tx.value_eth || '0').replace(/,/g, '')) || 0;
      
      // Skip invalid values
      if (isNaN(value) || value < 0) {
        console.warn(`Invalid transaction value: ${tx.value_eth} for tx: ${tx.tx_hash}`);
        return;
      }
      
      // Hourly aggregation - format: "YYYY-MM-DD HH:00"
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { count: 0, volume: 0, uniqueAddresses: new Set() };
      }
      hourlyData[hourKey].count++;
      hourlyData[hourKey].volume += value;
      hourlyData[hourKey].uniqueAddresses.add(tx.from_address);
      if (tx.to_address) hourlyData[hourKey].uniqueAddresses.add(tx.to_address);
      
      // Daily aggregation - format: "YYYY-MM-DD"
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { count: 0, volume: 0, uniqueAddresses: new Set() };
      }
      dailyData[dayKey].count++;
      dailyData[dayKey].volume += value;
      dailyData[dayKey].uniqueAddresses.add(tx.from_address);
      if (tx.to_address) dailyData[dayKey].uniqueAddresses.add(tx.to_address);
      
      // Weekly aggregation - format: "YYYY-WW" (ISO week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Adjust to Monday
      const weekNumber = Math.ceil((((weekStart - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
      const weekKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { count: 0, volume: 0, uniqueAddresses: new Set() };
      }
      weeklyData[weekKey].count++;
      weeklyData[weekKey].volume += value;
      weeklyData[weekKey].uniqueAddresses.add(tx.from_address);
      if (tx.to_address) weeklyData[weekKey].uniqueAddresses.add(tx.to_address);
      
      // Monthly aggregation - format: "YYYY-MM"
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, volume: 0, uniqueAddresses: new Set() };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].volume += value;
      monthlyData[monthKey].uniqueAddresses.add(tx.from_address);
      if (tx.to_address) monthlyData[monthKey].uniqueAddresses.add(tx.to_address);
    });

    // Convert time series data to arrays and process Sets for uniqueAddresses
    contractData.timeSeries.hourly = Object.entries(hourlyData)
      .map(([time, data]) => ({
        time,
        count: data.count,
        volume: data.volume,
        uniqueAddresses: data.uniqueAddresses.size
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    contractData.timeSeries.daily = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        count: data.count,
        volume: data.volume,
        uniqueAddresses: data.uniqueAddresses.size
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    contractData.timeSeries.weekly = Object.entries(weeklyData)
      .map(([week, data]) => ({
        week,
        count: data.count,
        volume: data.volume,
        uniqueAddresses: data.uniqueAddresses.size
      }))
      .sort((a, b) => {
        const [aYear, aWeek] = a.week.split('-W').map(Number);
        const [bYear, bWeek] = b.week.split('-W').map(Number);
        return aYear !== bYear ? aYear - bYear : aWeek - bWeek;
      });

    contractData.timeSeries.monthly = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        count: data.count,
        volume: data.volume,
        uniqueAddresses: data.uniqueAddresses.size
      }))
      .sort((a, b) => {
        const [aYear, aMonth] = a.month.split('-').map(Number);
        const [bYear, bMonth] = b.month.split('-').map(Number);
        return aYear !== bYear ? aYear - bYear : aMonth - bMonth;
      });

    return contractData;
  };

  // Initialize Gemini AI
  const initializeAI = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API || 
                  window.ENV?.NEXT_PUBLIC_GEMINI_API || 
                  'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
    return new GoogleGenerativeAI(apiKey, {
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta'
    });
  };

  // Verify model availability
  const verifyModel = async () => {
    try {
      console.log('Skipping backend API, using direct model selection...');
      
      // Define preferred models in order of preference (prioritizing models with higher quotas)
      const preferredModels = [
        'gemini-1.5-flash',        // Higher free tier quotas
        'gemini-1.5-flash-002',    // Alternative flash model
        'gemini-1.5-pro',          // Fallback to pro model
        'gemini-2.0-flash',        // Newer flash model
        'gemini-2.5-pro'           // Last resort (lower quotas)
      ];
      
      // For now, just return the first preferred model without calling the backend
      const selectedModel = preferredModels[0];
      console.log(`Using preferred model: ${selectedModel}`);
      return selectedModel;
      
    } catch (error) {
      console.error("Error in model verification:", error);
      // Fallback to a safe default with higher quotas
      console.log('Using safe fallback model: gemini-1.5-flash');
      return 'gemini-1.5-flash';
    }
  };

  const formatResponse = (response) => {
    let formattedText = response
      .trim()
      // Fix heading formatting
      .replace(/#+\s*(.*?)(?=\n|$)/g, '### $1')
      
      // Format metrics to be on the same line
      .replace(/(\*\*[^:]+):\*\*\s*\n+(`[^`]+`)/g, '**$1:** $2')
      .replace(/(\*\*[^:]+):\*\*\s*\n+(\d+|true|false)(?=\s|\n|$)/g, '**$1:** $2')
      
      // Fix metric value formatting (value on newline)
      .replace(/([^:]+):\s*\n+(\d[^\n]*|`[^`]+`)(?=\n)/g, '$1: $2')
      
      // Format page metrics to be on the same line
      .replace(/(`[^`]+`):\s*\n+(\d+)\s*\n+views/g, '$1: $2 views')
      
      // Format percentages to be on the same line
      .replace(/(\d+)%\s*\n+/g, '$1% ')
      
      // Format bullet points with their content
      .replace(/(\* [^\n]+)\s*\n+([^*\n][^\n]*?)(?=\n+\*|\n+$|\n+###|\n\n)/g, '$1 $2')
      
      // Format metrics with values in code blocks
      .replace(/\*\*([^:]+):\*\*\s*\n+```([^`]+)```/g, '**$1:** `$2`')
      
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      
      // Format metrics with their context on same line
      .replace(/(\d+)\s*\n+\(([^)]+)\)/g, '$1 ($2)')
      
      // Format metrics consistently
      .replace(/\*\*([^:]+):\*\*\s*(`[^`]+`)/g, '**$1:** $2')
      
      // Clean up spacing around parentheses
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      
      // Fix common inline formatting issues
      .replace(/^([\w\s]+):\s*\n+(\d+)/gm, '$1: $2')
      .replace(/([\w\s]+):\s*\n+(\w+)/g, '$1: $2')
      
      // Fix sub-list formatting
      .replace(/\n\s+([0-9]+)\.\s+/g, '\n$1. ')
      
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
      .replace(/`\s+/g, '` ')
      
      // Ensure colons and values are on the same line
      .replace(/(:\s*)\n+/g, '$1')
      
      // Fix nested metrics that might be separated
      .replace(/(\*\*[^*\n]+\*\*)\s*\n+(\d|`)/g, '$1 $2')
      
      // Ensure all bullet points have a space after the asterisk
      .replace(/\n\*(?!\s)/g, '\n* ')
      
      // Fix subsection headings (numbered lists after headings)
      .replace(/(### [^\n]+)\n+([0-9]+)\.\s+/g, '$1\n\n$2. ')
      
      // Fix paragraphs after bullet points
      .replace(/(\* [^\n]+)\n+([^*#\n][^\n]+)/g, '$1\n$2')
      
      // Clean up section separations with proper spacing 
      .replace(/(### [^\n]+)\n+/g, '$1\n\n')
      
      // Additional fixes for specific issues
      .replace(/transactions\s*\n+/g, 'transactions ')
      .replace(/visitors\s*\n+/g, 'visitors ')
      .replace(/\n+based on/gi, ' based on');

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
        // Use SDK approach only (skip backend API)
        const ai = initializeAI();
        const modelName = await verifyModel();
        console.log("Using model for SDK:", modelName);
        
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(messageWithContext);
        const response = await result.response;
        botMessage = response.text();
      } catch (sdkError) {
        console.log("SDK approach failed, using fallback response:", sdkError);
        
        // Check if it's a quota/rate limit error
        const isQuotaError = sdkError.message?.includes('quota') || 
                           sdkError.message?.includes('429') ||
                           sdkError.message?.includes('rate limit');
        
        if (isQuotaError) {
          // Create a quota-specific fallback response
          botMessage = `I'm currently experiencing high demand and have temporarily reached API limits. However, I can still provide you with insights based on your analytics data:

## Analytics Summary for ${selectedSite ? `"${selectedSite}"` : 'your website'}

${analytics && analytics.pageViews ? `**Total Page Views:** ${Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0)}` : '**Page Views:** Data not available at the moment'}

${analytics && analytics.uniqueVisitors ? `**Unique Visitors:** ${analytics.uniqueVisitors}` : '**Unique Visitors:** Data not available at the moment'}

${analytics && analytics.walletsConnected ? `**Connected Wallets:** ${analytics.walletsConnected}` : '**Connected Wallets:** Data not available at the moment'}

${analytics && analytics.web3Visitors ? `**Web3 Visitors:** ${analytics.web3Visitors}` : '**Web3 Visitors:** Data not available at the moment'}

### Regarding your question: "${userMessage}"

Based on your analytics data, here are some insights I can provide:

- **Performance Trends**: Your current visitor metrics show ${analytics?.uniqueVisitors > 0 ? 'active user engagement' : 'baseline activity levels'}
- **Web3 Adoption**: ${analytics?.walletsConnected > 0 ? `${analytics.walletsConnected} wallet connections indicate growing Web3 user adoption` : 'Web3 integration is ready for user adoption'}
- **User Engagement**: ${analytics?.pageViews ? `With ${Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0)} page views, your content is attracting visitor attention` : 'User engagement metrics are being tracked'}

*Note: AI analysis is temporarily limited due to high demand. Please try again in a few minutes for full AI-powered insights, or consider upgrading to a paid plan for unlimited access.*`;
        } else {
          // Generic fallback for other errors
          botMessage = `I'm currently experiencing connectivity issues with the AI service, but I can provide you with some insights based on your analytics data:

## Analytics Summary for ${selectedSite ? `"${selectedSite}"` : 'your website'}

${analytics && analytics.pageViews ? `**Total Page Views:** ${Object.values(analytics.pageViews || {}).reduce((sum, views) => sum + views, 0)}` : '**Page Views:** Data not available at the moment'}

${analytics && analytics.uniqueVisitors ? `**Unique Visitors:** ${analytics.uniqueVisitors}` : '**Unique Visitors:** Data not available at the moment'}

${analytics && analytics.walletsConnected ? `**Connected Wallets:** ${analytics.walletsConnected}` : '**Connected Wallets:** Data not available at the moment'}

${analytics && analytics.web3Visitors ? `**Web3 Visitors:** ${analytics.web3Visitors}` : '**Web3 Visitors:** Data not available at the moment'}

### What you asked about: "${userMessage}"

Based on your question, here are some general insights:

- **Website Performance**: Your site analytics show visitor engagement patterns
- **Web3 Integration**: Wallet connections indicate user Web3 adoption
- **User Behavior**: Session data reveals how users interact with your platform

*Note: Full AI analysis is temporarily unavailable. Please try again in a few minutes for detailed insights.*`;
        }
      }

      // Format the response before displaying
      const formattedMessage = formatResponse(botMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: formattedMessage,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      console.error('Full Error Details:', err);
      setError('Failed to get response. Please try again.');
      
      // Add a fallback message even if the entire try block fails
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error processing your request. This might be due to temporary connectivity issues. Please try again in a few minutes.',
        timestamp: new Date().toISOString()
      }]);
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
          ? 'bg-[#1d0c46] text-white user-message'
          : 'bg-white shadow-sm border border-gray-100 assistant-message'
      }`}>
        {message.role === 'assistant' && (
          <div className="flex items-center mb-2">
            <div className="logo-container mr-2">
              <img src="/logo192.png" alt="Cryptique" className="w-5 h-5 animate-cube-spin" />
            </div>
            <div className="text-xs text-[#caa968] font-semibold tracking-wider uppercase">CQ Intelligence</div>
          </div>
        )}
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

    /* Input field glow effect */
    .input-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      border-radius: 0.5rem;
      opacity: 0;
      box-shadow: 0 0 0 2px rgba(202, 169, 104, 0.1), 0 0 15px 2px rgba(202, 169, 104, 0.1);
      transition: opacity 0.3s ease;
    }

    input:focus + .input-glow {
      opacity: 1;
    }

    input:focus {
      box-shadow: 0 4px 20px rgba(29, 12, 70, 0.07) !important;
    }

    .focus\\:shadow-input:focus {
      box-shadow: 0 4px 20px rgba(29, 12, 70, 0.07);
    }

    /* Logo 3D effect */
    .logo-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 800px;
    }

    .logo-container img {
      transform-style: preserve-3d;
      backface-visibility: visible;
    }

    .logo-container::after {
      content: '';
      position: absolute;
      top: -15%;
      left: -15%;
      right: -15%;
      bottom: -15%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(202, 169, 104, 0.2) 0%, rgba(29, 12, 70, 0) 70%);
      z-index: -1;
      animation: pulse-glow 3s infinite alternate;
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

    /* Futuristic Message Styling */
    .user-message {
      position: relative;
      box-shadow: 0 0 20px rgba(29, 12, 70, 0.2);
      overflow: hidden;
    }

    .user-message::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(to bottom, #caa968, #1d0c46);
    }

    .assistant-message {
      position: relative;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
      background: linear-gradient(to right, #ffffff, #f9f9ff);
      border-left: 2px solid #caa968 !important;
      border-top: none !important;
      border-right: none !important;
      border-bottom: none !important;
    }

    .assistant-message::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 50%;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(202, 169, 104, 0.5));
    }

    @keyframes pulse-glow {
      0% { opacity: 0.5; transform: scale(0.9); }
      100% { opacity: 0.8; transform: scale(1.1); }
    }

    /* 3D Cube Animation */
    .cube-wrapper {
      width: 60px;
      height: 60px;
      perspective: 600px;
      margin: 1rem;
      position: relative;
    }

    .cube-wrapper::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 10px;
      background: radial-gradient(ellipse at center, rgba(202, 169, 104, 0.5) 0%, rgba(202, 169, 104, 0) 80%);
      bottom: -10px;
      left: 0;
      border-radius: 50%;
      filter: blur(3px);
    }

    .cube {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      animation: rotate 4s infinite linear;
    }

    .cube-face {
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, #caa968, #1d0c46);
      opacity: 0.8;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 10px rgba(202, 169, 104, 0.5);
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
      box-shadow: 0 4px 15px rgba(202, 169, 104, 0.08);
      position: relative;
      overflow: hidden;
    }

    .loading-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #caa968, transparent);
      animation: scan-line 2s infinite linear;
    }

    @keyframes scan-line {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .loading-text {
      margin-top: 1rem;
      color: #1d0c46;
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
      animation: pulse 1.5s infinite;
      position: relative;
    }

    .loading-text::after {
      content: '.';
      animation: dots 1.5s infinite;
    }

    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
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
                <div className="logo-container mb-6">
                  <img src="/logo192.png" alt="Cryptique" className="w-16 h-16 animate-cube-spin" />
                </div>
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
                <div className="logo-container">
                  <img src="/logo192.png" alt="Cryptique" className="w-7 h-7 animate-cube-spin" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1d0c46]">CQ Intelligence</h1>
                  <p className="text-gray-500 mt-1">Ask anything about your website's analytics and performance</p>
                </div>
              </div>
              
              {/* Selectors Section */}
              <div className="flex items-center gap-4 min-w-[300px]">
                {/* Website Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Select Website</label>
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
                
                {/* Smart Contract Selector */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Select Smart Contract</label>
                  <select
                    value={selectedContract}
                    onChange={handleContractChange}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968] bg-white text-sm"
                    disabled={isLoadingContracts}
                  >
                    <option value="">Select a contract</option>
                    {contractArray.map(contract => (
                      <option key={contract.id} value={contract.id}>
                        {contract.name} {contract.tokenSymbol ? `(${contract.tokenSymbol})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Loading Indicators */}
            <div className="flex mt-2 text-xs text-gray-500">
              {isDataLoading && (
                <div className="flex items-center mr-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                  <span>Loading website analytics...</span>
                </div>
              )}
              {isLoadingTransactions && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                  <span>Loading contract transactions... {loadedTransactionCount > 0 && `(${loadedTransactionCount} loaded)`}</span>
                </div>
              )}
              {!isLoadingTransactions && selectedContract && contractTransactions.length > 0 && (
                <div className="flex items-center text-gray-600">
                  <span>{contractTransactions.length} transactions loaded for selected contract</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <ChatArea />

          {/* Input Area */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={selectedSite ? "Ask about your analytics..." : "Select a website first to ask questions"}
                  disabled={!selectedSite || isLoading}
                  className="w-full p-4 pl-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#caa968] focus:border-transparent focus:shadow-input disabled:bg-gray-100 disabled:text-gray-400 transition-all duration-300 bg-white"
                />
                <div className="input-glow"></div>
              </div>
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !selectedSite}
                className={`px-8 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  isLoading || !input.trim() || !selectedSite
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-[#1d0c46] text-white hover:bg-[#1d0c46]/90 hover:shadow-lg hover:shadow-[#1d0c46]/20'
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