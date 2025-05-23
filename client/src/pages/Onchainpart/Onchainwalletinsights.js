import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Copy, AlertCircle, Loader2, ArrowUp, ArrowDown, X, ExternalLink, ChevronDown } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function Onchainwalletinsights() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWalletDetail, setActiveWalletDetail] = useState(null);
  const [walletsData, setWalletsData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'transactions', direction: 'desc' });
  
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
      
      Object.values(contractTransactions).forEach(tx => {
        if (!tx || !tx.fromAddress) return;
        
        // Process sender wallet
        const fromWallet = tx.fromAddress;
        if (!walletMap.has(fromWallet)) {
          walletMap.set(fromWallet, {
            address: fromWallet,
            totalSent: 0,
            totalReceived: 0,
            transactions: 0,
            firstDate: tx.timestamp,
            lastDate: tx.timestamp,
            allTransactions: [],
          });
        }
        
        const walletData = walletMap.get(fromWallet);
        walletData.transactions += 1;
        walletData.totalSent += parseFloat(tx.value) || 0;
        
        // Update first and last transaction dates
        if (new Date(tx.timestamp) < new Date(walletData.firstDate)) {
          walletData.firstDate = tx.timestamp;
        }
        if (new Date(tx.timestamp) > new Date(walletData.lastDate)) {
          walletData.lastDate = tx.timestamp;
        }
        
        // Keep track of all transactions
        walletData.allTransactions.push({
          hash: tx.hash,
          timestamp: tx.timestamp,
          amount: parseFloat(tx.value) || 0,
          type: 'outgoing',
          to: tx.toAddress
        });
        
        // Also process receiver wallet if different from sender
        if (tx.toAddress && tx.toAddress !== fromWallet) {
          if (!walletMap.has(tx.toAddress)) {
            walletMap.set(tx.toAddress, {
              address: tx.toAddress,
              totalSent: 0,
              totalReceived: 0, 
              transactions: 0,
              firstDate: tx.timestamp,
              lastDate: tx.timestamp,
              allTransactions: [],
            });
          }
          
          const recipientData = walletMap.get(tx.toAddress);
          recipientData.transactions += 1;
          recipientData.totalReceived += parseFloat(tx.value) || 0;
          
          // Update first and last transaction dates
          if (new Date(tx.timestamp) < new Date(recipientData.firstDate)) {
            recipientData.firstDate = tx.timestamp;
          }
          if (new Date(tx.timestamp) > new Date(recipientData.lastDate)) {
            recipientData.lastDate = tx.timestamp;
          }
          
          // Keep track of all transactions
          recipientData.allTransactions.push({
            hash: tx.hash,
            timestamp: tx.timestamp,
            amount: parseFloat(tx.value) || 0,
            type: 'incoming',
            from: fromWallet
          });
        }
      });
      
      // Convert Map to array and sort by number of transactions (most active first)
      const processedWallets = Array.from(walletMap.values()).map(wallet => ({
        ...wallet,
        netAmount: wallet.totalReceived - wallet.totalSent,
        formattedFirstDate: formatDate(wallet.firstDate),
        formattedLastDate: formatDate(wallet.lastDate),
        // Add risk flag for wallets with unusual patterns (for demo)
        hasAlert: wallet.transactions > 150 || (wallet.totalSent > 1000 && wallet.totalReceived < 10)
      }));
      
      // Sort wallets based on the current sort configuration
      const sortedWallets = sortWallets(processedWallets);
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
  
  // Calculate wallet metrics for the detail view
  const calculateWalletMetrics = (wallet) => {
    if (!wallet || !wallet.allTransactions) return null;
    
    // Organize transactions by month
    const monthlyData = {};
    wallet.allTransactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          inflow: 0,
          outflow: 0,
          transactions: 0
        };
      }
      
      if (tx.type === 'incoming') {
        monthlyData[monthKey].inflow += tx.amount;
      } else {
        monthlyData[monthKey].outflow += tx.amount;
      }
      
      monthlyData[monthKey].transactions += 1;
    });
    
    // Convert to array and sort by date
    const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate total volume (sum of inflow and outflow)
    const totalVolume = wallet.totalSent + wallet.totalReceived;
    
    return {
      totalTransactions: wallet.transactions,
      firstTransaction: wallet.formattedFirstDate,
      lastTransaction: wallet.formattedLastDate,
      totalInflow: wallet.totalReceived,
      totalOutflow: wallet.totalSent,
      netAmount: wallet.netAmount,
      activityChart: chartData,
      totalVolume
    };
  };
  
  const openWalletDetail = (wallet) => {
    setActiveWalletDetail(wallet);
  };
  
  const closeWalletDetail = () => {
    setActiveWalletDetail(null);
  };

  const totalWalletsCount = walletsData.length;
  const walletsPerPage = 50;
  const totalPages = Math.ceil(totalWalletsCount / walletsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Automatically scroll to the top of the table when changing pages
    window.scrollTo(0, 0);
  };
  
  // Get current page wallets
  const indexOfLastWallet = currentPage * walletsPerPage;
  const indexOfFirstWallet = indexOfLastWallet - walletsPerPage;
  const currentWallets = walletsData.slice(indexOfFirstWallet, indexOfLastWallet);
  
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

      {/* Wallet detail view (modal) */}
      {activeWalletDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
                  Wallet Details
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-poppins">{activeWalletDetail.address}</p>
                  <button className="text-gray-400 hover:text-gray-600">
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
            
            {/* Wallet metrics */}
            {(() => {
              const metrics = calculateWalletMetrics(activeWalletDetail);
              if (!metrics) return <div className="p-4">No data available</div>;
              
              return (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Total Transactions</p>
                      <p className="text-xl font-semibold font-montserrat">{metrics.totalTransactions}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">First Transaction</p>
                      <p className="text-sm font-semibold font-montserrat">{metrics.firstTransaction}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Last Transaction</p>
                      <p className="text-sm font-semibold font-montserrat">{metrics.lastTransaction}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Total Volume</p>
                      <p className="text-sm font-semibold font-montserrat">
                        {formatValueWithSymbol(metrics.totalVolume)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Total Tokens Received</p>
                      <p className="text-xl font-semibold text-green-600 font-montserrat">
                        {formatValueWithSymbol(metrics.totalInflow)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Total Tokens Spent</p>
                      <p className="text-xl font-semibold text-red-600 font-montserrat">
                        {formatValueWithSymbol(metrics.totalOutflow)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 font-poppins">Net Amount</p>
                      <p className={`text-xl font-semibold font-montserrat ${metrics.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatValueWithSymbol(metrics.netAmount)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Activity Chart */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-md mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Activity Over Time</h3>
                    <div className="bg-white border border-gray-100 rounded-lg p-4" style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.activityChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                              return [formatValueWithSymbol(value), name === 'inflow' ? 'Received' : 'Spent'];
                            }}
                            labelFormatter={(label) => {
                              const [year, month] = label.split('-');
                              const date = new Date(parseInt(year), parseInt(month) - 1);
                              return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            }}
                          />
                          <Bar dataKey="inflow" name="Inflow" fill={styles.primaryColor} />
                          <Bar dataKey="outflow" name="Outflow" fill={styles.accentColor} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Transaction History */}
                  <div>
                    <h3 className="font-semibold text-md mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Transaction History</h3>
                    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                      <div className="max-h-[500px] overflow-y-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Transaction Hash</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Date</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Type</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">From/To</th>
                              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider font-montserrat">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="font-poppins">
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
              );
            })()}
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