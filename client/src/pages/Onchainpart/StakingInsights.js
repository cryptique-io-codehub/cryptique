import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Clock, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function StakingInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [stakingData, setStakingData] = useState(null);
  const [stakingMetrics, setStakingMetrics] = useState(null);
  const [stakingEvents, setStakingEvents] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [contextError, setContextError] = useState(null);
  
  // Move useContractData to the top level - no conditionals
  const contextData = useContractData();
  
  // Extract data from context with error handling after the hook call
  let selectedContract, selectedContracts, contractTransactions, combinedTransactions, isLoadingTransactions, rawStakingContractData;
  
  try {
    ({ selectedContract, selectedContracts, contractTransactions, combinedTransactions, isLoadingTransactions, stakingContractData: rawStakingContractData } = contextData || {});
  } catch (error) {
    console.error('Error accessing ContractDataContext:', error);
    setContextError(error);
  }

  // Provide default values for stakingContractData to prevent undefined errors
  const stakingContractData = rawStakingContractData || { 
    showDemoData: true, 
    transactions: [], 
    contracts: [] 
  };
  
  // Dashboard styles matching the rest of the application
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968",  // Gold accent
    backgroundColor: "#f9fafb",
    cardBg: "white",
    textPrimary: "#111827",
    textSecondary: "#4b5563"
  };

  // Colors for charts
  const chartColors = {
    primary: "#1d0c46",
    secondary: "#caa968",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    lock: "#8b5cf6",
    unlock: "#06b6d4"
  };

  // Process staking data from transactions - move useEffect to top level
  useEffect(() => {
    // Only process if we have staking contracts
    if (stakingContractData && !stakingContractData.showDemoData && !isLoadingTransactions) {
      processRealStakingData(stakingContractData.transactions, stakingContractData.contracts);
    } else if (stakingContractData && stakingContractData.showDemoData) {
      // Show demo data when no staking contracts are selected
      setStakingData(null);
      setStakingMetrics(null);
      setStakingEvents([]);
      setIsLoading(false);
    }
  }, [stakingContractData, isLoadingTransactions, timeRange]);

  // If there was a context error, show error UI
  if (contextError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">
            Error loading contract data. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  // Function to analyze real Zeebu staking contract data
  const processRealStakingData = async (transactions, contracts) => {
    setIsLoading(true);
    
    try {
      console.log('Processing real staking data:', {
        transactionCount: transactions.length,
        contractCount: contracts.length
      });

      if (contracts.length === 0 || transactions.length === 0) {
        setStakingData(null);
        setStakingMetrics(null);
        setStakingEvents([]);
        setIsLoading(false);
        return;
      }

      // Analyze Zeebu staking transaction patterns
      const stakingAnalysis = analyzeZeebuTransactions(transactions);
      
      // Generate time series data based on real methods
      const timeSeriesData = generateRealTimeSeriesData(transactions, timeRange);
      
      // Extract recent staking events
      const recentEvents = extractRealStakingEvents(transactions);
      
      setStakingMetrics(stakingAnalysis);
      setStakingData(timeSeriesData);
      setStakingEvents(recentEvents);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error processing real staking data:', error);
      setIsLoading(false);
    }
  };

  // Analyze Zeebu staking transactions based on actual method names
  const analyzeZeebuTransactions = (transactions) => {
    const analysis = {
      totalStakers: new Set(),
      lockCreations: 0,
      amountIncreases: 0,
      timeExtensions: 0,
      withdrawals: 0,
      earlyWithdrawals: 0,
      totalVolume: 0,
      averageLockDuration: 0,
      stakingToken: 'ZBU',
      rewardToken: 'ZBU'
    };

    transactions.forEach(tx => {
      const method = tx.functionName || tx.method_name || '';
      const from = tx.from_address;
      
      if (from) {
        analysis.totalStakers.add(from);
      }

      // Categorize by actual Zeebu methods
      if (method.includes('create_lock')) {
        analysis.lockCreations++;
      } else if (method.includes('increase_amount')) {
        analysis.amountIncreases++;
      } else if (method.includes('increase_unlock_time')) {
        analysis.timeExtensions++;
      } else if (method.includes('withdraw_early')) {
        analysis.earlyWithdrawals++;
      } else if (method.includes('withdraw')) {
        analysis.withdrawals++;
      }

      // Try to extract value (handle "0 ZBU" format)
      if (tx.value_eth && typeof tx.value_eth === 'string') {
        const numericValue = parseFloat(tx.value_eth.replace(/[^\d.]/g, ''));
        if (!isNaN(numericValue)) {
          analysis.totalVolume += numericValue;
        }
      }
    });

    // Calculate derived metrics
    const uniqueStakers = analysis.totalStakers.size;
    const totalOperations = analysis.lockCreations + analysis.amountIncreases + 
                           analysis.timeExtensions + analysis.withdrawals + analysis.earlyWithdrawals;

    return {
      totalStakers: uniqueStakers,
      totalLocks: analysis.lockCreations,
      totalIncreases: analysis.amountIncreases,
      totalExtensions: analysis.timeExtensions,
      totalWithdrawals: analysis.withdrawals + analysis.earlyWithdrawals,
      totalOperations,
      averageOpsPerStaker: uniqueStakers > 0 ? (totalOperations / uniqueStakers).toFixed(1) : 0,
      stakingToken: 'ZBU',
      rewardToken: 'ZBU',
      contractName: 'Zeebu',
      
      // Operation distribution
      operationDistribution: {
        locks: analysis.lockCreations,
        increases: analysis.amountIncreases,
        extensions: analysis.timeExtensions,
        withdrawals: analysis.withdrawals + analysis.earlyWithdrawals
      }
    };
  };

  // Generate time series data based on real transaction timestamps
  const generateRealTimeSeriesData = (transactions, timeRange) => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.block_time);
        return txDate >= dayStart && txDate < dayEnd;
      });
      
      let locks = 0;
      let increases = 0;
      let extensions = 0;
      let withdrawals = 0;
      const activeUsers = new Set();
      
      dayTransactions.forEach(tx => {
        const method = tx.functionName || tx.method_name || '';
        
        if (tx.from_address) {
          activeUsers.add(tx.from_address);
        }

        if (method.includes('create_lock')) {
          locks++;
        } else if (method.includes('increase_amount')) {
          increases++;
        } else if (method.includes('increase_unlock_time')) {
          extensions++;
        } else if (method.includes('withdraw')) {
          withdrawals++;
        }
      });
      
      data.push({
        date: date.toISOString().split('T')[0],
        locks,
        increases,
        extensions,
        withdrawals,
        activeUsers: activeUsers.size,
        totalOps: locks + increases + extensions + withdrawals
      });
    }
    
    return data;
  };

  // Extract real staking events from transactions
  const extractRealStakingEvents = (transactions) => {
    return transactions
      .slice(0, 20) // Get recent 20 transactions
      .map(tx => {
        const method = tx.functionName || tx.method_name || '';
        let eventType = 'Unknown';
        let eventIcon = '📄';
        let eventDescription = 'performed an operation';
        
        if (method.includes('create_lock')) {
          eventType = 'Lock Created';
          eventIcon = '🔒';
          eventDescription = 'created a new lock';
        } else if (method.includes('increase_amount')) {
          eventType = 'Amount Increased';
          eventIcon = '📈';
          eventDescription = 'increased lock amount';
        } else if (method.includes('increase_unlock_time')) {
          eventType = 'Time Extended';
          eventIcon = '⏰';
          eventDescription = 'extended unlock time';
        } else if (method.includes('withdraw_early')) {
          eventType = 'Early Withdrawal';
          eventIcon = '⚡';
          eventDescription = 'withdrew early';
        } else if (method.includes('withdraw')) {
          eventType = 'Withdrawal';
          eventIcon = '🔓';
          eventDescription = 'withdrew tokens';
        }

        return {
          tx_hash: tx.tx_hash,
          from_address: tx.from_address,
          value_eth: tx.value_eth || '0 ZBU',
          eventType,
          eventIcon,
          eventDescription,
          method: method,
          formattedTime: new Date(tx.block_time).toLocaleString(),
          shortAddress: tx.from_address ? `${tx.from_address.slice(0, 6)}...${tx.from_address.slice(-4)}` : 'Unknown',
          blockNumber: tx.block_number
        };
      });
  };

  const formatValue = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Show loading state
  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: styles.primaryColor }} />
          <p className="text-lg font-medium font-montserrat" style={{ color: styles.primaryColor }}>
            Loading staking insights...
          </p>
        </div>
      </div>
    );
  }

  // Show demo data if no staking contract is selected or if stakingContractData says to show demo
  const shouldShowDemoData = stakingContractData.showDemoData || (!stakingData && !isLoading);
  
  console.log('StakingInsights shouldShowDemoData logic:', {
    stakingContractDataShowDemo: stakingContractData.showDemoData,
    hasStakingData: !!stakingData,
    isLoading: isLoading,
    selectedContract: selectedContract?.id,
    selectedContractType: selectedContract?.contractType,
    shouldShowDemoData
  });
  
  // Demo data for when no staking contract is selected
  const demoStakingMetrics = {
    totalStakers: 2847,
    totalLocks: 1423,
    totalIncreases: 892,
    totalExtensions: 645,
    totalWithdrawals: 234,
    totalOperations: 3194,
    averageOpsPerStaker: 1.1,
    stakingToken: 'DEMO',
    rewardToken: 'DEMO',
    contractName: 'Demo Contract',
    operationDistribution: {
      locks: 1423,
      increases: 892,
      extensions: 645,
      withdrawals: 234
    }
  };

  const demoTimeSeriesData = [
    { date: '2024-01-15', locks: 45, increases: 32, extensions: 28, withdrawals: 12, activeUsers: 124, totalOps: 117 },
    { date: '2024-01-16', locks: 52, increases: 38, extensions: 31, withdrawals: 15, activeUsers: 138, totalOps: 136 },
    { date: '2024-01-17', locks: 48, increases: 35, extensions: 29, withdrawals: 10, activeUsers: 115, totalOps: 122 },
    { date: '2024-01-18', locks: 61, increases: 42, extensions: 38, withdrawals: 18, activeUsers: 142, totalOps: 159 },
    { date: '2024-01-19', locks: 58, increases: 40, extensions: 35, withdrawals: 16, activeUsers: 135, totalOps: 149 },
    { date: '2024-01-20', locks: 55, increases: 38, extensions: 32, withdrawals: 14, activeUsers: 128, totalOps: 139 },
    { date: '2024-01-21', locks: 63, increases: 45, extensions: 39, withdrawals: 20, activeUsers: 148, totalOps: 167 }
  ];

  const demoStakingEvents = [
    {
      tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
      from_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      value_eth: '1000 DEMO',
      eventType: 'Lock Created',
      eventIcon: '🔒',
      eventDescription: 'created a new lock',
      method: 'create_lock(uint256 _value, uint256 _unlock_time)',
      formattedTime: '2024-01-21 14:30:25',
      shortAddress: '0xabcd...ef12',
      blockNumber: 19234567
    },
    {
      tx_hash: '0x2345678901bcdef02345678901bcdef023456789',
      from_address: '0xbcdef02345678901bcdef02345678901bcdef023',
      value_eth: '500 DEMO',
      eventType: 'Amount Increased',
      eventIcon: '📈',
      eventDescription: 'increased lock amount',
      method: 'increase_amount(uint256 _value)',
      formattedTime: '2024-01-21 13:15:10',
      shortAddress: '0xbcde...f023',
      blockNumber: 19234566
    },
    {
      tx_hash: '0x3456789012cdef123456789012cdef1234567890',
      from_address: '0xcdef123456789012cdef123456789012cdef1234',
      value_eth: '0 DEMO',
      eventType: 'Time Extended',
      eventIcon: '⏰',
      eventDescription: 'extended unlock time',
      method: 'increase_unlock_time(uint256 _unlock_time)',
      formattedTime: '2024-01-21 12:45:33',
      shortAddress: '0xcdef...1234',
      blockNumber: 19234565
    }
  ];

  // Use demo data if no staking contract is selected - ensure arrays for chart components
  const displayMetrics = shouldShowDemoData ? demoStakingMetrics : (stakingMetrics || demoStakingMetrics);
  const displayTimeSeriesData = shouldShowDemoData ? demoTimeSeriesData : (stakingData || demoTimeSeriesData || []);
  const displayStakingEvents = shouldShowDemoData ? demoStakingEvents : (stakingEvents || demoStakingEvents || []);

  // Wrap the entire render in a try-catch for error handling
  try {
    return (
      <div className="bg-gray-50 p-4 text-gray-900">
        {/* Import fonts */}
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
            
            h1, h2, h3, h4, h5, h6 {
              font-family: 'Montserrat', sans-serif;
            }
            
            body, p, span, div {
              font-family: 'Poppins', sans-serif;
            }
          `}
        </style>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-montserrat" style={{ color: styles.primaryColor }}>
            Staking Insights {!shouldShowDemoData && displayMetrics?.contractName ? `- ${displayMetrics.contractName}` : ''}
          </h1>
          <p className="text-gray-600 font-poppins">
            {shouldShowDemoData 
              ? "Demo staking analytics - Select a staking contract to view real data" 
              : `Real-time analytics for ${displayMetrics?.contractName || 'staking contract'}`
            }
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: timeRange === range ? styles.primaryColor : undefined
                }}
              >
                {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" style={{ color: styles.primaryColor }} />
              <div>
                <p className="text-sm text-gray-600">Total Stakers</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {formatValue(displayMetrics?.totalStakers || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Lock className="h-8 w-8 mr-3" style={{ color: chartColors.success }} />
              <div>
                <p className="text-sm text-gray-600">Total Locks</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.success }}>
                  {formatValue(displayMetrics?.totalLocks || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 mr-3" style={{ color: chartColors.info }} />
              <div>
                <p className="text-sm text-gray-600">Operations</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.info }}>
                  {formatValue(displayMetrics?.totalOperations || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Unlock className="h-8 w-8 mr-3" style={{ color: chartColors.warning }} />
              <div>
                <p className="text-sm text-gray-600">Withdrawals</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.warning }}>
                  {formatValue(displayMetrics?.totalWithdrawals || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operation Distribution */}
        {displayMetrics?.operationDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
                Operation Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lock Creations</span>
                  <span className="font-semibold">{displayMetrics.operationDistribution.locks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount Increases</span>
                  <span className="font-semibold">{displayMetrics.operationDistribution.increases}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Time Extensions</span>
                  <span className="font-semibold">{displayMetrics.operationDistribution.extensions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Withdrawals</span>
                  <span className="font-semibold">{displayMetrics.operationDistribution.withdrawals}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
                Staking Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Ops per Staker</span>
                  <span className="font-semibold">{displayMetrics?.averageOpsPerStaker || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Staking Token</span>
                  <span className="font-semibold">{displayMetrics?.stakingToken || 'TOKEN'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reward Token</span>
                  <span className="font-semibold">{displayMetrics?.rewardToken || 'TOKEN'}</span>
                </div>
                {!shouldShowDemoData && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Contract</span>
                    <span className="font-semibold">{displayMetrics?.contractName || 'Staking Contract'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {displayTimeSeriesData && Array.isArray(displayTimeSeriesData) && displayTimeSeriesData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Staking Operations Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
                Staking Operations Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayTimeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value, name) => [value, name]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="locks" 
                    stroke={chartColors.success} 
                    strokeWidth={2}
                    name="New Locks"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="increases" 
                    stroke={chartColors.info} 
                    strokeWidth={2}
                    name="Amount Increases"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="extensions" 
                    stroke={chartColors.warning} 
                    strokeWidth={2}
                    name="Time Extensions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="withdrawals" 
                    stroke={chartColors.error} 
                    strokeWidth={2}
                    name="Withdrawals"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Active Users Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
                Daily Active Stakers
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayTimeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value, name) => [value, name]}
                  />
                  <Bar dataKey="activeUsers" fill={styles.primaryColor} name="Active Stakers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Staking Events */}
        {displayStakingEvents && Array.isArray(displayStakingEvents) && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold" style={{ color: styles.primaryColor }}>
                Recent Staking Operations
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {displayStakingEvents && Array.isArray(displayStakingEvents) && displayStakingEvents.map((event, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl">
                      {event.eventIcon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {event.shortAddress} {event.eventDescription}
                        </p>
                        <p className="text-xs text-gray-500">{event.formattedTime}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Method: {event.method}
                        </p>
                        <p className="text-xs text-gray-500">
                          Block: {event.blockNumber}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Tx: {event.tx_hash.slice(0, 10)}...{event.tx_hash.slice(-6)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  } catch (renderError) {
    console.error('Error rendering StakingInsights:', renderError);
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">
            Error rendering staking insights. Please try again.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Check the console for more details.
          </p>
        </div>
      </div>
    );
  }
} 