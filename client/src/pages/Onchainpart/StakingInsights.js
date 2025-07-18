import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, DollarSign, Clock, AlertCircle, Lock, Unlock, Wallet, X, Calendar, ArrowUpDown, PieChart, BarChart3, Activity, Target, Timer, Zap, Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area } from 'recharts';

export default function StakingInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [stakingData, setStakingData] = useState(null);
  const [stakingMetrics, setStakingMetrics] = useState(null);
  const [stakingEvents, setStakingEvents] = useState([]);
  const [walletGroups, setWalletGroups] = useState([]);
  const [maturityAnalysis, setMaturityAnalysis] = useState(null);
  const [withdrawalAnalysis, setWithdrawalAnalysis] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [contextError, setContextError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Wallet analysis filters and state
  const [walletFilter, setWalletFilter] = useState('');
  const [walletSortBy, setWalletSortBy] = useState('totalStaked');
  const [walletSortOrder, setWalletSortOrder] = useState('desc');
  const [walletTypeFilter, setWalletTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
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
    unlock: "#06b6d4",
    early: "#ef4444",
    ontime: "#10b981"
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
      setMaturityAnalysis(null);
      setWithdrawalAnalysis(null);
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
        setMaturityAnalysis(null);
        setWithdrawalAnalysis(null);
        setIsLoading(false);
        return;
      }

      // Analyze Zeebu staking transaction patterns
      const stakingAnalysis = analyzeZeebuTransactions(transactions);
      
      // Generate time series data based on real methods
      const timeSeriesData = generateRealTimeSeriesData(transactions, timeRange);
      
      // Extract recent staking events
      const recentEvents = extractRealStakingEvents(transactions);
      
      // Group transactions by wallet with detailed analysis
      const walletGroupsData = groupTransactionsByWalletDetailed(transactions);
      
      // Analyze maturity patterns
      const maturityAnalysisData = analyzeMaturityPatterns(transactions);
      
      // Analyze withdrawal patterns
      const withdrawalAnalysisData = analyzeWithdrawalPatterns(transactions);
      
      setStakingMetrics(stakingAnalysis);
      setStakingData(timeSeriesData);
      setStakingEvents(recentEvents);
      setWalletGroups(walletGroupsData);
      setMaturityAnalysis(maturityAnalysisData);
      setWithdrawalAnalysis(withdrawalAnalysisData);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error processing real staking data:', error);
      setIsLoading(false);
    }
  };

  // Analyze maturity patterns from real data
  const analyzeMaturityPatterns = (transactions) => {
    const maturityDates = [];
    const lockDurations = [];
    const maturityByYear = {};
    
    transactions.forEach(tx => {
      const details = tx.stakingAnalysis?.details;
      if (details?.unlockTimestamp && details?.lockDurationDays) {
        const unlockDate = new Date(details.unlockTimestamp * 1000);
        const year = unlockDate.getFullYear();
        
        maturityDates.push(details.unlockTimestamp);
        lockDurations.push(details.lockDurationDays);
        
        maturityByYear[year] = (maturityByYear[year] || 0) + 1;
      }
    });
    
    // Calculate statistics
    const avgLockDuration = lockDurations.length > 0 
      ? lockDurations.reduce((sum, days) => sum + days, 0) / lockDurations.length 
      : 0;
    
    const avgMaturityTimestamp = maturityDates.length > 0
      ? maturityDates.reduce((sum, ts) => sum + ts, 0) / maturityDates.length
      : 0;
    
    const avgMaturityDate = avgMaturityTimestamp > 0 
      ? new Date(avgMaturityTimestamp * 1000).toISOString().split('T')[0]
      : null;
    
    // Lock duration distribution
    const durationRanges = {
      'Short (< 6 months)': lockDurations.filter(d => d < 180).length,
      'Medium (6-12 months)': lockDurations.filter(d => d >= 180 && d < 365).length,
      'Long (1-2 years)': lockDurations.filter(d => d >= 365 && d < 730).length,
      'Maximum (2+ years)': lockDurations.filter(d => d >= 730).length
    };
    
    return {
      totalWithMaturity: maturityDates.length,
      avgLockDuration: Math.round(avgLockDuration),
      avgMaturityDate,
      maturityByYear,
      durationRanges,
      lockDurations: lockDurations.sort((a, b) => a - b)
    };
  };

  // Analyze withdrawal patterns from real data
  const analyzeWithdrawalPatterns = (transactions) => {
    const withdrawalTxs = transactions.filter(tx => {
      const method = tx.functionName || tx.method_name || '';
      return method.includes('withdraw');
    });
    
    let earlyWithdrawals = 0;
    let onTimeWithdrawals = 0;
    let totalPenalties = 0;
    const withdrawalsByMonth = {};
    
    withdrawalTxs.forEach(tx => {
      const details = tx.stakingAnalysis?.details;
      const method = tx.functionName || tx.method_name || '';
      
      if (details?.withdrawalDate) {
        const withdrawalDate = new Date(details.withdrawalDate);
        const monthKey = `${withdrawalDate.getFullYear()}-${String(withdrawalDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!withdrawalsByMonth[monthKey]) {
          withdrawalsByMonth[monthKey] = { early: 0, onTime: 0, total: 0 };
        }
        
        withdrawalsByMonth[monthKey].total++;
        
        if (details.isEarlyWithdrawal || method.includes('withdraw_early')) {
          earlyWithdrawals++;
          withdrawalsByMonth[monthKey].early++;
          
          // Estimate penalty (typically 10-25% for early withdrawals)
          const amount = extractTokenAmount(tx);
          if (amount > 0) {
            totalPenalties += amount * 0.15; // Assume 15% penalty
          }
        } else {
          onTimeWithdrawals++;
          withdrawalsByMonth[monthKey].onTime++;
        }
      }
    });
    
    const totalWithdrawals = earlyWithdrawals + onTimeWithdrawals;
    const earlyWithdrawalRate = totalWithdrawals > 0 ? (earlyWithdrawals / totalWithdrawals * 100) : 0;
    
    return {
      totalWithdrawals,
      earlyWithdrawals,
      onTimeWithdrawals,
      earlyWithdrawalRate: Math.round(earlyWithdrawalRate * 100) / 100,
      estimatedPenalties: totalPenalties,
      withdrawalsByMonth
    };
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
      const match = tx.value_eth.match(/(\d+(\.\d+)?)/);
      if (match && match[1]) {
        return parseFloat(match[1]);
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

  // Enhanced wallet grouping with detailed analysis
  const groupTransactionsByWalletDetailed = (transactions) => {
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
          currentBalance: 0,
          nextWithdrawalDate: null,
          firstTransactionDate: null,
          lastTransactionDate: null,
          avgLockDuration: 0,
          totalPenalties: 0,
          walletType: 'regular',
          operationCounts: {
            create_lock: 0,
            increase_amount: 0,
            increase_unlock_time: 0,
            withdraw: 0,
            withdraw_early: 0
          },
          recentEvents: []
        });
      }
      
      const walletData = walletMap.get(walletAddress);
      walletData.transactions.push(tx);
      
      // Update transaction dates
      const txDate = new Date(tx.block_time);
      if (!walletData.firstTransactionDate || txDate < walletData.firstTransactionDate) {
        walletData.firstTransactionDate = txDate;
      }
      if (!walletData.lastTransactionDate || txDate > walletData.lastTransactionDate) {
        walletData.lastTransactionDate = txDate;
      }
      
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
          walletData.totalPenalties += tokenAmount * 0.15; // Estimated penalty
        } else {
          walletData.operationCounts.withdraw++;
        }
      } else if (method.includes('increase_unlock_time')) {
        walletData.operationCounts.increase_unlock_time++;
      }
      
      // Track next withdrawal date
      const maturityTimestamp = extractMaturityFromTx(tx);
      if (maturityTimestamp && (!walletData.nextWithdrawalDate || maturityTimestamp < walletData.nextWithdrawalDate)) {
        walletData.nextWithdrawalDate = maturityTimestamp;
      }
      
      // Add to recent events
      walletData.recentEvents.push({
        tx_hash: tx.tx_hash,
        method: method,
        amount: tokenAmount,
        date: txDate,
        eventType: getEventType(method),
        eventDescription: getEventDescription(method, tokenAmount)
      });
    });
    
    // Calculate derived metrics for each wallet
    Array.from(walletMap.values()).forEach(wallet => {
      wallet.currentBalance = wallet.totalStaked - wallet.totalWithdrawn;
      wallet.recentEvents.sort((a, b) => b.date - a.date);
      wallet.recentEvents = wallet.recentEvents.slice(0, 10); // Keep only 10 most recent
      
      // Determine wallet type
      const totalTxs = wallet.transactions.length;
      const totalStaked = wallet.totalStaked;
      
      if (totalStaked > 100000) {
        wallet.walletType = 'whale';
      } else if (totalStaked > 10000) {
        wallet.walletType = 'large';
      } else if (totalTxs > 10) {
        wallet.walletType = 'active';
      } else {
        wallet.walletType = 'regular';
      }
    });
    
    return Array.from(walletMap.values())
      .sort((a, b) => b.totalStaked - a.totalStaked);
  };

  // Helper functions for event processing
  const getEventType = (method) => {
    if (method.includes('create_lock')) return 'Create Lock';
    if (method.includes('increase_amount')) return 'Increase Amount';
    if (method.includes('increase_unlock_time')) return 'Extend Lock Time';
    if (method.includes('withdraw_early')) return 'Early Withdrawal';
    if (method.includes('withdraw')) return 'Withdrawal';
    return 'Unknown';
  };

  const getEventDescription = (method, amount) => {
    const formattedAmount = amount > 0 ? formatValue(amount) : '0';
    if (method.includes('create_lock')) return `Created lock with ${formattedAmount} ZBU`;
    if (method.includes('increase_amount')) return `Increased by ${formattedAmount} ZBU`;
    if (method.includes('increase_unlock_time')) return `Extended lock time`;
    if (method.includes('withdraw_early')) return `Early withdrawal of ${formattedAmount} ZBU`;
    if (method.includes('withdraw')) return `Withdrew ${formattedAmount} ZBU`;
    return 'Unknown operation';
  };

  // Generate time series data for charts
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
        const match = tx.value_eth.match(/(\d+(?:\.\d+)?)/);
        if (match && match[1]) {
          return parseFloat(match[1]);
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

  // Extract maturity timestamp from transaction
  const extractMaturityTimestamp = (tx) => {
    try {
      if (tx.stakingAnalysis && tx.stakingAnalysis.details && tx.stakingAnalysis.details.unlockTimestamp) {
        return tx.stakingAnalysis.details.unlockTimestamp;
      }
      return null;
    } catch (error) {
      console.error('Error extracting maturity timestamp:', error);
      return null;
    }
  };

  // Format large numbers
  const formatValue = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    return value.toFixed(2);
  };

  // Format date
  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Filter and sort wallets
  const getFilteredWallets = () => {
    let filtered = [...walletGroups];
    
    // Apply search filter
    if (walletFilter) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(walletFilter.toLowerCase()) ||
        wallet.shortAddress.toLowerCase().includes(walletFilter.toLowerCase())
      );
    }
    
    // Apply type filter
    if (walletTypeFilter !== 'all') {
      filtered = filtered.filter(wallet => wallet.walletType === walletTypeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[walletSortBy];
      let bValue = b[walletSortBy];
      
      if (walletSortBy === 'firstTransactionDate' || walletSortBy === 'lastTransactionDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (walletSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };

  // Handle wallet selection
  const handleWalletClick = (wallet) => {
    setSelectedWallet(wallet);
    setShowWalletModal(true);
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

  const demoMaturityAnalysis = {
    totalWithMaturity: 2500,
    avgLockDuration: 365,
    avgMaturityDate: '2025-12-31',
    maturityByYear: { 2024: 500, 2025: 1200, 2026: 800 },
    durationRanges: {
      'Short (< 6 months)': 300,
      'Medium (6-12 months)': 1000,
      'Long (1-2 years)': 800,
      'Maximum (2+ years)': 400
    }
  };

  const demoWithdrawalAnalysis = {
    totalWithdrawals: 234,
    earlyWithdrawals: 35,
    onTimeWithdrawals: 199,
    earlyWithdrawalRate: 15.0,
    estimatedPenalties: 12500
  };

  const displayMetrics = shouldShowDemoData ? demoStakingMetrics : stakingMetrics;
  const displayMaturityAnalysis = shouldShowDemoData ? demoMaturityAnalysis : maturityAnalysis;
  const displayWithdrawalAnalysis = shouldShowDemoData ? demoWithdrawalAnalysis : withdrawalAnalysis;

  if (shouldShowDemoData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-blue-800 font-medium">
                No staking contract selected. Please select a staking contract to view real data.
              </p>
            </div>
          </div>
          
          <div className="text-center py-12">
            <Lock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Staking Contract</h3>
            <p className="text-gray-500">Choose a staking contract from the dropdown to view detailed analytics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staking Analytics</h1>
          <p className="text-gray-600">Comprehensive analysis of {displayMetrics?.contractName || 'Staking Contract'}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'maturity', label: 'Maturity Analysis', icon: Calendar },
              { id: 'withdrawals', label: 'Withdrawal Analysis', icon: TrendingUp },
              { id: 'wallets', label: 'Wallet Analysis', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Stakers</p>
                    <p className="text-2xl font-bold text-gray-900">{displayMetrics?.totalStakers?.toLocaleString() || '0'}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Staked</p>
                    <p className="text-2xl font-bold text-gray-900">{formatValue(displayMetrics?.totalStaked || 0)} ZBU</p>
                  </div>
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Withdrawn</p>
                    <p className="text-2xl font-bold text-gray-900">{formatValue(displayMetrics?.totalWithdrawn || 0)} ZBU</p>
                  </div>
                  <Unlock className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Net Staked</p>
                    <p className="text-2xl font-bold text-gray-900">{formatValue(displayMetrics?.netStaked || 0)} ZBU</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Operation Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Operation Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Create Lock</span>
                    <span className="font-medium">{displayMetrics?.totalLocks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Increase Amount</span>
                    <span className="font-medium">{displayMetrics?.totalIncreases || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Extend Time</span>
                    <span className="font-medium">{displayMetrics?.totalExtensions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Withdrawals</span>
                    <span className="font-medium">{displayMetrics?.totalWithdrawals || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Staking Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Create Lock Total</span>
                    <span className="font-medium">{formatValue(displayMetrics?.createLockTotal || 0)} ZBU</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Increase Amount Total</span>
                    <span className="font-medium">{formatValue(displayMetrics?.increaseAmountTotal || 0)} ZBU</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Regular Withdrawals</span>
                    <span className="font-medium">{formatValue(displayMetrics?.regularWithdrawTotal || 0)} ZBU</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Early Withdrawals</span>
                    <span className="font-medium">{formatValue(displayMetrics?.earlyWithdrawTotal || 0)} ZBU</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Maturity Analysis Tab */}
        {activeTab === 'maturity' && (
          <div className="space-y-6">
            {/* Maturity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Lock Duration</p>
                    <p className="text-2xl font-bold text-gray-900">{displayMaturityAnalysis?.avgLockDuration || 0} days</p>
                    <p className="text-xs text-gray-500">~{Math.round((displayMaturityAnalysis?.avgLockDuration || 0) / 30)} months</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Maturity Date</p>
                    <p className="text-2xl font-bold text-gray-900">{displayMaturityAnalysis?.avgMaturityDate || 'N/A'}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Transactions with Maturity</p>
                    <p className="text-2xl font-bold text-gray-900">{displayMaturityAnalysis?.totalWithMaturity || 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Lock Duration Distribution */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Lock Duration Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMaturityAnalysis?.durationRanges && Object.entries(displayMaturityAnalysis.durationRanges).map(([range, count]) => (
                  <div key={range} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600">{range}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Maturity by Year */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Maturity Distribution by Year</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {displayMaturityAnalysis?.maturityByYear && Object.entries(displayMaturityAnalysis.maturityByYear).map(([year, count]) => (
                  <div key={year} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600">{year}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Analysis Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            {/* Withdrawal Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Withdrawals</p>
                    <p className="text-2xl font-bold text-gray-900">{displayWithdrawalAnalysis?.totalWithdrawals || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">On-Time Withdrawals</p>
                    <p className="text-2xl font-bold text-green-600">{displayWithdrawalAnalysis?.onTimeWithdrawals || 0}</p>
                  </div>
                  <Timer className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Early Withdrawals</p>
                    <p className="text-2xl font-bold text-red-600">{displayWithdrawalAnalysis?.earlyWithdrawals || 0}</p>
                  </div>
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Early Withdrawal Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{displayWithdrawalAnalysis?.earlyWithdrawalRate || 0}%</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Penalty Analysis */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Penalty Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">Estimated Total Penalties</span>
                    <span className="font-bold text-red-700">{formatValue(displayWithdrawalAnalysis?.estimatedPenalties || 0)} ZBU</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">On-Time Withdrawal Rate</span>
                    <span className="font-bold text-green-700">{100 - (displayWithdrawalAnalysis?.earlyWithdrawalRate || 0)}%</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Average Penalty Rate</p>
                    <p className="text-2xl font-bold text-gray-900">15%</p>
                    <p className="text-xs text-gray-500">Estimated based on early withdrawals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Analysis Tab */}
        {activeTab === 'wallets' && (
          <div className="space-y-6">
            {/* Wallet Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search wallet address..."
                      value={walletFilter}
                      onChange={(e) => setWalletFilter(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <select
                    value={walletTypeFilter}
                    onChange={(e) => setWalletTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Wallets</option>
                                         <option value="whale">Whales (&gt;100K ZBU)</option>
                     <option value="large">Large (&gt;10K ZBU)</option>
                     <option value="active">Active (&gt;10 txs)</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                    {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </button>
                </div>
              </div>
              
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                      <select
                        value={walletSortBy}
                        onChange={(e) => setWalletSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="totalStaked">Total Staked</option>
                        <option value="totalWithdrawn">Total Withdrawn</option>
                        <option value="currentBalance">Current Balance</option>
                        <option value="firstTransactionDate">First Transaction</option>
                        <option value="lastTransactionDate">Last Transaction</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                      <select
                        value={walletSortOrder}
                        onChange={(e) => setWalletSortOrder(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="desc">Highest First</option>
                        <option value="asc">Lowest First</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Wallets</p>
                    <p className="text-2xl font-bold text-gray-900">{getFilteredWallets().length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Whale Wallets</p>
                    <p className="text-2xl font-bold text-gray-900">{walletGroups.filter(w => w.walletType === 'whale').length}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Wallets</p>
                    <p className="text-2xl font-bold text-gray-900">{walletGroups.filter(w => w.walletType === 'active').length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Txs per Wallet</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {walletGroups.length > 0 ? (walletGroups.reduce((sum, w) => sum + w.transactions.length, 0) / walletGroups.length).toFixed(1) : '0'}
                    </p>
                  </div>
                  <ArrowUpDown className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Wallet Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Wallet Details</h3>
                <p className="text-sm text-gray-600 mt-1">Click on any wallet to view detailed transaction history</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Wallet</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Total Staked</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Total Withdrawn</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Current Balance</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Transactions</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Last Activity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredWallets().slice(0, 50).map((wallet, index) => (
                      <tr key={wallet.address} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-purple-600 font-medium text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-mono text-sm font-medium">{wallet.shortAddress}</p>
                              <p className="text-xs text-gray-500">{wallet.address.substring(0, 20)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            wallet.walletType === 'whale' ? 'bg-purple-100 text-purple-800' :
                            wallet.walletType === 'large' ? 'bg-blue-100 text-blue-800' :
                            wallet.walletType === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {wallet.walletType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-green-600">{formatValue(wallet.totalStaked)} ZBU</td>
                        <td className="py-3 px-4 font-medium text-red-600">{formatValue(wallet.totalWithdrawn)} ZBU</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{formatValue(wallet.currentBalance)} ZBU</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{wallet.transactions.length}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {wallet.lastTransactionDate ? wallet.lastTransactionDate.toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleWalletClick(wallet)}
                            className="flex items-center px-3 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Details Modal */}
        {showWalletModal && selectedWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Wallet Analysis</h3>
                  <p className="text-sm text-gray-600 font-mono">{selectedWallet.address}</p>
                </div>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Wallet Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Lock className="h-6 w-6 mr-2 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Staked</p>
                        <p className="text-lg font-semibold text-green-600">{formatValue(selectedWallet.totalStaked)} ZBU</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Unlock className="h-6 w-6 mr-2 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Withdrawn</p>
                        <p className="text-lg font-semibold text-red-600">{formatValue(selectedWallet.totalWithdrawn)} ZBU</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Wallet className="h-6 w-6 mr-2 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="text-lg font-semibold text-blue-600">{formatValue(selectedWallet.currentBalance)} ZBU</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Activity className="h-6 w-6 mr-2 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Transactions</p>
                        <p className="text-lg font-semibold text-purple-600">{selectedWallet.transactions.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operation Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Operation Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Create Lock:</span>
                        <span className="font-medium">{selectedWallet.operationCounts.create_lock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Increase Amount:</span>
                        <span className="font-medium">{selectedWallet.operationCounts.increase_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Extend Time:</span>
                        <span className="font-medium">{selectedWallet.operationCounts.increase_unlock_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Withdrawals:</span>
                        <span className="font-medium">{selectedWallet.operationCounts.withdraw}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Early Withdrawals:</span>
                        <span className="font-medium text-red-600">{selectedWallet.operationCounts.withdraw_early}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">First Transaction:</span>
                        <span className="font-medium">{selectedWallet.firstTransactionDate?.toLocaleDateString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Transaction:</span>
                        <span className="font-medium">{selectedWallet.lastTransactionDate?.toLocaleDateString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Next Withdrawal:</span>
                        <span className="font-medium">{selectedWallet.nextWithdrawalDate ? new Date(selectedWallet.nextWithdrawalDate * 1000).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Estimated Penalties:</span>
                        <span className="font-medium text-red-600">{formatValue(selectedWallet.totalPenalties)} ZBU</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Events */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Recent Events</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedWallet.recentEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            {event.eventType === 'Create Lock' && <Lock className="h-4 w-4 text-purple-600" />}
                            {event.eventType === 'Increase Amount' && <TrendingUp className="h-4 w-4 text-green-600" />}
                            {event.eventType === 'Extend Lock Time' && <Clock className="h-4 w-4 text-blue-600" />}
                            {event.eventType === 'Withdrawal' && <Unlock className="h-4 w-4 text-orange-600" />}
                            {event.eventType === 'Early Withdrawal' && <Zap className="h-4 w-4 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.eventType}</p>
                            <p className="text-xs text-gray-600">{event.eventDescription}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{event.date.toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{event.tx_hash.substring(0, 10)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 