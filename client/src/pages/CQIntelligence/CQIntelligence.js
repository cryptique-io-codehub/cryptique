import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';
import GoogleGenerativeAI from '../../lib/GoogleGenerativeAI';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import axios from 'axios';

const CQIntelligence = () => {
  const [selectedSite, setSelectedSite] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pythonServicesAvailable, setPythonServicesAvailable] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Python services availability on component mount
  useEffect(() => {
    checkPythonServices();
  }, []);

  const checkPythonServices = async () => {
    try {
      // Check if Python services are available
      const response = await axios.get('/api/python/health', { timeout: 5000 });
      if (response.data.status === 'healthy') {
        setPythonServicesAvailable(true);
        console.log('Python services are available');
      }
    } catch (error) {
      console.log('Python services not available, using fallback mode');
      setPythonServicesAvailable(false);
    }
  };

  // Enhanced chart colors
  const chartColors = {
    primary: '#1d0c46',
    secondary: '#caa968',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  };

  // MetricCard component
  const MetricCard = ({ title, value, change, icon: Icon }) => (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm text-gray-600 font-medium">{title}</h4>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {change !== null && change !== undefined && (
              <span className={`text-sm font-medium ${
                change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className="p-2 bg-gray-50 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );

  // DataTable component
  const DataTable = ({ title, columns, data }) => (
    <div className="mb-8 overflow-x-auto bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.format ? column.format(row[column.key]) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const VisualizationComponent = ({ visualization }) => {
    const { type, title, description, data } = visualization;

    const renderChart = () => {
      switch(type) {
        case 'multiLine':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                  <Line 
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={index === 0 ? '#1d0c46' : index === 1 ? '#caa968' : '#8884d8'}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );

        case 'multiBar':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(data[0] || {}).filter(key => key !== 'name').map((key, index) => (
                  <Bar 
                    key={key}
                    dataKey={key}
                    fill={index === 0 ? '#1d0c46' : '#caa968'}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );

        case 'pie':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#1d0c46"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 ? '#1d0c46' : '#caa968'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          );

        case 'scatter':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sessions" name="Sessions" />
                <YAxis dataKey="transactions" name="Transactions" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name="Users" data={data} fill="#1d0c46" />
              </ScatterChart>
            </ResponsiveContainer>
          );

        case 'composed':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="activity" fill="#1d0c46" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#caa968" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          );

        case 'area':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#1d0c46" 
                  fill="#1d0c46" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          );

        default:
          return null;
      }
    };

    return (
      <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
        {title && <h3 className="text-xl font-semibold mb-2">{title}</h3>}
        {description && <p className="text-gray-600 mb-4">{description}</p>}
        {renderChart()}
      </div>
    );
  };

  const InsightsComponent = ({ insights }) => (
    <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        Key Insights
      </h3>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-gray-700">{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const ResponseComponent = ({ response }) => {
    return (
      <div className="space-y-6">
        <p className="text-lg text-gray-800">{response.content}</p>
        
        {response.metrics?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {response.metrics.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        )}
        
        {response.visualizations?.map((visualization, index) => (
          <VisualizationComponent key={index} visualization={visualization} />
        ))}
        
        {response.tables?.map((table, index) => (
          <DataTable key={index} {...table} />
        ))}
        
        {response.insights?.length > 0 && (
          <InsightsComponent insights={response.insights} />
        )}
      </div>
    );
  };

  // Python services integration
  const queryPythonServices = async (userMessage, siteId, teamId) => {
    try {
      const query = userMessage.toLowerCase();
      
      // Determine the type of analysis needed
      let endpoint = '/api/python/process/analytics';
      let requestData = {
        site_id: siteId,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        data_types: ['analytics', 'sessions', 'transactions']
      };

      // Route to specific Python service endpoints based on query
      if (query.includes('journey') || query.includes('funnel')) {
        endpoint = '/api/python/process/user-journeys';
        requestData = { site_id: siteId, time_window: 30 };
      } else if (query.includes('time') || query.includes('trend') || query.includes('forecast')) {
        endpoint = '/api/python/process/time-series';
        requestData = { site_id: siteId, metric: 'sessions', time_window: 90 };
      } else if (query.includes('web3') || query.includes('wallet') || query.includes('transaction')) {
        endpoint = '/api/python/process/web3-patterns';
        requestData = { site_id: siteId, time_window: 30 };
      } else if (query.includes('predict') || query.includes('churn') || query.includes('conversion')) {
        endpoint = '/api/python/ml/predict';
        requestData = { 
          site_id: siteId, 
          prediction_type: query.includes('churn') ? 'churn' : 'conversion',
          time_window: 30 
        };
      }

      console.log(`Querying Python service: ${endpoint}`, requestData);
      
      const response = await axios.post(endpoint, requestData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data,
          source: 'python_services'
        };
      } else {
        throw new Error(response.data.error || 'Python service returned unsuccessful response');
      }
    } catch (error) {
      console.error('Python services error:', error);
      return {
        success: false,
        error: error.message || 'Failed to query Python services'
      };
    }
  };

  // Enhanced RAG query using vector search
  const queryVectorDatabase = async (userMessage, siteId, teamId) => {
    try {
      const response = await axios.post('/api/ai/query', {
        query: userMessage,
        siteId: siteId,
        teamId: teamId,
        timeframe: '30d'
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          source: 'vector_database'
        };
      } else {
        throw new Error('Vector database query failed');
      }
    } catch (error) {
      console.error('Vector database error:', error);
      return {
        success: false,
        error: error.message || 'Failed to query vector database'
      };
    }
  };

  // Generate enhanced response with AI
  const generateAIResponse = async (userMessage, contextData) => {
    try {
      const apiKey = process.env.REACT_APP_GEMINI_API || 
                    process.env.NEXT_PUBLIC_GEMINI_API || 
                    'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
      
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const contextPrompt = `
        You are CQ Intelligence, an advanced analytics AI assistant for Cryptique.
        
        User Query: "${userMessage}"
        
        Context Data: ${JSON.stringify(contextData, null, 2)}
        
        Please provide a comprehensive analysis based on the data provided. Include:
        1. Direct answer to the user's question
        2. Key insights from the data
        3. Actionable recommendations
        4. Relevant trends or patterns
        
        Keep your response conversational and insightful, focusing on business value.
      `;
      
      const result = await model.generateContent(contextPrompt);
      const response = await result.response;
      
      return {
        success: true,
        content: response.text(),
        source: 'ai_enhanced'
      };
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate AI response'
      };
    }
  };

  const generateEnhancedResponse = (userMessage) => {
    const query = userMessage.toLowerCase();
    
    // Traffic comparison query
    if (query.includes('traffic') && query.includes('compare')) {
      return {
        content: "Your website traffic has grown significantly this month. You received 1,557 page views compared to 340 last month - that's a 357% increase in traffic.\n\nLet me show you the detailed breakdown with correlations between your off-chain website activity and on-chain transactions:",
        visualizations: [
          {
            type: 'multiBar',
            title: 'Monthly Comparison: Off-Chain vs On-Chain Activity',
            description: 'Comparing website sessions, wallet connections, and transaction volume',
            data: [
              { name: 'Last Month', sessions: 340, transactions: 45, walletConnections: 84 },
              { name: 'This Month', sessions: 1557, transactions: 187, walletConnections: 336 }
            ]
          },
          {
            type: 'multiLine',
            title: '30-Day Trend Analysis',
            description: 'Daily progression showing correlation between website activity and blockchain interactions',
            data: Array.from({length: 30}, (_, i) => ({
              name: `Day ${i + 1}`,
              sessions: Math.floor(Math.random() * 100) + 20,
              transactions: Math.floor(Math.random() * 20) + 2,
              volume: Math.floor(Math.random() * 1000) + 100
            }))
          },
          {
            type: 'pie',
            title: 'Traffic Source Distribution',
            data: [
              { name: 'Direct', value: 635 },
              { name: 'Google', value: 191 },
              { name: 'Instagram', value: 50 },
              { name: 'LinkedIn', value: 21 },
              { name: 'Others', value: 43 }
            ]
          },
          {
            type: 'composed',
            title: 'Conversion Funnel Analysis',
            description: 'Sessions vs conversion rate to on-chain activity',
            data: Array.from({length: 7}, (_, i) => ({
              name: `Week ${i + 1}`,
              sessions: Math.floor(Math.random() * 200) + 100,
              conversionRate: Math.floor(Math.random() * 15) + 5
            }))
          }
        ],
        tables: [
          {
            title: 'Top Performing Days',
            columns: [
              { key: 'date', label: 'Date' },
              { key: 'sessions', label: 'Sessions' },
              { key: 'transactions', label: 'Transactions' },
              { key: 'conversion', label: 'Conversion Rate', format: (val) => `${val}%` }
            ],
            data: [
              { date: '2024-01-15', sessions: 89, transactions: 12, conversion: 13.5 },
              { date: '2024-01-14', sessions: 76, transactions: 8, conversion: 10.5 },
              { date: '2024-01-13', sessions: 94, transactions: 15, conversion: 16.0 }
            ]
          }
        ],
        metrics: [
          { title: 'Total Sessions', value: '1,557', change: 357 },
          { title: 'Wallet Connections', value: '336', change: 300 },
          { title: 'On-Chain Transactions', value: '187', change: 315 },
          { title: 'Avg. Session Duration', value: '4.2m', change: 12 }
        ],
        insights: [
          "Your 357% traffic increase correlates with a 315% increase in on-chain transactions, showing strong conversion.",
          "Direct traffic (635 visits) shows the highest conversion rate to wallet connections at 52.9%.",
          "Peak activity occurs between 2-4 PM UTC, aligning with your target market's active hours.",
          "Instagram traffic has a 34% higher conversion rate to transactions compared to Google traffic."
        ]
      };
    }

    // Wallet analysis query
    if (query.includes('wallet') || query.includes('transaction')) {
      return {
        content: "Here's an analysis of wallet activity and transactions over the past 30 days. I'll show you the patterns in wallet connections, transaction volumes, and user behavior:",
        visualizations: [
          {
            type: 'multiLine',
            title: 'Wallet Activity Trends',
            description: 'Daily wallet connections and transaction patterns',
            data: Array.from({length: 30}, (_, i) => ({
              name: `Day ${i + 1}`,
              connections: Math.floor(Math.random() * 50) + 10,
              transactions: Math.floor(Math.random() * 30) + 5,
              volume: Math.floor(Math.random() * 5000) + 1000
            }))
          },
          {
            type: 'pie',
            title: 'Transaction Size Distribution',
            description: 'Distribution of transaction sizes by volume',
            data: [
              { name: 'Small (<0.1 ETH)', value: 45 },
              { name: 'Medium (0.1-1 ETH)', value: 30 },
              { name: 'Large (1-10 ETH)', value: 15 },
              { name: 'Whale (>10 ETH)', value: 10 }
            ]
          },
          {
            type: 'composed',
            title: 'Wallet Retention Analysis',
            description: 'New vs returning wallet connections',
            data: Array.from({length: 7}, (_, i) => ({
              name: `Week ${i + 1}`,
              newWallets: Math.floor(Math.random() * 100) + 20,
              retentionRate: Math.floor(Math.random() * 30) + 60
            }))
          }
        ],
        tables: [
          {
            title: 'Top Active Wallets',
            columns: [
              { key: 'wallet', label: 'Wallet Address' },
              { key: 'transactions', label: 'Transactions' },
              { key: 'volume', label: 'Volume (ETH)', format: (val) => val.toFixed(2) },
              { key: 'lastActive', label: 'Last Active' }
            ],
            data: [
              { wallet: '0x1234...5678', transactions: 45, volume: 12.5, lastActive: '2h ago' },
              { wallet: '0x8765...4321', transactions: 38, volume: 8.7, lastActive: '4h ago' },
              { wallet: '0x9876...1234', transactions: 32, volume: 6.2, lastActive: '6h ago' }
            ]
          }
        ],
        metrics: [
          { title: 'Active Wallets', value: '336', change: 25 },
          { title: 'Avg Daily Transactions', value: '42', change: 15 },
          { title: 'Total Volume (ETH)', value: '1,248', change: 30 },
          { title: 'Retention Rate', value: '68%', change: 8 }
        ],
        insights: [
          "68% of wallets that connected in the last 30 days have made multiple transactions",
          "Average transaction volume has increased by 30% in the past week",
          "Peak transaction hours align with European and American trading hours",
          "45% of transactions are small-volume trades (<0.1 ETH)"
        ]
      };
    }

    // User behavior and conversion analysis
    if (query.includes('user') || query.includes('behavior') || query.includes('conversion')) {
      return {
        content: "Let me analyze your user behavior patterns and conversion funnel. I'll show you how users move from initial visit to wallet connection and finally to transactions:",
        visualizations: [
          {
            type: 'multiBar',
            title: 'User Journey Stages',
            description: 'Progression through key conversion stages',
            data: [
              { name: 'Visitors', total: 1557, converted: 680 },
              { name: 'Web3 Users', total: 680, converted: 336 },
              { name: 'Active Traders', total: 336, converted: 187 }
            ]
          },
          {
            type: 'scatter',
            title: 'Session-to-Transaction Correlation',
            description: 'Relationship between session duration and transaction likelihood',
            data: Array.from({length: 20}, () => ({
              sessions: Math.floor(Math.random() * 100) + 20,
              transactions: Math.floor(Math.random() * 20) + 2
            }))
          },
          {
            type: 'multiLine',
            title: 'Conversion Rate Trends',
            description: 'Daily conversion rates across different stages',
            data: Array.from({length: 30}, (_, i) => ({
              name: `Day ${i + 1}`,
              toWeb3: Math.random() * 20 + 30,
              toWallet: Math.random() * 15 + 20,
              toTransaction: Math.random() * 10 + 10
            }))
          }
        ],
        tables: [
          {
            title: 'Conversion Funnel Analysis',
            columns: [
              { key: 'stage', label: 'Stage' },
              { key: 'users', label: 'Users' },
              { key: 'conversionRate', label: 'Conversion Rate', format: (val) => `${val}%` },
              { key: 'avgTime', label: 'Avg. Time to Convert' }
            ],
            data: [
              { stage: 'Visit → Web3', users: 680, conversionRate: 43.7, avgTime: '2.5 mins' },
              { stage: 'Web3 → Wallet', users: 336, conversionRate: 49.4, avgTime: '3.8 mins' },
              { stage: 'Wallet → Transaction', users: 187, conversionRate: 55.6, avgTime: '5.2 mins' }
            ]
          }
        ],
        metrics: [
          { title: 'Conversion Rate', value: '43.7%', change: 12 },
          { title: 'Avg Session Value', value: '2.8 ETH', change: 15 },
          { title: 'User Retention', value: '68%', change: 8 },
          { title: 'Bounce Rate', value: '22%', change: -5 }
        ],
        insights: [
          "43.7% of visitors become Web3 users, showing strong initial engagement",
          "Users who spend >3 minutes on site are 2.5x more likely to connect wallets",
          "Mobile users show 15% higher conversion rates than desktop users",
          "Social media traffic converts 1.8x better than search traffic"
        ]
      };
    }

    // Geographic analysis
    if (query.includes('geo') || query.includes('location') || query.includes('country')) {
      return {
        content: "Here's a breakdown of your user activity by geography, showing both website visits and on-chain interactions:",
        visualizations: [
          {
            type: 'bar',
            title: 'Top Countries by Activity',
            description: 'Combined on-chain and off-chain activity by country',
            data: [
              { name: 'United States', value: 425 },
              { name: 'United Kingdom', value: 285 },
              { name: 'Germany', value: 220 },
              { name: 'Singapore', value: 185 },
              { name: 'South Korea', value: 165 }
            ]
          },
          {
            type: 'multiLine',
            title: 'Regional Activity Trends',
            description: '30-day activity trends by region',
            data: Array.from({length: 30}, (_, i) => ({
              name: `Day ${i + 1}`,
              americas: Math.floor(Math.random() * 100) + 50,
              europe: Math.floor(Math.random() * 80) + 40,
              asia: Math.floor(Math.random() * 60) + 30
            }))
          },
          {
            type: 'composed',
            title: 'Regional Conversion Analysis',
            description: 'Sessions vs conversion rates by region',
            data: [
              { name: 'Americas', sessions: 425, conversionRate: 45 },
              { name: 'Europe', sessions: 385, conversionRate: 42 },
              { name: 'Asia', sessions: 295, conversionRate: 38 },
              { name: 'Others', sessions: 185, conversionRate: 35 }
            ]
          }
        ],
        tables: [
          {
            title: 'Regional Performance Metrics',
            columns: [
              { key: 'region', label: 'Region' },
              { key: 'users', label: 'Users' },
              { key: 'transactions', label: 'Transactions' },
              { key: 'volume', label: 'Volume (ETH)', format: (val) => val.toFixed(2) },
              { key: 'conversion', label: 'Conversion Rate', format: (val) => `${val}%` }
            ],
            data: [
              { region: 'Americas', users: 425, transactions: 185, volume: 528.45, conversion: 45 },
              { region: 'Europe', users: 385, transactions: 162, volume: 445.80, conversion: 42 },
              { region: 'Asia', users: 295, transactions: 112, volume: 325.25, conversion: 38 }
            ]
          }
        ],
        metrics: [
          { title: 'Active Countries', value: '45', change: 15 },
          { title: 'Top Region', value: 'Americas', change: null },
          { title: 'Global Conversion', value: '41.8%', change: 8 },
          { title: 'Avg Regional Volume', value: '432 ETH', change: 12 }
        ],
        insights: [
          "Americas leads with 45% conversion rate and highest transaction volume",
          "European users show longest average session duration (5.2 minutes)",
          "Asian market shows fastest growth rate (28% MoM)",
          "Peak activity times vary by region, suggesting need for localized campaigns"
        ]
      };
    }

    // Time-based analysis
    if (query.includes('time') || query.includes('hour') || query.includes('day') || query.includes('week')) {
      return {
        content: "Let me show you the temporal patterns in your platform's activity, including peak hours and day-of-week trends:",
        visualizations: [
          {
            type: 'multiLine',
            title: 'Hourly Activity Pattern',
            description: '24-hour activity distribution',
            data: Array.from({length: 24}, (_, i) => ({
              name: `${i}:00`,
              sessions: Math.floor(Math.random() * 100) + 20,
              transactions: Math.floor(Math.random() * 20) + 5,
              volume: Math.floor(Math.random() * 1000) + 200
            }))
          },
          {
            type: 'bar',
            title: 'Day of Week Analysis',
            description: 'Activity distribution across weekdays',
            data: [
              { name: 'Monday', value: 245 },
              { name: 'Tuesday', value: 285 },
              { name: 'Wednesday', value: 320 },
              { name: 'Thursday', value: 310 },
              { name: 'Friday', value: 275 },
              { name: 'Saturday', value: 180 },
              { name: 'Sunday', value: 165 }
            ]
          },
          {
            type: 'composed',
            title: 'Time vs Conversion Rate',
            description: 'How conversion rates vary throughout the day',
            data: Array.from({length: 24}, (_, i) => ({
              name: `${i}:00`,
              activity: Math.floor(Math.random() * 100) + 20,
              conversionRate: Math.floor(Math.random() * 20) + 30
            }))
          }
        ],
        tables: [
          {
            title: 'Peak Performance Times',
            columns: [
              { key: 'timeSlot', label: 'Time Slot' },
              { key: 'sessions', label: 'Sessions' },
              { key: 'transactions', label: 'Transactions' },
              { key: 'conversion', label: 'Conversion Rate', format: (val) => `${val}%` }
            ],
            data: [
              { timeSlot: '14:00-15:00', sessions: 95, transactions: 18, conversion: 18.9 },
              { timeSlot: '20:00-21:00', sessions: 88, transactions: 15, conversion: 17.0 },
              { timeSlot: '10:00-11:00', sessions: 82, transactions: 14, conversion: 17.1 }
            ]
          }
        ],
        metrics: [
          { title: 'Peak Hour', value: '14:00 UTC', change: null },
          { title: 'Best Day', value: 'Wednesday', change: null },
          { title: 'Peak Hour Conv.', value: '18.9%', change: 15 },
          { title: 'Off-Peak Conv.', value: '12.4%', change: -8 }
        ],
        insights: [
          "Peak activity occurs between 14:00-15:00 UTC with 18.9% conversion rate",
          "Wednesdays show highest overall activity and best conversion rates",
          "Weekend activity drops by 35% but shows higher average transaction values",
          "Asian market activity creates secondary peak during 04:00-06:00 UTC"
        ]
      };
    }

    // Default response for other queries
    return {
      content: "I can help you analyze various aspects of your platform. Try asking about:\n• Traffic comparisons and trends\n• Wallet activity and transactions\n• User behavior and conversion patterns\n• Geographic distribution\n• Time-based analysis",
      visualizations: [],
      tables: [],
      metrics: [],
      insights: []
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      // Get user context from localStorage or context
      const teamId = localStorage.getItem('teamId');
      const siteId = selectedSite || localStorage.getItem('selectedSiteId');
      
      let finalResponse = null;
      
      // Try Python services first if available
      if (pythonServicesAvailable && siteId) {
        console.log('Attempting to use Python services...');
        const pythonResult = await queryPythonServices(userMessage, siteId, teamId);
        
        if (pythonResult.success) {
          console.log('Python services successful');
          
          // Try to get additional context from vector database
          const vectorResult = await queryVectorDatabase(userMessage, siteId, teamId);
          
          // Combine data from both sources
          const combinedData = {
            python_analysis: pythonResult.data,
            vector_context: vectorResult.success ? vectorResult.data : null
          };
          
          // Generate AI-enhanced response
          const aiResult = await generateAIResponse(userMessage, combinedData);
          
          if (aiResult.success) {
            finalResponse = {
              content: aiResult.content,
              visualizations: pythonResult.data.visualizations || [],
              tables: pythonResult.data.tables || [],
              metrics: pythonResult.data.metrics || [],
              insights: pythonResult.data.insights || [],
              source: 'python_ai_enhanced'
            };
          } else {
            // Use Python data with fallback formatting
            finalResponse = {
              content: `Based on your analytics data:\n\n${JSON.stringify(pythonResult.data, null, 2)}`,
              visualizations: pythonResult.data.visualizations || [],
              tables: pythonResult.data.tables || [],
              metrics: pythonResult.data.metrics || [],
              insights: pythonResult.data.insights || [],
              source: 'python_services'
            };
          }
        }
      }
      
      // If Python services failed or unavailable, try vector database
      if (!finalResponse && siteId) {
        console.log('Attempting vector database query...');
        const vectorResult = await queryVectorDatabase(userMessage, siteId, teamId);
        
        if (vectorResult.success) {
          console.log('Vector database successful');
          
          // Generate AI response with vector context
          const aiResult = await generateAIResponse(userMessage, vectorResult.data);
          
          if (aiResult.success) {
            finalResponse = {
              content: aiResult.content,
              visualizations: vectorResult.data.visualizations || [],
              tables: vectorResult.data.tables || [],
              metrics: vectorResult.data.metrics || [],
              insights: vectorResult.data.insights || [],
              source: 'vector_ai_enhanced'
            };
          }
        }
      }
      
      // If all else fails, use direct AI or fallback
      if (!finalResponse) {
        console.log('Using fallback approach...');
        
        try {
          // Try direct AI approach
          const aiResult = await generateAIResponse(userMessage, {});
          
          if (aiResult.success) {
            finalResponse = {
              content: aiResult.content,
              visualizations: [],
              tables: [],
              metrics: [],
              insights: [],
              source: 'ai_direct'
            };
          }
        } catch (directError) {
          console.error('Direct AI failed:', directError);
          
          // Ultimate fallback to enhanced mock response
          finalResponse = generateEnhancedResponse(userMessage);
          finalResponse.content = `${finalResponse.content}\n\n_Note: Using demo data while services are being configured._`;
          finalResponse.source = 'fallback_demo';
        }
      }
      
      // Add source indicator
      if (finalResponse.source) {
        const sourceLabels = {
          'python_ai_enhanced': '🚀 Powered by Python ML + AI',
          'python_services': '🔬 Powered by Python ML Services',
          'vector_ai_enhanced': '🧠 Powered by Vector Database + AI',
          'ai_direct': '🤖 Powered by AI',
          'fallback_demo': '📊 Demo Data'
        };
        
        finalResponse.content = `${finalResponse.content}\n\n---\n*${sourceLabels[finalResponse.source] || 'CQ Intelligence'}*`;
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: finalResponse.content,
        visualizations: finalResponse.visualizations || [],
        tables: finalResponse.tables || [],
        metrics: finalResponse.metrics || [],
        insights: finalResponse.insights || []
      }]);

    } catch (err) {
      console.error('CQ Intelligence Error:', err);
      setError('An error occurred while processing your request. Please try again later.');
      
      // Add a user-friendly error message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error while processing your request. This might be due to temporary service unavailability or connectivity issues. Please try again in a few minutes.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Gemini AI
  const initializeAI = () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API || 
                  window.ENV?.NEXT_PUBLIC_GEMINI_API || 
                  'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
    return new GoogleGenerativeAI(apiKey);
  };

  // Verify model availability
  const verifyModel = async () => {
    try {
      console.log('Fetching available models...');
      const response = await axios.get('/ai/models');
      const data = response.data;
      console.log("Available models:", data.models?.map(m => m.name));
      
      // Define preferred models in order of preference
      const preferredModels = [
        'gemini-2.5-pro',
        'gemini-2.0-pro',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro-002',
        'gemini-2.5-pro-preview'
      ];
      
      const models = data.models || [];
      
      // Try to find any of our preferred models
      for (const preferredModel of preferredModels) {
        const matchingModel = models.find(m => 
          m.name.includes(preferredModel) && 
          m.supportedGenerationMethods?.includes('generateContent')
        );
        if (matchingModel) {
          // Extract the full model name from the path
          const modelName = matchingModel.name.split('/').pop();
          console.log(`Using preferred model: ${modelName}`);
          return modelName;
        }
      }
      
      // If no preferred model found, find any suitable Gemini model
      const fallbackModel = models.find(m => 
        m.name.includes('gemini') && 
        !m.name.includes('vision') && 
        !m.name.includes('embedding') &&
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (fallbackModel) {
        const modelName = fallbackModel.name.split('/').pop();
        console.log(`Using fallback model: ${modelName}`);
        return modelName;
      }
      
      // Last resort fallback
      console.log('No suitable model found, using default: gemini-2.5-pro');
      return 'gemini-2.5-pro';
    } catch (error) {
      console.error('Error fetching models:', error);
      console.log('API call failed, using safe fallback model: gemini-2.5-pro');
      return 'gemini-2.5-pro';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Bot className="text-[#caa968]" size={24} />
            <div>
              <h1 className="text-2xl font-bold text-[#1d0c46]">CQ Intelligence</h1>
              <p className="text-gray-500 mt-1">
                Advanced analytics with ML-powered insights and real-time correlations
                {pythonServicesAvailable && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ML Services Active
                  </span>
                )}
              </p>
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
              <h2 className="text-xl font-semibold text-[#1d0c46] mb-2">
                Welcome to CQ Intelligence {pythonServicesAvailable ? 'Pro' : ''}
              </h2>
              <p className="text-gray-600 max-w-md mb-4">
                I provide comprehensive analytics with rich visualizations, ML-powered predictions, 
                and actionable insights from your data.
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Try asking:</p>
                <p>• "Predict user churn for the next 30 days"</p>
                <p>• "Analyze conversion funnel with ML insights"</p>
                <p>• "Show me Web3 transaction patterns"</p>
                <p>• "Detect anomalies in user behavior"</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[95%] w-full">
                  <div
                    className={`p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-[#1d0c46] text-white ml-auto max-w-[70%]'
                        : 'bg-gray-100 text-gray-800 w-full'
                    }`}
                  >
                    {message.content}
                  </div>
                  
                  {message.role === 'assistant' && (
                    <div className="mt-4 space-y-4">
                      {/* Metrics Cards */}
                      {message.metrics && message.metrics.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {message.metrics.map((metric, idx) => (
                            <MetricCard key={idx} {...metric} />
                          ))}
                        </div>
                      )}
                      
                      {/* Visualizations */}
                      {message.visualizations && message.visualizations.map((viz, idx) => (
                        <VisualizationComponent key={idx} visualization={viz} />
                      ))}
                      
                      {/* Data Tables */}
                      {message.tables && message.tables.map((table, idx) => (
                        <DataTable key={idx} {...table} />
                      ))}
                      
                      {/* Insights */}
                      {message.insights && message.insights.length > 0 && (
                        <InsightsComponent insights={message.insights} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  <span className="text-sm text-gray-600 ml-2">
                    {pythonServicesAvailable ? 'Running ML analysis...' : 'Processing query...'}
                  </span>
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
              placeholder={pythonServicesAvailable ? 
                "Ask about predictions, trends, anomalies, or any analytics..." : 
                "Ask about traffic, conversions, correlations, or any analytics..."
              }
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
  );
};

export default CQIntelligence; 