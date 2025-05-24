import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, AlertCircle, Loader2, ArrowUp, ArrowDown, X, ExternalLink, ChevronDown } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function Onchainwalletinsights() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWalletDetail, setActiveWalletDetail] = useState(null);
  const [walletsData, setWalletsData] = useState([]);
  const [filteredWallets, setFilteredWallets] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'transactions', direction: 'desc' });
  const [walletMetrics, setWalletMetrics] = useState(null);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    totalSpent: { min: 0, max: 1000000 },
    transactions: { min: 0, max: 1000 },
    dateRange: {
      start: null,
      end: null
    }
  });
  const [showFilters, setShowFilters] = useState(false);

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

  // Process the wallets from the transaction data
  useEffect(() => {
    if (contractTransactions && !isLoadingTransactions) {
      // Process the transaction data to extract wallet information
      const walletMap = new Map();
      
      // Process transactions array directly since it's not an object
      contractTransactions.forEach(tx => {
        if (!tx || !tx.from_address) return;
        
        // Process sender wallet
        const fromWallet = tx.from_address;
        if (!walletMap.has(fromWallet)) {
          walletMap.set(fromWallet, {
            address: fromWallet,
            totalSent: 0,
            totalReceived: 0,
            transactions: 0,
            firstDate: tx.block_time,
            lastDate: tx.block_time,
            allTransactions: [],
            volume: 0, // Track total volume (sent + received)
            uniqueInteractions: new Set(), // Track unique addresses interacted with
          });
        }
        
        const walletData = walletMap.get(fromWallet);
        walletData.transactions += 1;
        const txValue = parseFloat(tx.value_eth) || 0;
        walletData.totalSent += txValue;
        walletData.volume += txValue;
        walletData.uniqueInteractions.add(tx.to_address);
        
        // Update first and last transaction dates
        if (new Date(tx.block_time) < new Date(walletData.firstDate)) {
          walletData.firstDate = tx.block_time;
        }
        if (new Date(tx.block_time) > new Date(walletData.lastDate)) {
          walletData.lastDate = tx.block_time;
        }
        
        // Keep track of all transactions
        walletData.allTransactions.push({
          hash: tx.tx_hash,
          timestamp: tx.block_time,
          amount: txValue,
          type: 'outgoing',
          to: tx.to_address,
          methodName: tx.method_name || 'transfer'
        });
        
        // Also process receiver wallet if different from sender
        if (tx.to_address && tx.to_address !== fromWallet) {
          if (!walletMap.has(tx.to_address)) {
            walletMap.set(tx.to_address, {
              address: tx.to_address,
              totalSent: 0,
              totalReceived: 0,
              transactions: 0,
              firstDate: tx.block_time,
              lastDate: tx.block_time,
              allTransactions: [],
              volume: 0,
              uniqueInteractions: new Set(),
            });
          }
          
          const recipientData = walletMap.get(tx.to_address);
          recipientData.transactions += 1;
          recipientData.totalReceived += txValue;
          recipientData.volume += txValue;
          recipientData.uniqueInteractions.add(fromWallet);
          
          // Update first and last transaction dates
          if (new Date(tx.block_time) < new Date(recipientData.firstDate)) {
            recipientData.firstDate = tx.block_time;
          }
          if (new Date(tx.block_time) > new Date(recipientData.lastDate)) {
            recipientData.lastDate = tx.block_time;
          }
          
          // Keep track of all transactions
          recipientData.allTransactions.push({
            hash: tx.tx_hash,
            timestamp: tx.block_time,
            amount: txValue,
            type: 'incoming',
            from: fromWallet,
            methodName: tx.method_name || 'transfer'
          });
        }
      });
      
      // Convert Map to array and process additional metrics
      const processedWallets = Array.from(walletMap.values()).map(wallet => ({
        ...wallet,
        netAmount: wallet.totalReceived - wallet.totalSent,
        formattedFirstDate: formatDate(wallet.firstDate),
        formattedLastDate: formatDate(wallet.lastDate),
        avgTransactionValue: wallet.volume / wallet.transactions,
        uniqueInteractionsCount: wallet.uniqueInteractions.size,
        // Add risk flag for wallets with unusual patterns
        hasAlert: wallet.transactions > 150 || 
                 (wallet.totalSent > wallet.totalReceived * 10) || 
                 (wallet.uniqueInteractions.size > 100 && wallet.transactions < 50)
      }));
      
      // Get top 1000 wallets by volume
      const topByVolume = [...processedWallets]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 1000);
      
      // Get top 1000 wallets by number of transactions
      const topByTransactions = [...processedWallets]
        .sort((a, b) => b.transactions - a.transactions)
        .slice(0, 1000);
      
      // Combine and deduplicate wallets
      const combinedTopWallets = Array.from(new Set([...topByVolume, ...topByTransactions]));
      
      // Sort wallets based on the current sort configuration
      const sortedWallets = sortWallets(combinedTopWallets);
      setWalletsData(sortedWallets);
      
      setIsLoading(false);
    }
  }, [contractTransactions, isLoadingTransactions, sortConfig]);

  const sortWallets = (wallets) => {
    return [...wallets].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  // Format currency helper
  const formatCurrency = (value, decimals = 2) => {
    if (value === undefined || value === null) return '0';
    
    const absValue = Math.abs(value);
    
    if (absValue >= 1000000000) {
      return `${(value / 1000000000).toFixed(decimals)}B`;
    } else if (absValue >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`;
    } else if (absValue >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`;
    } else {
      return value.toFixed(decimals);
    }
  };
  
  const formatValueWithSymbol = (value) => {
    if (!selectedContract) return formatCurrency(value);
    return `${formatCurrency(value)} ${selectedContract.tokenSymbol || ''}`;
  };

  // Format transaction hash for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Memoize wallet metrics calculation
  const calculateWalletMetrics = async (wallet) => {
    if (!wallet || !wallet.allTransactions) return null;
    
    setIsCalculatingMetrics(true);
    
    // Return a promise that resolves with the metrics
    return new Promise((resolve) => {
      // Use setTimeout to prevent UI blocking
      setTimeout(() => {
        try {
          // Basic metrics (fast to calculate)
          const basicMetrics = {
            totalTransactions: wallet.transactions || 0,
            firstTransaction: wallet.formattedFirstDate || '',
            lastTransaction: wallet.formattedLastDate || '',
            totalInflow: wallet.totalReceived || 0,
            totalOutflow: wallet.totalSent || 0,
            netAmount: wallet.netAmount || 0,
            totalVolume: wallet.volume || 0,
            activityChart: [],
            dailyActivityChart: [],
            methodStats: [],
            tradingStats: {
              totalPurchases: 0,
              totalSales: 0,
              largestTransaction: 0,
              smallestTransaction: 0,
              profitableTrades: 0,
              unprofitableTrades: 0,
              totalProfit: 0,
              totalLoss: 0,
              avgTransactionValue: wallet.avgTransactionValue || 0,
              successRate: 0
            },
            activityPatterns: {
              hours: new Array(24).fill(0),
              days: new Array(7).fill(0),
              peakHour: 0,
              peakDay: 0
            },
            interactionMetrics: {
              uniqueCounterparties: wallet.uniqueInteractions?.size || 0,
              averageInteractionFrequency: 0,
              repeatInteractionRate: 0
            }
          };
          
          // Update state with basic metrics first
          setWalletMetrics(basicMetrics);
          
          // Calculate detailed metrics in the background
          setTimeout(() => {
            // Organize transactions by month
            const monthlyData = {};
            const dailyData = {};
            const methodStats = {};
            let totalPurchases = 0;
            let totalSales = 0;
            let largestTransaction = 0;
            let smallestTransaction = Infinity;
            let profitableTrades = 0;
            let unprofitableTrades = 0;
            let totalProfit = 0;
            let totalLoss = 0;
            
            // Process transactions in chunks to prevent UI blocking
            const CHUNK_SIZE = 1000;
            const processTransactionsInChunks = (startIndex = 0) => {
              const endIndex = Math.min(startIndex + CHUNK_SIZE, wallet.allTransactions.length);
              
              for (let i = startIndex; i < endIndex; i++) {
                const tx = wallet.allTransactions[i];
                if (!tx) continue;

                const date = new Date(tx.timestamp);
                if (isNaN(date.getTime())) continue;

                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                const dayKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                
                // Monthly aggregation
                if (!monthlyData[monthKey]) {
                  monthlyData[monthKey] = {
                    month: monthKey,
                    inflow: 0,
                    outflow: 0,
                    transactions: 0,
                    uniqueCounterparties: new Set()
                  };
                }
                
                // Daily aggregation
                if (!dailyData[dayKey]) {
                  dailyData[dayKey] = {
                    date: dayKey,
                    inflow: 0,
                    outflow: 0,
                    transactions: 0
                  };
                }
                
                // Method statistics
                const method = tx.methodName || 'transfer';
                if (!methodStats[method]) {
                  methodStats[method] = {
                    count: 0,
                    volume: 0
                  };
                }
                
                const txAmount = parseFloat(tx.amount) || 0;
                
                // Update aggregations
                if (tx.type === 'incoming') {
                  monthlyData[monthKey].inflow += txAmount;
                  dailyData[dayKey].inflow += txAmount;
                  totalPurchases++;
                  if (tx.from) monthlyData[monthKey].uniqueCounterparties.add(tx.from);
                } else {
                  monthlyData[monthKey].outflow += txAmount;
                  dailyData[dayKey].outflow += txAmount;
                  totalSales++;
                  if (tx.to) monthlyData[monthKey].uniqueCounterparties.add(tx.to);
                }
                
                monthlyData[monthKey].transactions += 1;
                dailyData[dayKey].transactions += 1;
                methodStats[method].count += 1;
                methodStats[method].volume += txAmount;
                
                // Track largest and smallest transactions
                if (txAmount > largestTransaction) {
                  largestTransaction = txAmount;
                }
                if (txAmount < smallestTransaction && txAmount > 0) {
                  smallestTransaction = txAmount;
                }
                
                // Calculate profit/loss (simplified)
                if (tx.type === 'outgoing' && txAmount > 0) {
                  const profit = txAmount - (wallet.avgTransactionValue || 0);
                  if (profit > 0) {
                    profitableTrades++;
                    totalProfit += profit;
                  } else {
                    unprofitableTrades++;
                    totalLoss += Math.abs(profit);
                  }
                }
              }
              
              // If there are more transactions to process, schedule the next chunk
              if (endIndex < wallet.allTransactions.length) {
                setTimeout(() => processTransactionsInChunks(endIndex), 0);
              } else {
                // All chunks processed, finalize the metrics
                const chartData = Object.values(monthlyData)
                  .sort((a, b) => a.month.localeCompare(b.month))
                  .map(data => ({
                    ...data,
                    uniqueCounterparties: data.uniqueCounterparties?.size || 0
                  }));
                
                const dailyChartData = Object.values(dailyData)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(-30); // Last 30 days
                
                // Calculate activity patterns
                const activityHours = new Array(24).fill(0);
                const activityDays = new Array(7).fill(0);
                wallet.allTransactions.forEach(tx => {
                  if (!tx || !tx.timestamp) return;
                  const date = new Date(tx.timestamp);
                  if (!isNaN(date.getTime())) {
                    activityHours[date.getHours()]++;
                    activityDays[date.getDay()]++;
                  }
                });
                
                // Calculate interaction metrics
                const uniqueInteractions = wallet.uniqueInteractions?.size || 0;
                const interactionFrequency = uniqueInteractions > 0 ? wallet.transactions / uniqueInteractions : 0;
                
                const detailedMetrics = {
                  ...basicMetrics,
                  activityChart: chartData,
                  dailyActivityChart: dailyChartData,
                  methodStats: Object.entries(methodStats)
                    .map(([method, stats]) => ({
                      method,
                      count: stats.count,
                      volume: stats.volume,
                      percentage: wallet.transactions > 0 ? (stats.count / wallet.transactions) * 100 : 0
                    }))
                    .sort((a, b) => b.count - a.count),
                  tradingStats: {
                    totalPurchases,
                    totalSales,
                    largestTransaction,
                    smallestTransaction: smallestTransaction === Infinity ? 0 : smallestTransaction,
                    profitableTrades,
                    unprofitableTrades,
                    totalProfit,
                    totalLoss,
                    avgTransactionValue: wallet.avgTransactionValue || 0,
                    successRate: (profitableTrades + unprofitableTrades) > 0 
                      ? (profitableTrades / (profitableTrades + unprofitableTrades)) * 100 
                      : 0
                  },
                  activityPatterns: {
                    hours: activityHours,
                    days: activityDays,
                    peakHour: activityHours.indexOf(Math.max(...activityHours)),
                    peakDay: activityDays.indexOf(Math.max(...activityDays))
                  },
                  interactionMetrics: {
                    uniqueCounterparties: uniqueInteractions,
                    averageInteractionFrequency: interactionFrequency,
                    repeatInteractionRate: uniqueInteractions > 0 ? wallet.transactions / uniqueInteractions : 0
                  }
                };
                
                setWalletMetrics(detailedMetrics);
                setIsCalculatingMetrics(false);
                resolve(detailedMetrics);
              }
            };
            
            // Start processing the first chunk
            processTransactionsInChunks();
            
          }, 0);
        } catch (error) {
          console.error('Error calculating wallet metrics:', error);
          setIsCalculatingMetrics(false);
          resolve(null);
        }
      }, 0);
    });
  };
  
  const openWalletDetail = async (wallet) => {
    setActiveWalletDetail(wallet);
    setWalletMetrics(null); // Reset metrics
    await calculateWalletMetrics(wallet);
  };
  
  const closeWalletDetail = () => {
    setActiveWalletDetail(null);
  };

  // Apply filters to wallets
  useEffect(() => {
    if (!walletsData.length) {
      setFilteredWallets([]);
      return;
    }

    let filtered = [...walletsData];

    // Apply total spent filter
    filtered = filtered.filter(wallet => 
      wallet.totalSent >= filters.totalSpent.min && 
      wallet.totalSent <= filters.totalSpent.max
    );

    // Apply transactions filter
    filtered = filtered.filter(wallet => 
      wallet.transactions >= filters.transactions.min && 
      wallet.transactions <= filters.transactions.max
    );

    // Apply date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(wallet => {
        const firstDate = new Date(wallet.firstDate);
        const lastDate = new Date(wallet.lastDate);
        return firstDate >= startDate && lastDate <= endDate;
      });
    }

    setFilteredWallets(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [walletsData, filters]);

  // Calculate max values for sliders when wallet data changes
  useEffect(() => {
    if (walletsData.length > 0) {
      const maxSpent = Math.max(...walletsData.map(w => w.totalSent));
      const maxTx = Math.max(...walletsData.map(w => w.transactions));
      
      setFilters(prev => ({
        ...prev,
        totalSpent: { min: 0, max: maxSpent },
        transactions: { min: 0, max: maxTx }
      }));
    }
  }, [walletsData]);

  // Handle filter changes
  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  // Get current page wallets from filtered data
  const totalWalletsCount = filteredWallets.length;
  const walletsPerPage = 50;
  const totalPages = Math.ceil(totalWalletsCount / walletsPerPage);
  const indexOfLastWallet = currentPage * walletsPerPage;
  const indexOfFirstWallet = indexOfLastWallet - walletsPerPage;
  const currentWallets = filteredWallets.slice(indexOfFirstWallet, indexOfLastWallet);
  
  const pageNumbers = [];
  if (totalPages <= 7) {
    // If we have 7 or fewer pages, show all page numbers
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Always include first page, last page, and pages around current page
    if (currentPage <= 4) {
      // Current page is close to the beginning
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Current page is close to the end
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Current page is in the middle
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }
  }

  // Handle page change for pagination
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      // Scroll to top of the table when page changes
      const tableElement = document.querySelector('.wallet-table');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Show loading state when transactions are loading
  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: styles.primaryColor }} />
          <p className="text-lg font-medium font-montserrat" style={{ color: styles.primaryColor }}>
            Loading wallet insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 text-gray-900">
      {/* Import fonts in the head */}
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

      {/* Page title section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-montserrat" style={{ color: styles.primaryColor }}>
          Wallet Insights {selectedContract ? `for ${selectedContract.name}` : ''}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          Track and analyze wallet activity for your smart contract
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
            Filters
          </h2>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              backgroundColor: `${styles.primaryColor}10`, 
              color: styles.primaryColor
            }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            <ChevronDown
              size={16}
              className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {showFilters && (
          <div className="p-4 space-y-6">
            {/* Total Spent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Spent Range ({selectedContract?.tokenSymbol || 'tokens'})
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.totalSpent.min}
                  onChange={(e) => handleFilterChange('totalSpent', { ...filters.totalSpent, min: Number(e.target.value) })}
                  className="w-32 px-3 py-2 border rounded-md"
                  placeholder="Min"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.totalSpent.max}
                  onChange={(e) => handleFilterChange('totalSpent', { ...filters.totalSpent, max: Number(e.target.value) })}
                  className="w-32 px-3 py-2 border rounded-md"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Number of Transactions Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Transactions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.transactions.min}
                  onChange={(e) => handleFilterChange('transactions', { ...filters.transactions, min: Number(e.target.value) })}
                  className="w-32 px-3 py-2 border rounded-md"
                  placeholder="Min"
                />
                <span>to</span>
                <input
                  type="number"
                  value={filters.transactions.max}
                  onChange={(e) => handleFilterChange('transactions', { ...filters.transactions, max: Number(e.target.value) })}
                  className="w-32 px-3 py-2 border rounded-md"
                  placeholder="Max"
                />
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Date Range
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={formatDateForInput(filters.dateRange.start)}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-40 px-3 py-2 border rounded-md"
                />
                <span>to</span>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateRange.end)}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-40 px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredWallets.length} out of {walletsData.length} wallets
                </p>
                <button
                  onClick={() => setFilters({
                    totalSpent: { min: 0, max: Math.max(...walletsData.map(w => w.totalSent)) },
                    transactions: { min: 0, max: Math.max(...walletsData.map(w => w.transactions)) },
                    dateRange: { start: null, end: null }
                  })}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wallet detail view (modal) */}
      {activeWalletDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto p-0">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
                  Wallet Analysis
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-poppins">{activeWalletDetail.address}</p>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      navigator.clipboard.writeText(activeWalletDetail.address);
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <a 
                    href={`https://etherscan.io/address/${activeWalletDetail.address}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-500 hover:text-indigo-600"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={closeWalletDetail}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Show loading state while calculating metrics */}
            {isCalculatingMetrics && !walletMetrics && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" style={{ color: styles.primaryColor }} />
                <p className="text-gray-600">Calculating wallet metrics...</p>
              </div>
            )}
            
            {/* Show metrics as they become available */}
            {walletMetrics && (
              <div className="p-4">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Total Transactions</p>
                    <p className="text-xl font-semibold font-montserrat">{walletMetrics.totalTransactions.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">First Activity</p>
                    <p className="text-sm font-semibold font-montserrat">{walletMetrics.firstTransaction}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Last Activity</p>
                    <p className="text-sm font-semibold font-montserrat">{walletMetrics.lastTransaction}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Total Volume</p>
                    <p className="text-sm font-semibold font-montserrat">
                      {formatValueWithSymbol(walletMetrics.totalVolume)}
                    </p>
                  </div>
                </div>
                
                {/* Trading Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Total Tokens Received</p>
                    <p className="text-xl font-semibold text-green-600 font-montserrat">
                      {formatValueWithSymbol(walletMetrics.totalInflow)}
                    </p>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Total Purchases: </span>
                      <span className="font-medium">{walletMetrics.tradingStats.totalPurchases.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Total Tokens Spent</p>
                    <p className="text-xl font-semibold text-red-600 font-montserrat">
                      {formatValueWithSymbol(walletMetrics.totalOutflow)}
                    </p>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Total Sales: </span>
                      <span className="font-medium">{walletMetrics.tradingStats.totalSales.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Net Position</p>
                    <p className={`text-xl font-semibold font-montserrat ${walletMetrics.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatValueWithSymbol(walletMetrics.netAmount)}
                    </p>
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Success Rate: </span>
                      <span className="font-medium">{walletMetrics.tradingStats.successRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Trading Performance */}
                <div className="mb-6">
                  <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                    Trading Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Largest Transaction</p>
                      <p className="text-sm font-medium">{formatValueWithSymbol(walletMetrics.tradingStats.largestTransaction)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Average Transaction</p>
                      <p className="text-sm font-medium">{formatValueWithSymbol(walletMetrics.tradingStats.avgTransactionValue)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Total Profit</p>
                      <p className="text-sm font-medium text-green-600">+{formatValueWithSymbol(walletMetrics.tradingStats.totalProfit)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Total Loss</p>
                      <p className="text-sm font-medium text-red-600">-{formatValueWithSymbol(walletMetrics.tradingStats.totalLoss)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Activity Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Monthly Activity */}
                  <div>
                    <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                      Monthly Activity
                    </h3>
                    <div className="bg-white border border-gray-100 rounded-lg p-4" style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {walletMetrics && walletMetrics.activityChart && walletMetrics.activityChart.length > 0 ? (
                          <BarChart data={walletMetrics.activityChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontFamily: 'Poppins', fontSize: 10 }}
                              tickFormatter={(tick) => {
                                const [year, month] = tick.split('-');
                                return `${month}/${year.slice(2)}`;
                              }}
                            />
                            <YAxis tick={{ fontFamily: 'Poppins', fontSize: 10 }} />
                            <Tooltip 
                              contentStyle={{ fontFamily: 'Poppins', fontSize: 11 }}
                              formatter={(value, name) => {
                                switch(name) {
                                  case 'inflow':
                                    return [formatValueWithSymbol(value), 'Tokens Received'];
                                  case 'outflow':
                                    return [formatValueWithSymbol(value), 'Tokens Spent'];
                                  case 'uniqueCounterparties':
                                    return [value, 'Unique Wallets'];
                                  default:
                                    return [value, name];
                                }
                              }}
                              labelFormatter={(label) => {
                                const [year, month] = label.split('-');
                                const date = new Date(parseInt(year), parseInt(month) - 1);
                                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                              }}
                            />
                            <Bar dataKey="inflow" name="inflow" fill={styles.primaryColor} />
                            <Bar dataKey="outflow" name="outflow" fill={styles.accentColor} />
                            <Bar dataKey="uniqueCounterparties" name="uniqueCounterparties" fill="#94a3b8" />
                          </BarChart>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400">
                            No activity data available
                          </div>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Daily Activity (Last 30 Days) */}
                  <div>
                    <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                      Daily Activity (Last 30 Days)
                    </h3>
                    <div className="bg-white border border-gray-100 rounded-lg p-4" style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={walletMetrics.dailyActivityChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontFamily: 'Poppins', fontSize: 10 }}
                            tickFormatter={(tick) => {
                              const [, , day] = tick.split('-');
                              return day;
                            }}
                          />
                          <YAxis tick={{ fontFamily: 'Poppins', fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ fontFamily: 'Poppins', fontSize: 11 }}
                            formatter={(value, name) => {
                              switch(name) {
                                case 'inflow':
                                  return [formatValueWithSymbol(value), 'Tokens Received'];
                                case 'outflow':
                                  return [formatValueWithSymbol(value), 'Tokens Spent'];
                                default:
                                  return [value, name];
                              }
                            }}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            }}
                          />
                          <Area type="monotone" dataKey="inflow" name="inflow" stroke={styles.primaryColor} fill={`${styles.primaryColor}20`} />
                          <Area type="monotone" dataKey="outflow" name="outflow" stroke={styles.accentColor} fill={`${styles.accentColor}20`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Activity Patterns */}
                <div className="mb-6">
                  <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                    Activity Patterns
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Time of Day Activity</h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={walletMetrics.activityPatterns.hours.map((count, hour) => ({ hour, count }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour" 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(hour) => `${hour}:00`}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip 
                              formatter={(value) => [`${value} transactions`, 'Activity']}
                              labelFormatter={(hour) => `${hour}:00 - ${(hour + 1) % 24}:00`}
                            />
                            <Bar dataKey="count" fill={styles.primaryColor} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Peak activity at {walletMetrics.activityPatterns.peakHour}:00
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Day of Week Activity</h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={walletMetrics.activityPatterns.days.map((count, day) => ({ day, count }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="day" 
                              tick={{ fontSize: 10 }}
                              tickFormatter={(day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip 
                              formatter={(value) => [`${value} transactions`, 'Activity']}
                              labelFormatter={(day) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                            />
                            <Bar dataKey="count" fill={styles.accentColor} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Most active on {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][walletMetrics.activityPatterns.peakDay]}s
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Method Distribution */}
                <div className="mb-6">
                  <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                    Transaction Methods
                  </h3>
                  <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletMetrics.methodStats.map((method, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-4 text-sm">{method.method}</td>
                            <td className="py-2 px-4 text-sm">{method.count.toLocaleString()}</td>
                            <td className="py-2 px-4 text-sm">{formatValueWithSymbol(method.volume)}</td>
                            <td className="py-2 px-4 text-sm">{method.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Interaction Metrics */}
                <div className="mb-6">
                  <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                    Interaction Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Unique Counterparties</p>
                      <p className="text-lg font-medium">{walletMetrics.interactionMetrics.uniqueCounterparties.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Avg. Interactions per Address</p>
                      <p className="text-lg font-medium">{walletMetrics.interactionMetrics.averageInteractionFrequency.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Repeat Interaction Rate</p>
                      <p className="text-lg font-medium">{walletMetrics.interactionMetrics.repeatInteractionRate.toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
                
                {/* Transaction History */}
                <div>
                  <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                    Transaction History
                  </h3>
                  <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Hash</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">From/To</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeWalletDetail.allTransactions
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map((tx, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4">
                                  <div className="flex items-center space-x-2">
                                    <a 
                                      href={`https://etherscan.io/tx/${tx.hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-indigo-600 hover:text-indigo-800"
                                    >
                                      {formatAddress(tx.hash)}
                                    </a>
                                    <ExternalLink size={12} className="text-gray-400" />
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-xs">
                                  {formatDate(tx.timestamp)}
                                </td>
                                <td className="py-2 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${tx.type === 'incoming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {tx.type === 'incoming' ? 'Received' : 'Sent'}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-xs">
                                  {tx.type === 'incoming' ? (
                                    <span>From: {formatAddress(tx.from)}</span>
                                  ) : (
                                    <span>To: {formatAddress(tx.to)}</span>
                                  )}
                                </td>
                                <td className="py-2 px-4 text-right text-xs font-medium">
                                  <span className={tx.type === 'incoming' ? 'text-green-600' : 'text-red-600'}>
                                    {tx.type === 'incoming' ? '+' : '-'} {formatValueWithSymbol(tx.amount)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main wallet list table */}
      <div className="bg-white rounded-lg shadow mb-6">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
            Top Active Wallets {selectedContract ? `for ${selectedContract.name}` : ''}
          </h2>
          <button 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ 
              backgroundColor: `${styles.primaryColor}10`, 
              color: styles.primaryColor
            }}
          >
            <Download size={16} />
            Export wallets
            <span className="text-xs ml-1 opacity-70">{totalWalletsCount.toLocaleString()}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('address')}
                >
                  <div className="flex items-center">
                    Wallet Address
                    {sortConfig.key === 'address' && (
                      <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'ml-1' : 'ml-1 transform rotate-180'} />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalSent')}
                >
                  <div className="flex items-center">
                    Total Spent
                    {sortConfig.key === 'totalSent' && (
                      <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'ml-1' : 'ml-1 transform rotate-180'} />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('transactions')}
                >
                  <div className="flex items-center">
                    Transactions
                    {sortConfig.key === 'transactions' && (
                      <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'ml-1' : 'ml-1 transform rotate-180'} />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('firstDate')}
                >
                  <div className="flex items-center">
                    First Transaction
                    {sortConfig.key === 'firstDate' && (
                      <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'ml-1' : 'ml-1 transform rotate-180'} />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('lastDate')}
                >
                  <div className="flex items-center">
                    Last Transaction
                    {sortConfig.key === 'lastDate' && (
                      <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'ml-1' : 'ml-1 transform rotate-180'} />
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="font-poppins">
              {currentWallets.map((wallet, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{formatAddress(wallet.address)}</span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Copy size={14} />
                      </button>
                      {wallet.hasAlert && (
                        <AlertCircle size={14} style={{ color: styles.accentColor }} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {formatValueWithSymbol(wallet.totalSent)}
                  </td>
                  <td className="py-3 px-4 text-sm">{wallet.transactions.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm">{wallet.formattedFirstDate}</td>
                  <td className="py-3 px-4 text-sm">{wallet.formattedLastDate}</td>
                  <td className="py-3 px-4 text-sm">
                    <button 
                      className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                      onClick={() => openWalletDetail(wallet)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 text-sm text-gray-500 font-poppins">
          <div className="text-xs">
            Showing {indexOfFirstWallet + 1}-{Math.min(indexOfLastWallet, totalWalletsCount)} of {totalWalletsCount.toLocaleString()} wallets
          </div>
          <div className="flex items-center space-x-1">
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs" 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ color: styles.primaryColor }}
            >
              <ChevronLeft size={12} />
              <span className="ml-1">Previous</span>
            </button>
            
            {pageNumbers.map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2">...</span>
              ) : (
              <button 
                key={page}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs ${currentPage === page ? 'font-medium' : 'hover:bg-gray-50'}`}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  style={{ 
                    backgroundColor: currentPage === page ? `${styles.primaryColor}10` : '',
                    color: currentPage === page ? styles.primaryColor : ''
                  }}
              >
                {page}
              </button>
              )
            ))}
            
            <button 
              className="flex items-center border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ color: styles.primaryColor }}
            >
              <span className="mr-1">Next</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
      
      {/* No wallets message if empty */}
      {walletsData.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-1 text-gray-700">No Wallet Data Available</h3>
          <p className="text-gray-500 text-sm">
            {selectedContract 
              ? 'There are no transactions for this contract yet, or the data is still loading.'
              : 'Please select a smart contract to view wallet insights.'}
          </p>
        </div>
      )}
    </div>
  );
}