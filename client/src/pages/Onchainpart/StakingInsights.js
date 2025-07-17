import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Clock, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { identifyStakingTransaction } from '../../utils/chainUtils';

export default function StakingInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [stakingData, setStakingData] = useState(null);
  const [stakingMetrics, setStakingMetrics] = useState(null);
  const [stakingEvents, setStakingEvents] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  
  // Get contract data from context
  const { selectedContract, selectedContracts, contractTransactions, combinedTransactions, isLoadingTransactions, stakingContractData } = useContractData();
  
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
    // Use segregated staking data - only process if we have staking contracts
    if (stakingContractData && !stakingContractData.showDemoData && !isLoadingTransactions) {
      processStakingData(stakingContractData.transactions, stakingContractData.contracts);
    } else if (stakingContractData && stakingContractData.showDemoData) {
      // Show demo data when no staking contracts are selected
      setStakingData(null);
      setStakingMetrics(null);
      setStakingEvents([]);
      setIsLoading(false);
    }
  }, [stakingContractData, isLoadingTransactions, timeRange]);

  const processStakingData = async (transactions, contracts) => {
    setIsLoading(true);
    
    try {
      // Since we're now receiving segregated data, all contracts should be staking contracts
      const stakingContracts = contracts;
      
      if (stakingContracts.length === 0) {
        console.log('StakingInsights: No staking contracts selected');
        setStakingData(null);
        setStakingMetrics(null);
        setStakingEvents([]);
        setIsLoading(false);
        return;
      }

      console.log('StakingInsights: Processing staking data', {
        stakingContracts: stakingContracts.length,
        totalTransactions: transactions.length,
        sampleTransactions: transactions.slice(0, 3).map(tx => ({
          tx_hash: tx.tx_hash,
          method_name: tx.method_name,
          tx_type: tx.tx_type,
          functionName: tx.functionName,
          input: tx.input?.substring(0, 100),
          stakingAnalysis: tx.stakingAnalysis,
          stakingType: tx.stakingType,
          stakingConfidence: tx.stakingConfidence,
          sourceContract: tx.sourceContract?.id,
          contractType: tx.contractType
        }))
      });

      // All transactions should already be from staking contracts due to segregation
      const stakingTransactionsFromContracts = transactions;

      console.log('StakingInsights: Filtered transactions from staking contracts', {
        totalFiltered: stakingTransactionsFromContracts.length,
        stakingContractIds: stakingContractIds
      });

      // Process transactions and add staking analysis if missing
      const processedTransactions = stakingTransactionsFromContracts.map(tx => {
        // If transaction already has staking analysis, use it
        if (tx.stakingAnalysis) {
          return tx;
        }
        
        // If transaction doesn't have staking analysis, perform it now
        const stakingAnalysis = identifyStakingTransaction(tx, 'escrow');
        
        return {
          ...tx,
          stakingAnalysis,
          stakingType: stakingAnalysis.stakingType,
          stakingConfidence: stakingAnalysis.confidence
        };
      });

      // Process transactions to extract staking events
      const stakingTransactions = processedTransactions.filter(tx => {
        // Look for staking method signatures and analysis
        if (tx.stakingAnalysis?.isStaking) {
          return true;
        }
        
        // Fallback to method name detection
        const stakingMethods = ['create_lock', 'increase_amount', 'withdraw', 'withdraw_early', 'increase_unlock_time', 'stake', 'unstake', 'claim', 'deposit', 'redeem'];
        const hasStakingMethod = stakingMethods.some(method => 
          tx.method_name?.toLowerCase().includes(method) || 
          tx.tx_type?.toLowerCase().includes(method) ||
          tx.functionName?.toLowerCase().includes(method) ||
          tx.input?.toLowerCase().includes(method)
        );
        
        return hasStakingMethod;
      });

      console.log('StakingInsights: Filtered staking transactions', {
        totalStakingTransactions: stakingTransactions.length,
        sampleStakingTransactions: stakingTransactions.slice(0, 3).map(tx => ({
          tx_hash: tx.tx_hash,
          method_name: tx.method_name,
          stakingAnalysis: tx.stakingAnalysis,
          stakingType: tx.stakingType,
          sourceContract: tx.sourceContract?.id
        }))
      });

      // Calculate staking metrics (combined from all staking contracts)
      const metrics = calculateStakingMetrics(stakingTransactions, stakingContracts);
      setStakingMetrics(metrics);

      // Generate time series data (combined from all staking contracts)
      const timeSeriesData = generateTimeSeriesData(stakingTransactions);
      setStakingData(timeSeriesData);

      // Extract staking events (combined from all staking contracts)
      const events = extractStakingEvents(stakingTransactions);
      setStakingEvents(events);

      console.log('StakingInsights: Final processed data', {
        metrics,
        timeSeriesDataLength: timeSeriesData?.length,
        eventsLength: events?.length,
        contractsProcessed: stakingContracts.length
      });

    } catch (error) {
      console.error('Error processing staking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStakingMetrics = (transactions, contracts) => {
    console.log('calculateStakingMetrics: Starting calculation', {
      transactionCount: transactions.length,
      sampleTransactions: transactions.slice(0, 3).map(tx => ({
        tx_hash: tx.tx_hash,
        method_name: tx.method_name,
        stakingType: tx.stakingAnalysis?.stakingType || tx.stakingType,
        value_eth: tx.value_eth,
        block_time: tx.block_time,
        sourceContract: tx.sourceContract?.id
      }))
    });

    if (!transactions.length) {
      console.log('calculateStakingMetrics: No transactions, returning null');
      return null;
    }

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
    
    // Aggregate metrics from all staking contracts
    const aggregatedMetrics = {
      totalStaked: totalStaked,
      totalUnstaked: totalUnstaked,
      netStaked: netStaked,
      totalRewards: totalRewards,
      uniqueStakers: uniqueStakers.size,
      activeStakers: activeStakers.size,
      stakingRate: uniqueStakers.size > 0 ? (activeStakers.size / uniqueStakers.size) * 100 : 0,
      averageStake: uniqueStakers.size > 0 ? netStaked / uniqueStakers.size : 0,
      rewardToken: 'REWARD', // Assuming a single reward token for now
      stakingToken: 'STAKE', // Assuming a single staking token for now
      apy: 0, // Placeholder, will need to aggregate APYs if multiple contracts
      lockPeriod: 0, // Placeholder, will need to aggregate lock periods if multiple contracts
      minimumStake: '0' // Placeholder, will need to aggregate minimum stakes if multiple contracts
    };

    // If multiple contracts, try to find a common token for display
    if (contracts.length > 1) {
      const rewardTokens = contracts.map(c => c.stakingDetails?.rewardToken).filter(Boolean);
      const stakingTokens = contracts.map(c => c.stakingDetails?.stakingToken).filter(Boolean);

      if (rewardTokens.length > 0) {
        aggregatedMetrics.rewardToken = rewardTokens[0];
      }
      if (stakingTokens.length > 0) {
        aggregatedMetrics.stakingToken = stakingTokens[0];
      }
    }

    console.log('calculateStakingMetrics: Final metrics', aggregatedMetrics);
    return aggregatedMetrics;
  };

  const generateTimeSeriesData = (transactions) => {
    console.log('generateTimeSeriesData: Starting generation', {
      transactionCount: transactions.length,
      timeRange: timeRange
    });

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
      const activeUsers = new Set();
      
      dayTransactions.forEach(tx => {
        const value = parseFloat(tx.value_eth) || 0;
        const method = tx.method_name?.toLowerCase() || tx.tx_type?.toLowerCase() || '';
        const stakingType = tx.stakingAnalysis?.stakingType || tx.stakingType || '';
        
        activeUsers.add(tx.from_address);
        
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
        activeUsers: activeUsers.size,
        transactionCount: dayTransactions.length
      });
    }
    
    console.log('generateTimeSeriesData: Generated data', {
      dataLength: data.length,
      sampleData: data.slice(0, 3),
      totalDataPoints: data.length
    });
    
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

  // Show demo data if no staking contract is selected
  const shouldShowDemoData = !selectedContract || selectedContract.contractType === 'main' || (!stakingData && !isLoading);
  
  // Demo data for staking insights
  const demoStakingMetrics = {
    totalStaked: 1250000,
    totalUnstaked: 150000,
    netStaked: 1100000,
    totalRewards: 45000,
    uniqueStakers: 2847,
    activeStakers: 456,
    stakingRate: 16.02,
    averageStake: 386.5,
    rewardToken: 'REWARD',
    stakingToken: 'STAKE',
    apy: 12.5,
    lockPeriod: 30,
    minimumStake: '100'
  };

  const demoTimeSeriesData = [
    { date: '2024-01-15', stakes: 45000, unstakes: 5000, rewards: 1200, activeUsers: 124 },
    { date: '2024-01-16', stakes: 52000, unstakes: 6200, rewards: 1350, activeUsers: 138 },
    { date: '2024-01-17', stakes: 48000, unstakes: 4800, rewards: 1180, activeUsers: 115 },
    { date: '2024-01-18', stakes: 61000, unstakes: 7100, rewards: 1420, activeUsers: 142 },
    { date: '2024-01-19', stakes: 58000, unstakes: 6800, rewards: 1380, activeUsers: 135 },
    { date: '2024-01-20', stakes: 55000, unstakes: 6200, rewards: 1320, activeUsers: 128 },
    { date: '2024-01-21', stakes: 63000, unstakes: 7500, rewards: 1450, activeUsers: 148 }
  ];

  const demoStakingEvents = [
    {
      tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
      from_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      value_eth: '1000',
      eventType: 'Stake',
      eventIcon: '📈',
      eventColor: 'text-green-600',
      eventDescription: 'Staked 1,000 STAKE tokens',
      formattedTime: '2024-01-21 14:30:25',
      shortAddress: '0xabcd...ef12',
      unlockTimeInfo: { unlockTime: '2024-02-20', lockDuration: 30 }
    },
    {
      tx_hash: '0x2345678901bcdef02345678901bcdef023456789',
      from_address: '0xbcdef02345678901bcdef02345678901bcdef023',
      value_eth: '500',
      eventType: 'Unstake',
      eventIcon: '📉',
      eventColor: 'text-red-600',
      eventDescription: 'Unstaked 500 STAKE tokens',
      formattedTime: '2024-01-21 13:15:10',
      shortAddress: '0xbcde...f023',
      unlockTimeInfo: null
    },
    {
      tx_hash: '0x3456789012cdef123456789012cdef1234567890',
      from_address: '0xcdef123456789012cdef123456789012cdef1234',
      value_eth: '25',
      eventType: 'Reward',
      eventIcon: '🎁',
      eventColor: 'text-blue-600',
      eventDescription: 'Claimed 25 REWARD tokens',
      formattedTime: '2024-01-21 12:45:33',
      shortAddress: '0xcdef...1234',
      unlockTimeInfo: null
    }
  ];

  // Use demo data if no staking contract is selected
  const displayMetrics = shouldShowDemoData ? demoStakingMetrics : stakingMetrics;
  const displayTimeSeriesData = shouldShowDemoData ? demoTimeSeriesData : stakingData;
  const displayStakingEvents = shouldShowDemoData ? demoStakingEvents : stakingEvents;

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
          Staking Insights {selectedContract && selectedContract.contractType === 'escrow' ? `for ${selectedContract.name}` : '(Demo Data)'}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          {shouldShowDemoData 
            ? 'Monitor staking activity, rewards, and user engagement - showing demo data'
            : `Monitor staking activity, rewards, and user engagement for your ${selectedContract.contractType} contract`
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
      {displayMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staked</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {formatValue(displayMetrics.netStaked)} {displayMetrics.stakingToken}
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
                  {formatValue(displayMetrics.totalRewards)} {displayMetrics.rewardToken}
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
                  {displayMetrics.uniqueStakers.toLocaleString()}
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
                  {displayMetrics.activeStakers}
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
      {(selectedContract?.stakingDetails || shouldShowDemoData) && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
            Contract Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">APY</p>
              <p className="text-lg font-semibold">
                {shouldShowDemoData ? displayMetrics.apy : (selectedContract.stakingDetails?.apy || 0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lock Period</p>
              <p className="text-lg font-semibold">
                {shouldShowDemoData ? displayMetrics.lockPeriod : (selectedContract.stakingDetails?.lockPeriod || 0)} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Minimum Stake</p>
              <p className="text-lg font-semibold">
                {shouldShowDemoData ? displayMetrics.minimumStake : (selectedContract.stakingDetails?.minimumStake || '0')} {displayMetrics?.stakingToken}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {displayTimeSeriesData && displayTimeSeriesData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Staking Activity Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
              Staking Activity
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayTimeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => formatDate(label)}
                  formatter={(value, name) => [formatValue(value), name]}
                />
                <Line 
                  type="monotone" 
                  dataKey="stakes" 
                  stroke={chartColors.success} 
                  strokeWidth={2}
                  name="Stakes"
                />
                <Line 
                  type="monotone" 
                  dataKey="unstakes" 
                  stroke={chartColors.error} 
                  strokeWidth={2}
                  name="Unstakes"
                />
                <Line 
                  type="monotone" 
                  dataKey="rewards" 
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
              <BarChart data={displayTimeSeriesData}>
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
      {displayStakingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold" style={{ color: styles.primaryColor }}>
              Recent Staking Events
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {displayStakingEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">
                    {event.eventIcon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {event.shortAddress} {event.eventDescription} {formatValue(parseFloat(event.value_eth))} {displayMetrics?.stakingToken}
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
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
} 