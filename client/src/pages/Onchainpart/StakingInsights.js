import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Clock, AlertCircle, Lock, Unlock, Wallet, X, Calendar, ArrowUpDown } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function StakingInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [stakingData, setStakingData] = useState(null);
  const [stakingMetrics, setStakingMetrics] = useState(null);
  const [stakingEvents, setStakingEvents] = useState([]);
  const [walletGroups, setWalletGroups] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [contextError, setContextError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
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
      setWalletGroups([]);
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
        setWalletGroups([]);
        setIsLoading(false);
        return;
      }

      // Analyze Zeebu staking transaction patterns
      const stakingAnalysis = analyzeZeebuTransactions(transactions);
      
      // Generate time series data based on real methods
      const timeSeriesData = generateRealTimeSeriesData(transactions, timeRange);
      
      // Extract recent staking events
      const recentEvents = extractRealStakingEvents(transactions);
      
      // Group transactions by wallet
      const walletGroupsData = groupTransactionsByWallet(transactions);
      
      setStakingMetrics(stakingAnalysis);
      setStakingData(timeSeriesData);
      setStakingEvents(recentEvents);
      setWalletGroups(walletGroupsData);
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
      createLockTotal: 0,
      increaseAmountTotal: 0,
      regularWithdrawTotal: 0,
      earlyWithdrawTotal: 0,
      averageMaturity: 0,
      stakingToken: 'ZBU',
      rewardToken: 'ZBU',
      maturityDates: []
    };

    // Track wallet balances
    const walletBalances = new Map();

    transactions.forEach(tx => {
      const method = tx.functionName || tx.method_name || '';
      const from = tx.from_address;
      
      if (from) {
        analysis.totalStakers.add(from);
        
        // Initialize wallet tracking if not exists
        if (!walletBalances.has(from)) {
          walletBalances.set(from, {
            totalStaked: 0,
            totalWithdrawn: 0,
            lastMaturityDate: null
          });
        }
      }

      // Extract token amount
      const tokenAmount = extractTokenAmount(tx);
      
      // Categorize by actual Zeebu methods
      if (method.includes('create_lock')) {
        analysis.lockCreations++;
        if (tokenAmount > 0) {
          analysis.createLockTotal += tokenAmount;
          walletBalances.get(from).totalStaked += tokenAmount;
        }
        // Extract maturity date
        const maturityTimestamp = extractMaturityTimestamp(tx);
        if (maturityTimestamp) {
          analysis.maturityDates.push(maturityTimestamp);
          walletBalances.get(from).lastMaturityDate = maturityTimestamp;
        }
      } else if (method.includes('increase_amount')) {
        analysis.amountIncreases++;
        if (tokenAmount > 0) {
          analysis.increaseAmountTotal += tokenAmount;
          walletBalances.get(from).totalStaked += tokenAmount;
        }
      } else if (method.includes('increase_unlock_time')) {
        analysis.timeExtensions++;
        const maturityTimestamp = extractMaturityTimestamp(tx);
        if (maturityTimestamp) {
          analysis.maturityDates.push(maturityTimestamp);
          walletBalances.get(from).lastMaturityDate = maturityTimestamp;
        }
      } else if (method.includes('withdraw')) {
        if (method.includes('withdraw_early')) {
          analysis.earlyWithdrawals++;
          if (tokenAmount > 0) {
            analysis.earlyWithdrawTotal += tokenAmount;
            walletBalances.get(from).totalWithdrawn += tokenAmount;
          }
        } else {
          analysis.withdrawals++;
          if (tokenAmount > 0) {
            analysis.regularWithdrawTotal += tokenAmount;
            walletBalances.get(from).totalWithdrawn += tokenAmount;
          }
        }
      }

      // Try to extract value (handle "0 ZBU" format)
      if (tx.value_eth && typeof tx.value_eth === 'string') {
        const numericValue = parseFloat(tx.value_eth.replace(/[^\d.]/g, ''));
        if (!isNaN(numericValue)) {
          analysis.totalVolume += numericValue;
        }
      }
    });

    // Calculate average maturity
    if (analysis.maturityDates.length > 0) {
      const now = Date.now() / 1000;
      const avgMaturityTimestamp = analysis.maturityDates.reduce((sum, timestamp) => sum + timestamp, 0) / analysis.maturityDates.length;
      analysis.averageMaturity = Math.max(0, Math.floor((avgMaturityTimestamp - now) / (24 * 60 * 60))); // days
    }

    // Calculate derived metrics
    const uniqueStakers = analysis.totalStakers.size;
    const totalOperations = analysis.lockCreations + analysis.amountIncreases + 
                           analysis.timeExtensions + analysis.withdrawals + analysis.earlyWithdrawals;

    // Calculate total staked and withdrawn
    const totalStaked = analysis.createLockTotal + analysis.increaseAmountTotal;
    const totalWithdrawn = analysis.regularWithdrawTotal + analysis.earlyWithdrawTotal;
    const netStaked = totalStaked - totalWithdrawn;

    return {
      totalStakers: uniqueStakers,
      totalLocks: analysis.lockCreations,
      totalIncreases: analysis.amountIncreases,
      totalExtensions: analysis.timeExtensions,
      totalWithdrawals: analysis.withdrawals + analysis.earlyWithdrawals,
      totalOperations: totalOperations,
      createLockTotal: analysis.createLockTotal,
      increaseAmountTotal: analysis.increaseAmountTotal,
      totalStaked: totalStaked,
      regularWithdrawTotal: analysis.regularWithdrawTotal,
      earlyWithdrawTotal: analysis.earlyWithdrawTotal,
      totalWithdrawn: totalWithdrawn,
      netStaked: netStaked,
      averageMaturity: analysis.averageMaturity,
      averageOpsPerStaker: uniqueStakers > 0 ? (totalOperations / uniqueStakers).toFixed(1) : 0,
      stakingToken: analysis.stakingToken,
      rewardToken: analysis.rewardToken,
      contractName: 'Zeebu Staking Contract',
      operationDistribution: {
        locks: analysis.lockCreations,
        increases: analysis.amountIncreases,
        extensions: analysis.timeExtensions,
        withdrawals: analysis.withdrawals + analysis.earlyWithdrawals
      },
      walletBalances: Array.from(walletBalances.entries()).map(([address, data]) => ({
        address,
        totalStaked: data.totalStaked,
        totalWithdrawn: data.totalWithdrawn,
        currentBalance: data.totalStaked - data.totalWithdrawn,
        lastMaturityDate: data.lastMaturityDate
      })).sort((a, b) => b.currentBalance - a.currentBalance)
    };
  };

  // Helper function to extract token amount from transaction
  const extractTokenAmountFromTx = (tx) => {
    if (tx.value_eth && typeof tx.value_eth === 'string') {
      // Handle K multiplier
      if (tx.value_eth.includes('K')) {
        const match = tx.value_eth.match(/(\d+(?:,\d{3})*(?:\.\d+)?)K/);
        if (match && match[1]) {
          return parseFloat(match[1].replace(/,/g, '')) * 1000;
        }
      } else {
        // Regular number
        const match = tx.value_eth.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        if (match && match[1]) {
          return parseFloat(match[1].replace(/,/g, ''));
        }
      }
    }
    return 0;
  };

  // Helper function to extract maturity timestamp from transaction
  const extractMaturityFromTx = (tx) => {
    if (tx.stakingAnalysis && tx.stakingAnalysis.details && tx.stakingAnalysis.details.unlockTimestamp) {
      return tx.stakingAnalysis.details.unlockTimestamp;
    }
    return null;
  };

  // Group transactions by wallet address
  const groupTransactionsByWallet = (transactions) => {
    const walletMap = new Map();
    
    transactions.forEach(tx => {
      const walletAddress = tx.from_address;
      if (!walletAddress) return;
      
      if (!walletMap.has(walletAddress)) {
        walletMap.set(walletAddress, {
          address: walletAddress,
          shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          transactions: [],
          totalStaked: 0,
          totalWithdrawn: 0,
          nextWithdrawalDate: null,
          operationCounts: {
            create_lock: 0,
            increase_amount: 0,
            increase_unlock_time: 0,
            withdraw: 0,
            withdraw_early: 0
          }
        });
      }
      
      const walletData = walletMap.get(walletAddress);
      walletData.transactions.push(tx);
      
      // Calculate totals
      const tokenAmount = extractTokenAmountFromTx(tx);
      const method = tx.functionName || tx.method_name || '';
      
      if (method.includes('create_lock') || method.includes('increase_amount')) {
        walletData.totalStaked += tokenAmount;
        walletData.operationCounts[method.includes('create_lock') ? 'create_lock' : 'increase_amount']++;
      } else if (method.includes('withdraw')) {
        walletData.totalWithdrawn += tokenAmount;
        if (method.includes('withdraw_early')) {
          walletData.operationCounts.withdraw_early++;
        } else {
          walletData.operationCounts.withdraw++;
        }
      } else if (method.includes('increase_unlock_time')) {
        walletData.operationCounts.increase_unlock_time++;
      }
      
      // Find next withdrawal date (earliest maturity date from create_lock transactions)
      if (method.includes('create_lock') || method.includes('increase_unlock_time')) {
        const maturityTimestamp = extractMaturityFromTx(tx);
        if (maturityTimestamp) {
          const maturityDate = new Date(maturityTimestamp * 1000);
          if (!walletData.nextWithdrawalDate || maturityDate < walletData.nextWithdrawalDate) {
            walletData.nextWithdrawalDate = maturityDate;
          }
        }
      }
    });
    
    // Convert to array and sort by total staked (descending)
    return Array.from(walletMap.values())
      .sort((a, b) => b.totalStaked - a.totalStaked)
      .slice(0, 20); // Show top 20 wallets
  };

  // Generate time series data based on real transaction data
  const generateRealTimeSeriesData = (transactions, timeRange) => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const timeSeriesData = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter transactions for this date
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.block_time).toISOString().split('T')[0];
        return txDate === dateStr;
      });
      
      // Count operations by type
      const locks = dayTransactions.filter(tx => (tx.functionName || tx.method_name || '').includes('create_lock')).length;
      const increases = dayTransactions.filter(tx => (tx.functionName || tx.method_name || '').includes('increase_amount')).length;
      const extensions = dayTransactions.filter(tx => (tx.functionName || tx.method_name || '').includes('increase_unlock_time')).length;
      const withdrawals = dayTransactions.filter(tx => (tx.functionName || tx.method_name || '').includes('withdraw')).length;
      
      // Count unique active users
      const activeUsers = new Set(dayTransactions.map(tx => tx.from_address)).size;
      
      timeSeriesData.push({
        date: dateStr,
        locks,
        increases,
        extensions,
        withdrawals,
        activeUsers,
        totalOps: locks + increases + extensions + withdrawals
      });
    }
    
    return timeSeriesData;
  };

  // Extract real staking events from transactions
  const extractRealStakingEvents = (transactions) => {
    console.log('Extracting data from transactions:', transactions.slice(0, 3));
    
    return transactions
      .slice(0, 20) // Get recent 20 transactions
      .map(tx => {
        const method = tx.functionName || tx.method_name || '';
        let eventType = 'Unknown Operation';
        let eventDescription = 'performed an operation';
        let eventDetails = '';
        
        // Extract token amount and format it properly
        const tokenAmount = extractTokenAmount(tx);
        const formattedAmount = tokenAmount ? `${formatValue(tokenAmount)} ZBU` : (tx.value_eth || '0 ZBU');
        
        // Extract maturity timestamp
        const maturityTimestamp = extractMaturityTimestamp(tx);
        const formattedMaturity = maturityTimestamp ? formatDate(maturityTimestamp) : 'Unknown';
        
        // Debug logging for extraction
        console.log('Transaction data extraction:', {
          hash: tx.tx_hash?.substring(0, 10),
          method,
          originalValue: tx.value_eth,
          extractedAmount: tokenAmount,
          formattedAmount,
          maturityTimestamp,
          formattedMaturity,
          inputDataSample: tx.input_data?.substring(0, 30)
        });
        
        // Parse method name to get a cleaner title
        if (method.includes('create_lock')) {
          eventType = 'Create Lock';
          eventDescription = 'created a new lock';
          eventDetails = `Amount: ${formattedAmount}, Maturity: ${formattedMaturity}`;
        } else if (method.includes('increase_amount')) {
          eventType = 'Increase Amount';
          eventDescription = 'increased lock amount';
          eventDetails = `Added: ${formattedAmount}`;
        } else if (method.includes('increase_unlock_time')) {
          eventType = 'Extend Lock Time';
          eventDescription = 'extended unlock time';
          eventDetails = `New maturity: ${formattedMaturity}`;
        } else if (method.includes('withdraw_early')) {
          eventType = 'Early Withdrawal';
          eventDescription = 'withdrew tokens early';
          eventDetails = `Amount: ${formattedAmount}, Penalty applied`;
        } else if (method.includes('withdraw')) {
          eventType = 'Withdrawal';
          eventDescription = 'withdrew tokens';
          eventDetails = `Amount: ${formattedAmount}`;
        }

        return {
          tx_hash: tx.tx_hash,
          from_address: tx.from_address,
          to_address: tx.to_address,
          value_eth: tx.value_eth || '0 ZBU',
          tokenAmount: formattedAmount,
          maturityDate: formattedMaturity,
          eventType,
          eventDescription,
          eventDetails,
          method: method,
          formattedTime: new Date(tx.block_time).toLocaleString(),
          shortAddress: tx.from_address ? `${tx.from_address.slice(0, 6)}...${tx.from_address.slice(-4)}` : 'Unknown',
          blockNumber: tx.block_number,
          gas_used: tx.gas_used,
          gas_price: tx.gas_price,
          status: tx.status || 'success',
          input_data: tx.input_data
        };
      });
  };

  // Extract token amount from transaction data
  const extractTokenAmount = (tx) => {
    try {
      // First check if we have a parsed value already
      if (tx.value_eth && typeof tx.value_eth === 'string') {
        // Handle K multiplier
        if (tx.value_eth.includes('K')) {
          const match = tx.value_eth.match(/(\d+(?:,\d{3})*(?:\.\d+)?)K/);
          if (match && match[1]) {
            return parseFloat(match[1].replace(/,/g, '')) * 1000;
          }
        } else {
          // Regular number
          const match = tx.value_eth.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
          if (match && match[1]) {
            return parseFloat(match[1].replace(/,/g, ''));
          }
        }
      }
      
      // Try to extract from input data if available
      if (tx.input_data) {
        // For create_lock and increase_amount, the value is typically the first parameter
        // This is a simplified approach - in production, you'd use a proper ABI decoder
        const valueHex = tx.input_data.substring(10, 74); // Skip method ID (4 bytes) and get first param (32 bytes)
        if (valueHex) {
          const value = parseInt(valueHex, 16);
          if (!isNaN(value)) {
            // Convert from wei to token units (assuming 18 decimals)
            return value / 1e18;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting token amount:', error);
      return null;
    }
  };

  // Extract maturity timestamp from transaction data
  const extractMaturityTimestamp = (tx) => {
    try {
      if (tx.input_data) {
        let timestampHex;
        
        if (tx.functionName && tx.functionName.includes('create_lock')) {
          // For create_lock, the timestamp is typically the second parameter
          timestampHex = tx.input_data.substring(74, 138);
        } else if (tx.functionName && tx.functionName.includes('increase_unlock_time')) {
          // For increase_unlock_time, the timestamp is typically the first parameter
          timestampHex = tx.input_data.substring(10, 74);
        }
        
        if (timestampHex) {
          const timestamp = parseInt(timestampHex, 16);
          if (timestamp > 1600000000 && timestamp < 2000000000) { // Sanity check for reasonable timestamp
            return new Date(timestamp * 1000);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting maturity timestamp:', error);
      return null;
    }
  };

  // Helper function to format date in a readable way
  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return String(date);
  };

  const formatValue = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
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
    totalStaked: 1250000,
    totalWithdrawn: 485000,
    averageMaturity: 180,
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

  const demoWalletGroups = [
    {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      shortAddress: '0xabcd...ef12',
      totalStaked: 125000,
      totalWithdrawn: 45000,
      nextWithdrawalDate: new Date('2025-06-15'),
      operationCounts: { create_lock: 3, increase_amount: 2, increase_unlock_time: 1, withdraw: 1, withdraw_early: 0 },
      transactions: []
    },
    {
      address: '0xbcdef02345678901bcdef02345678901bcdef023',
      shortAddress: '0xbcde...f023',
      totalStaked: 95000,
      totalWithdrawn: 25000,
      nextWithdrawalDate: new Date('2025-08-22'),
      operationCounts: { create_lock: 2, increase_amount: 3, increase_unlock_time: 2, withdraw: 1, withdraw_early: 0 },
      transactions: []
    },
    {
      address: '0xcdef123456789012cdef123456789012cdef1234',
      shortAddress: '0xcdef...1234',
      totalStaked: 75000,
      totalWithdrawn: 15000,
      nextWithdrawalDate: new Date('2025-04-10'),
      operationCounts: { create_lock: 1, increase_amount: 1, increase_unlock_time: 3, withdraw: 0, withdraw_early: 1 },
      transactions: []
    }
  ];

  // Use demo data if needed
  const displayMetrics = shouldShowDemoData ? demoStakingMetrics : stakingMetrics;
  const displayTimeSeriesData = shouldShowDemoData ? demoTimeSeriesData : stakingData;
  const displayWalletGroups = shouldShowDemoData ? demoWalletGroups : walletGroups;

  // Handle wallet click
  const handleWalletClick = (wallet) => {
    setSelectedWallet(wallet);
    setShowWalletModal(true);
  };

  // Close wallet modal
  const closeWalletModal = () => {
    setShowWalletModal(false);
    setSelectedWallet(null);
  };

  try {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-montserrat" style={{ color: styles.primaryColor }}>
            Staking Insights
          </h1>
          
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {['7d', '30d', '90d'].map(range => (
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

        {/* Updated Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 mr-3" style={{ color: styles.primaryColor }} />
              <div>
                <p className="text-sm text-gray-600">Total Tokens Staked</p>
                <p className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                  {formatValue(displayMetrics?.totalStaked || 0)} ZBU
                </p>
                <div className="text-xs text-gray-500">
                  <div>Create Lock: {formatValue(displayMetrics?.createLockTotal || 0)} ZBU</div>
                  <div>Increase Amount: {formatValue(displayMetrics?.increaseAmountTotal || 0)} ZBU</div>
                  <div>Net Staked: {formatValue(displayMetrics?.netStaked || 0)} ZBU</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Unlock className="h-8 w-8 mr-3" style={{ color: chartColors.warning }} />
              <div>
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.warning }}>
                  {formatValue(displayMetrics?.totalWithdrawn || 0)} ZBU
                </p>
                <div className="text-xs text-gray-500">
                  <div>Regular: {formatValue(displayMetrics?.regularWithdrawTotal || 0)} ZBU</div>
                  <div>Early: {formatValue(displayMetrics?.earlyWithdrawTotal || 0)} ZBU</div>
                  <div>({displayMetrics?.totalWithdrawals || 0} transactions)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 mr-3" style={{ color: chartColors.info }} />
              <div>
                <p className="text-sm text-gray-600">Average Maturity</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.info }}>
                  {displayMetrics?.averageMaturity || 0} days
                </p>
                <div className="text-xs text-gray-500">
                  <div>{displayMetrics?.totalStakers || 0} unique stakers</div>
                  <div>{displayMetrics?.totalOperations || 0} total operations</div>
                </div>
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
                Additional Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Stakers</span>
                  <span className="font-semibold">{displayMetrics?.totalStakers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Operations</span>
                  <span className="font-semibold">{displayMetrics?.totalOperations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Ops per Staker</span>
                  <span className="font-semibold">{displayMetrics?.averageOpsPerStaker || 0}</span>
                </div>
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

        {/* Wallet Analytics */}
        {displayWalletGroups && Array.isArray(displayWalletGroups) && displayWalletGroups.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold" style={{ color: styles.primaryColor }}>
                Wallet Analytics
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Click on any wallet to view detailed transaction history
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {displayWalletGroups.map((wallet, index) => (
                  <div
                    key={wallet.address}
                    onClick={() => handleWalletClick(wallet)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      {/* Wallet Info */}
                      <div className="flex items-center">
                        <Wallet className="h-5 w-5 mr-2" style={{ color: styles.primaryColor }} />
                        <span className="font-medium">{wallet.shortAddress}</span>
                      </div>

                      {/* Staking Info */}
                      <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0">
                        <div>
                          <span className="text-sm text-gray-600 mr-2">Total Staked:</span>
                          <span className="font-semibold text-green-600">
                            {formatValue(wallet.totalStaked)} ZBU
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 mr-2">Total Withdrawn:</span>
                          <span className="font-semibold text-red-600">
                            {formatValue(wallet.totalWithdrawn)} ZBU
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 mr-2">Next Withdrawal:</span>
                          <span className="text-sm text-gray-500">
                            {wallet.nextWithdrawalDate 
                              ? wallet.nextWithdrawalDate.toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>

                      {/* Operation Counts */}
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <div>
                          <span className="mr-1">Locks:</span>
                          <span className="font-medium">{wallet.operationCounts.create_lock}</span>
                        </div>
                        <div>
                          <span className="mr-1">Increases:</span>
                          <span className="font-medium">{wallet.operationCounts.increase_amount}</span>
                        </div>
                        <div>
                          <span className="mr-1">Withdrawals:</span>
                          <span className="font-medium">{wallet.operationCounts.withdraw + wallet.operationCounts.withdraw_early}</span>
                        </div>
                        <ArrowUpDown className="h-4 w-4 text-gray-400 ml-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wallet Modal */}
        {showWalletModal && selectedWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: styles.primaryColor }}>
                    Wallet Transaction History
                  </h3>
                  <p className="text-sm text-gray-600">{selectedWallet.address}</p>
                </div>
                <button
                  onClick={closeWalletModal}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Wallet Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 mr-2 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Staked</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatValue(selectedWallet.totalStaked)} ZBU
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Unlock className="h-6 w-6 mr-2 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Withdrawn</p>
                        <p className="text-lg font-semibold text-red-600">
                          {formatValue(selectedWallet.totalWithdrawn)} ZBU
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-6 w-6 mr-2 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Next Withdrawal</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {selectedWallet.nextWithdrawalDate 
                            ? selectedWallet.nextWithdrawalDate.toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold" style={{ color: styles.primaryColor }}>
                    Transaction History ({selectedWallet.transactions.length} transactions)
                  </h4>
                  
                  {selectedWallet.transactions.map((tx, index) => {
                    const method = tx.functionName || tx.method_name || '';
                    const tokenAmount = extractTokenAmountFromTx(tx);
                    const formattedAmount = tokenAmount ? `${formatValue(tokenAmount)} ZBU` : (tx.value_eth || '0 ZBU');
                    
                    let operationType = 'Unknown';
                    let operationColor = 'text-gray-600';
                    
                    if (method.includes('create_lock')) {
                      operationType = 'Create Lock';
                      operationColor = 'text-green-600';
                    } else if (method.includes('increase_amount')) {
                      operationType = 'Increase Amount';
                      operationColor = 'text-blue-600';
                    } else if (method.includes('increase_unlock_time')) {
                      operationType = 'Extend Lock Time';
                      operationColor = 'text-yellow-600';
                    } else if (method.includes('withdraw')) {
                      operationType = method.includes('withdraw_early') ? 'Early Withdrawal' : 'Withdrawal';
                      operationColor = 'text-red-600';
                    }
                    
                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-medium ${operationColor}`}>{operationType}</p>
                            <p className="text-sm text-gray-600">{new Date(tx.block_time).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formattedAmount}</p>
                            <p className="text-xs text-gray-500">Block #{tx.block_number}</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Tx Hash: {tx.tx_hash}</p>
                          <p>Method: {method}</p>
                          {tx.stakingAnalysis?.details?.unlockTimestamp && (
                            <p>Maturity: {new Date(tx.stakingAnalysis.details.unlockTimestamp * 1000).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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