import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Clock, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function StakingInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [stakingData, setStakingData] = useState(null);
  const [stakingMetrics, setStakingMetrics] = useState(null);
  const [stakingEvents, setStakingEvents] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  
  // Get contract data from context
  const { selectedContract, contractTransactions, isLoadingTransactions } = useContractData();
  
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
    info: "#3b82f6"
  };

  // Process staking data from transactions
  useEffect(() => {
    if (contractTransactions && !isLoadingTransactions && selectedContract) {
      processStakingData();
    }
  }, [contractTransactions, isLoadingTransactions, selectedContract, timeRange]);

  const processStakingData = async () => {
    setIsLoading(true);
    
    try {
      // Only process if this is an escrow contract
      if (!selectedContract.contractType || selectedContract.contractType !== 'escrow') {
        setStakingData(null);
        setStakingMetrics(null);
        setStakingEvents([]);
        setIsLoading(false);
        return;
      }

      // Process transactions to extract staking events
      const stakingTransactions = contractTransactions.filter(tx => {
        // Look for staking method signatures and analysis
        if (tx.stakingAnalysis?.isStaking) {
          return true;
        }
        
        // Fallback to method name detection
        const stakingMethods = ['create_lock', 'increase_amount', 'withdraw', 'withdraw_early', 'increase_unlock_time', 'stake', 'unstake', 'claim', 'deposit', 'redeem'];
        return stakingMethods.some(method => 
          tx.method_name?.toLowerCase().includes(method) || 
          tx.tx_type?.toLowerCase().includes(method) ||
          tx.functionName?.toLowerCase().includes(method) ||
          tx.input?.toLowerCase().includes(method)
        );
      });

      // Calculate staking metrics
      const metrics = calculateStakingMetrics(stakingTransactions);
      setStakingMetrics(metrics);

      // Generate time series data
      const timeSeriesData = generateTimeSeriesData(stakingTransactions);
      setStakingData(timeSeriesData);

      // Extract staking events
      const events = extractStakingEvents(stakingTransactions);
      setStakingEvents(events);

    } catch (error) {
      console.error('Error processing staking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStakingMetrics = (transactions) => {
    if (!transactions.length) return null;

    let totalStaked = 0;
    let totalUnstaked = 0;
    let totalRewards = 0;
    let uniqueStakers = new Set();
    let activeStakers = new Set();
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    transactions.forEach(tx => {
      const value = parseFloat(tx.value_eth) || 0;
      const method = tx.method_name?.toLowerCase() || tx.tx_type?.toLowerCase() || '';
      const stakingType = tx.stakingAnalysis?.stakingType || tx.stakingType || '';
      
      uniqueStakers.add(tx.from_address);
      
      if (new Date(tx.block_time) > dayAgo) {
        activeStakers.add(tx.from_address);
      }
      
      // Handle new staking types
      if (stakingType === 'create_lock' || stakingType === 'increase_amount' || 
          method.includes('stake') || method.includes('deposit') || method.includes('create_lock') || method.includes('increase_amount')) {
        totalStaked += value;
      } else if (stakingType === 'withdraw' || stakingType === 'withdraw_early' || 
                 method.includes('unstake') || method.includes('withdraw')) {
        totalUnstaked += value;
      } else if (method.includes('claim') || method.includes('reward')) {
        totalRewards += value;
      }
    });

    const netStaked = totalStaked - totalUnstaked;
    const stakingDetails = selectedContract.stakingDetails || {};
    
    return {
      totalStaked,
      totalUnstaked,
      netStaked,
      totalRewards,
      uniqueStakers: uniqueStakers.size,
      activeStakers: activeStakers.size,
      stakingRate: uniqueStakers.size > 0 ? (activeStakers.size / uniqueStakers.size) * 100 : 0,
      averageStake: uniqueStakers.size > 0 ? netStaked / uniqueStakers.size : 0,
      rewardToken: stakingDetails.rewardToken || 'REWARD',
      stakingToken: stakingDetails.stakingToken || 'STAKE',
      apy: stakingDetails.apy || 0,
      lockPeriod: stakingDetails.lockPeriod || 0,
      minimumStake: stakingDetails.minimumStake || '0'
    };
  };

  const generateTimeSeriesData = (transactions) => {
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
      
      let stakeAmount = 0;
      let unstakeAmount = 0;
      let rewardAmount = 0;
      let uniqueUsers = new Set();
      
      dayTransactions.forEach(tx => {
        const value = parseFloat(tx.value_eth) || 0;
        const method = tx.method_name?.toLowerCase() || tx.tx_type?.toLowerCase() || '';
        const stakingType = tx.stakingAnalysis?.stakingType || tx.stakingType || '';
        
        uniqueUsers.add(tx.from_address);
        
        // Handle new staking types
        if (stakingType === 'create_lock' || stakingType === 'increase_amount' || 
            method.includes('stake') || method.includes('deposit') || method.includes('create_lock') || method.includes('increase_amount')) {
          stakeAmount += value;
        } else if (stakingType === 'withdraw' || stakingType === 'withdraw_early' || 
                   method.includes('unstake') || method.includes('withdraw')) {
          unstakeAmount += value;
        } else if (method.includes('claim') || method.includes('reward')) {
          rewardAmount += value;
        }
      });
      
      data.push({
        date: dayStart.toISOString().split('T')[0],
        stakeAmount,
        unstakeAmount,
        rewardAmount,
        netStake: stakeAmount - unstakeAmount,
        activeUsers: uniqueUsers.size,
        transactions: dayTransactions.length
      });
    }
    
    return data;
  };

  const extractStakingEvents = (transactions) => {
    return transactions
      .sort((a, b) => new Date(b.block_time) - new Date(a.block_time))
      .slice(0, 50)
      .map(tx => {
        const method = tx.method_name?.toLowerCase() || tx.tx_type?.toLowerCase() || '';
        const stakingType = tx.stakingAnalysis?.stakingType || tx.stakingType || '';
        let eventType = 'unknown';
        let eventIcon = AlertCircle;
        let eventColor = 'text-gray-500';
        let eventDescription = '';
        
        // Handle new staking types
        if (stakingType === 'create_lock' || method.includes('create_lock')) {
          eventType = 'create_lock';
          eventIcon = TrendingUp;
          eventColor = 'text-green-500';
          eventDescription = 'Created Lock';
        } else if (stakingType === 'increase_amount' || method.includes('increase_amount')) {
          eventType = 'increase_amount';
          eventIcon = TrendingUp;
          eventColor = 'text-green-600';
          eventDescription = 'Increased Amount';
        } else if (stakingType === 'withdraw_early' || method.includes('withdraw_early')) {
          eventType = 'withdraw_early';
          eventIcon = ArrowDown;
          eventColor = 'text-orange-500';
          eventDescription = 'Early Withdrawal';
        } else if (stakingType === 'increase_unlock_time' || method.includes('increase_unlock_time')) {
          eventType = 'increase_unlock_time';
          eventIcon = Clock;
          eventColor = 'text-purple-500';
          eventDescription = 'Extended Lock';
        } else if (stakingType === 'withdraw' || method.includes('withdraw')) {
          eventType = 'withdraw';
          eventIcon = ArrowDown;
          eventColor = 'text-red-500';
          eventDescription = 'Withdrawal';
        } else if (method.includes('stake') || method.includes('deposit')) {
          eventType = 'stake';
          eventIcon = TrendingUp;
          eventColor = 'text-green-500';
          eventDescription = 'Staked';
        } else if (method.includes('unstake')) {
          eventType = 'unstake';
          eventIcon = ArrowDown;
          eventColor = 'text-red-500';
          eventDescription = 'Unstaked';
        } else if (method.includes('claim') || method.includes('reward')) {
          eventType = 'reward';
          eventIcon = DollarSign;
          eventColor = 'text-blue-500';
          eventDescription = 'Claimed Reward';
        }
        
        // Extract unlock time information if available
        const unlockTimeInfo = tx.stakingAnalysis?.details?.unlockTime ? {
          unlockTime: tx.stakingAnalysis.details.unlockTime,
          lockDuration: tx.stakingAnalysis.details.lockDurationDays,
          unlockTimestamp: tx.stakingAnalysis.details.unlockTimestamp
        } : null;

        return {
          ...tx,
          eventType,
          eventIcon,
          eventColor,
          eventDescription,
          unlockTimeInfo,
          formattedTime: new Date(tx.block_time).toLocaleString(),
          shortAddress: `${tx.from_address.slice(0, 6)}...${tx.from_address.slice(-4)}`
        };
      });
  };

  const formatValue = (value, symbol = '') => {
    if (value === 0) return '0';
    if (value < 0.001) return '<0.001';
    if (value < 1) return value.toFixed(4);
    if (value < 1000) return value.toFixed(2);
    if (value < 1000000) return (value / 1000).toFixed(1) + 'K';
    return (value / 1000000).toFixed(1) + 'M';
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

  // Show message if not a staking contract
  if (!selectedContract || selectedContract.contractType === 'main') {
    return (
      <div className="bg-gray-50 p-4 text-gray-900">
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-1 text-gray-700">Staking Contract Required</h3>
          <p className="text-gray-500 text-sm">
            Please select a staking or escrow contract to view staking insights.
          </p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-semibold text-gray-900 font-montserrat" style={{ color: styles.primaryColor }}>
          Staking Insights {selectedContract ? `for ${selectedContract.name}` : ''}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          Monitor staking activity, rewards, and user engagement for your {selectedContract.contractType} contract
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
                  : 'text-gray-600 bg-white hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: timeRange === range ? styles.primaryColor : undefined
              }}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      {stakingMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staked</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {formatValue(stakingMetrics.netStaked)} {stakingMetrics.stakingToken}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rewards</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {formatValue(stakingMetrics.totalRewards)} {stakingMetrics.rewardToken}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Stakers</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {stakingMetrics.uniqueStakers.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Stakers (24h)</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {stakingMetrics.activeStakers}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Details */}
      {selectedContract.stakingDetails && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
            Contract Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">APY</p>
              <p className="text-lg font-semibold">{selectedContract.stakingDetails.apy || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lock Period</p>
              <p className="text-lg font-semibold">{selectedContract.stakingDetails.lockPeriod || 0} days</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Minimum Stake</p>
              <p className="text-lg font-semibold">{selectedContract.stakingDetails.minimumStake || '0'} {stakingMetrics?.stakingToken}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stakingData && stakingData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Staking Activity Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
              Staking Activity
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stakingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => formatDate(label)}
                  formatter={(value, name) => [formatValue(value), name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="stakeAmount" 
                  stroke={chartColors.success} 
                  strokeWidth={2}
                  name="Stakes"
                />
                <Line 
                  type="monotone" 
                  dataKey="unstakeAmount" 
                  stroke={chartColors.error} 
                  strokeWidth={2}
                  name="Unstakes"
                />
                <Line 
                  type="monotone" 
                  dataKey="rewardAmount" 
                  stroke={chartColors.info} 
                  strokeWidth={2}
                  name="Rewards"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Active Users Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
              Active Users
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stakingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => formatDate(label)}
                  formatter={(value, name) => [value, name]}
                />
                <Bar dataKey="activeUsers" fill={styles.primaryColor} name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Staking Events */}
      {stakingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold" style={{ color: styles.primaryColor }}>
              Recent Staking Events
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {stakingEvents.map((event, index) => {
                const IconComponent = event.eventIcon;
                return (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-full ${event.eventColor}`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {event.shortAddress} {event.eventDescription || event.eventType} {formatValue(parseFloat(event.value_eth))} {stakingMetrics?.stakingToken}
                        </p>
                        <p className="text-xs text-gray-500">{event.formattedTime}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Tx: {event.tx_hash.slice(0, 10)}...{event.tx_hash.slice(-6)}
                        </p>
                        {event.unlockTimeInfo && (
                          <p className="text-xs text-blue-600">
                            Unlock: {event.unlockTimeInfo.lockDuration}d ({new Date(event.unlockTimeInfo.unlockTime).toLocaleDateString()})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {(!stakingData || stakingData.length === 0) && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-1 text-gray-700">No Staking Data Available</h3>
          <p className="text-gray-500 text-sm">
            There are no staking transactions for this contract yet, or the data is still loading.
          </p>
        </div>
      )}
    </div>
  );
} 