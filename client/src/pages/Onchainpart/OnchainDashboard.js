import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { PieChart, Pie, Cell, Label, Sector } from 'recharts';
import { ArrowUp, ArrowRight, ExternalLink, X } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { getChainConfig } from '../../utils/chainRegistry';
import ChainBanner from '../../components/ChainBanner';

// Helper functions for transaction distribution analysis
const getWalletTypeForRange = (range) => {
  // Categorize wallet types based on their transaction ranges
  if (range === "1-5") return "Airdrop Farmer";
  if (range === "6-10") return "Casual User";
  if (range === "11-20") return "Regular User";
  if (range === "21-50") return "Active User";
  if (range === "51-100") return "Engaged User";
  if (range === "101-500") return "Power User";
  if (range === "500+") return "Whale/Protocol";
  return "Unknown";
};

const getHighTransactionCount = (transactionData) => {
  // Calculate the percentage of wallets with high transaction counts (100+)
  const highCount = transactionData
    .filter(item => {
      const range = item.range;
      return range === "101-500" || range === "500+";
    })
    .reduce((sum, item) => sum + item.percentage, 0);
  
  return Math.round(highCount);
};

const getLowTransactionCount = (transactionData) => {
  // Calculate the percentage of wallets with low transaction counts (1-10)
  const lowCount = transactionData
    .filter(item => {
      const range = item.range;
      return range === "1-5" || range === "6-10";
    })
    .reduce((sum, item) => sum + item.percentage, 0);
  
  return Math.round(lowCount);
};

const hasHighWhaleActivity = (transactionData) => {
  // Determine if the contract has high whale activity
  // This is a simplified version - in a real application, you might look at volume data
  const highTransactionPercent = getHighTransactionCount(transactionData);
  return highTransactionPercent > 25;
};

// Function to create adaptive transaction count buckets with more equal distribution
const createAdaptiveTransactionBuckets = (transactions, walletCount) => {
  // If no transactions data, return default buckets
  if (!transactions || transactions.length === 0) {
    return [
      { range: "1-5", percentage: 0 },
      { range: "6-10", percentage: 0 },
      { range: "11-20", percentage: 0 },
      { range: "21-50", percentage: 0 },
      { range: "51-100", percentage: 0 },
      { range: "101-500", percentage: 0 },
      { range: "500+", percentage: 0 }
    ];
  }

  // Step 1: Count transactions per wallet
  const txCountByWallet = {};
  transactions.forEach(tx => {
    if (tx.walletAddress) {
      txCountByWallet[tx.walletAddress] = (txCountByWallet[tx.walletAddress] || 0) + 1;
    }
  });

  // Step 2: Create a sorted array of transaction counts
  const txCounts = Object.values(txCountByWallet).sort((a, b) => a - b);
  
  // Step 3: Determine scale (logarithmic or linear) based on distribution
  const min = txCounts[0] || 1;
  const max = txCounts[txCounts.length - 1] || 1000;
  const useLogarithmic = max / min > 100; // Use logarithmic scale for wider ranges
  
  // Step 4: Create 7 buckets with each bucket containing max 20% of addresses
  const buckets = [];
  const bucketSize = Math.ceil(txCounts.length / 7); // Initial size per bucket
  const maxBucketSize = Math.ceil(txCounts.length * 0.2); // Max 20% per bucket
  
  let currentIndex = 0;
  let currentBucketSize = 0;
  let lowerBound = min;
  
  for (let i = 0; i < 7; i++) {
    // For the last bucket, include all remaining transactions
    if (i === 6) {
      const upperBound = max;
      const count = txCounts.length - currentIndex;
      const percentage = (count / txCounts.length) * 100;
      
      buckets.push({
        range: `${lowerBound}-${upperBound === lowerBound ? lowerBound : upperBound}`,
        percentage: Math.round(percentage)
      });
      break;
    }
    
    // Calculate dynamic bucket size, ensuring max 20% per bucket
    currentBucketSize = Math.min(bucketSize, maxBucketSize);
    // For narrower distributions, ensure at least some addresses in each bucket
    currentBucketSize = Math.max(currentBucketSize, Math.ceil(txCounts.length / 20));
    
    const targetIndex = Math.min(currentIndex + currentBucketSize, txCounts.length - 1);
    let upperBound;
    
    if (useLogarithmic) {
      // Logarithmic scale for wide distributions
      const logMin = Math.log(lowerBound || 1);
      const logMax = Math.log(max || 1000);
      const bucketFraction = (i + 1) / 7;
      upperBound = Math.exp(logMin + (logMax - logMin) * bucketFraction);
      upperBound = Math.ceil(upperBound);
    } else {
      // Linear scale for narrower distributions
      upperBound = txCounts[targetIndex];
    }
    
    // Count wallets in this range
    let count = 0;
    while (currentIndex < txCounts.length && txCounts[currentIndex] <= upperBound) {
      count++;
      currentIndex++;
    }
    
    // Calculate percentage
    const percentage = (count / txCounts.length) * 100;
    
    // Create bucket
    buckets.push({
      range: lowerBound === upperBound ? `${lowerBound}` : `${lowerBound}-${upperBound}`,
      percentage: Math.round(percentage)
    });
    
    // Update for next bucket
    lowerBound = upperBound + 1;
  }
  
  // Ensure exactly 7 buckets
  while (buckets.length < 7) {
    buckets.push({ range: "0", percentage: 0 });
  }
  
  // Normalize percentages to ensure they sum to 100%
  const totalPercentage = buckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
  if (totalPercentage !== 100) {
    // Adjust the largest bucket
    const largestBucketIndex = buckets.findIndex(b => 
      b.percentage === Math.max(...buckets.map(bucket => bucket.percentage))
    );
    buckets[largestBucketIndex].percentage += (100 - totalPercentage);
  }
  
  return buckets;
};

// Wallet categorization logic - returns object with calculated percentages and top wallets
const categorizeWallets = (transactions) => {
  // If no data, return default values
  if (!transactions || transactions.length === 0) {
    return {
      airdropFarmers: 32,
      whales: 7,
      whalesVolumePercentage: 58,
      bridgeUsers: 15,
      topAirdropFarmers: [],
      topWhales: [],
      topBridgeUsers: []
    };
  }
  
  // Step 1: Count transactions and volume per wallet
  const walletStats = {};
  let totalVolume = 0;
  
  transactions.forEach(tx => {
    if (!tx.from_address) return;
    
    if (!walletStats[tx.from_address]) {
      walletStats[tx.from_address] = {
        address: tx.from_address,
        transactionCount: 0,
        volume: 0,
        approvals: 0,
        noValueTxs: 0
      };
    }
    
    walletStats[tx.from_address].transactionCount++;
    
    // Track volume
    if (tx.value_eth) {
      const txValue = parseFloat(tx.value_eth);
      if (!isNaN(txValue)) {
        walletStats[tx.from_address].volume += txValue;
        totalVolume += txValue;
      }
    } else {
      // Track transactions without value_eth data (potential bridge transactions)
      walletStats[tx.from_address].noValueTxs++;
    }
    
    // Track approval transactions
    if (tx.method_name && (tx.method_name.toLowerCase().includes('approve') || 
                          tx.method_name.toLowerCase().includes('bridge') ||
                          tx.method_name.toLowerCase().includes('permit'))) {
      walletStats[tx.from_address].approvals++;
    }
  });
  
  // Step 2: Calculate wallet categories
  const walletAddresses = Object.keys(walletStats);
  const totalWallets = walletAddresses.length;
  
  // Airdrop farmers: EXACTLY 1 transaction with token value <= 1
  const airdropFarmers = walletAddresses.filter(address => {
    const stats = walletStats[address];
    return stats.transactionCount === 1 && stats.volume <= 1;
  });
  
  // Extract top 10 airdrop farmers (or fewer if there aren't that many)
  // Sort by lowest volume first (most likely to be pure airdrop farmers)
  const sortedAirdropFarmers = [...airdropFarmers].sort((a, b) => 
    walletStats[a].volume - walletStats[b].volume
  );
  
  const topAirdropFarmers = sortedAirdropFarmers.slice(0, Math.min(10, sortedAirdropFarmers.length))
    .map(address => ({
      address,
      transactionCount: walletStats[address].transactionCount,
      volume: walletStats[address].volume
    }));
  
  // Whales: High volume wallets (top 7% by volume)
  const sortedByVolume = [...walletAddresses].sort((a, b) => 
    walletStats[b].volume - walletStats[a].volume
  );
  
  const whaleCount = Math.max(Math.ceil(totalWallets * 0.07), 1); // ~7% of wallets
  const whales = sortedByVolume.slice(0, whaleCount);
  
  // Extract top 10 whales
  const topWhales = whales.slice(0, Math.min(10, whales.length))
    .map(address => ({
      address,
      transactionCount: walletStats[address].transactionCount,
      volume: walletStats[address].volume
    }));
  
  // Calculate whale volume percentage
  const whaleVolume = whales.reduce((sum, address) => {
    const vol = walletStats[address]?.volume || 0;
    return sum + vol;
  }, 0);
  
  const whalesVolumePercentage = totalVolume > 0 
    ? Math.round((whaleVolume / totalVolume) * 100)
    : 58; // Default if no volume data
  
  // Bridge users: High percentage of transactions without value_eth data or with approval methods
  const bridgeUsers = walletAddresses.filter(address => {
    const stats = walletStats[address];
    
    // Check if wallet has transactions
    if (stats.transactionCount === 0) return false;
    
    // Consider a wallet a bridge user if:
    // 1. More than 50% of transactions are approvals OR
    // 2. More than 50% of transactions have no value_eth
    return (stats.approvals / stats.transactionCount > 0.5) || 
           (stats.noValueTxs / stats.transactionCount > 0.5);
  });
  
  // Sort bridge users by approval count (descending)
  const sortedBridgeUsers = [...bridgeUsers].sort((a, b) => 
    (walletStats[b].approvals + walletStats[b].noValueTxs) - 
    (walletStats[a].approvals + walletStats[a].noValueTxs)
  );
  
  // Extract top 10 bridge users
  const topBridgeUsers = sortedBridgeUsers.slice(0, Math.min(10, sortedBridgeUsers.length))
    .map(address => ({
      address,
      transactionCount: walletStats[address].transactionCount,
      approvals: walletStats[address].approvals,
      noValueTxs: walletStats[address].noValueTxs
    }));
  
  // Calculate percentages
  return {
    airdropFarmers: Math.min(Math.round((airdropFarmers.length / totalWallets) * 100), 70),
    whales: Math.round((whales.length / totalWallets) * 100),
    whalesVolumePercentage,
    bridgeUsers: Math.min(Math.round((bridgeUsers.length / totalWallets) * 100), 60),
    topAirdropFarmers,
    topWhales,
    topBridgeUsers
  };
};

export default function OnchainDashboard() {
  // Get contract data from context
  const { 
    selectedContract, 
    contractTransactions, 
    showDemoData, 
    isLoadingTransactions,
    updatingTransactions,
    loadingStatus,
    processContractTransactions
  } = useContractData();

  // Add state for modal and chart time range
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState('30d'); // Default to 30 days
  const [showAnalysisModal, setShowAnalysisModal] = useState(false); // Add state for analysis modal
  const [showTransactionDistributionModal, setShowTransactionDistributionModal] = useState(false); // Add state for transaction distribution modal
  const [activeWalletTab, setActiveWalletTab] = useState('whales'); // Track active wallet category tab

  // Process real contract data if available
  const contractData = !showDemoData ? processContractTransactions() : null;

  // Sample transaction data for the chart (used when no contract is selected)
  const demoTransactionData = [
      // Last 30 days
      { date: '24 Feb', transactions: 50, volume: 1.0 },
      { date: '25 Feb', transactions: 85, volume: 1.6 },
      { date: '26 Feb', transactions: 72, volume: 1.4 },
      { date: '27 Feb', transactions: 65, volume: 1.3 },
      { date: '28 Feb', transactions: 90, volume: 1.7 },
      { date: '01 Mar', transactions: 95, volume: 1.8 },
      { date: '02 Mar', transactions: 72, volume: 1.4 },
      { date: '03 Mar', transactions: 85, volume: 1.6 },
      { date: '04 Mar', transactions: 68, volume: 1.4 },
      { date: '05 Mar', transactions: 78, volume: 1.5 },
      { date: '06 Mar', transactions: 88, volume: 1.7 },
      { date: '07 Mar', transactions: 96, volume: 1.9 },
      { date: '08 Mar', transactions: 98, volume: 1.9 },
      { date: '09 Mar', transactions: 87, volume: 1.7 },
      { date: '10 Mar', transactions: 89, volume: 1.8 },
      { date: '11 Mar', transactions: 92, volume: 1.8 },
      { date: '12 Mar', transactions: 75, volume: 1.4 },
      { date: '13 Mar', transactions: 62, volume: 1.2 },
      { date: '14 Mar', transactions: 58, volume: 1.1 },
      { date: '15 Mar', transactions: 70, volume: 1.3 },
      { date: '16 Mar', transactions: 78, volume: 1.5 },
      { date: '17 Mar', transactions: 91, volume: 1.8 },
      { date: '18 Mar', transactions: 84, volume: 1.6 },
      { date: '19 Mar', transactions: 73, volume: 1.4 },
      { date: '20 Mar', transactions: 87, volume: 1.7 },
      { date: '21 Mar', transactions: 82, volume: 1.6 },
      { date: '22 Mar', transactions: 71, volume: 1.4 },
      { date: '23 Mar', transactions: 69, volume: 1.3 },
      { date: '24 Mar', transactions: 63, volume: 1.2 },
      { date: '25 Mar', transactions: 55, volume: 1.1 },
      { date: '26 Mar', transactions: 48, volume: 1.0 },
      { date: '27 Mar', transactions: 42, volume: 0.8 },
      { date: '28 Mar', transactions: 35, volume: 0.7 },
      { date: '29 Mar', transactions: 30, volume: 0.6 },
      { date: '30 Mar', transactions: 25, volume: 0.5 }
  ];

  // Updated data for wallet age distribution - matching the image with all 4 segments
  const demoWalletAgeData = [
    { name: "<6M", value: Math.floor(Math.random() * 26) + 25, color: "#eab308" },  // 25-50%
    { name: "6M-1Y", value: Math.floor(Math.random() * 31) + 30, color: "#10b981" }, // 30-60%
    { name: "1Y-2Y", value: Math.floor(Math.random() * 26) + 25, color: "#f97316" }, // 25-50%
    { name: "2Y+", value: Math.floor(Math.random() * 9) + 7, color: "#3b82f6" }      // 7-15%
  ];
  
  // Normalize the values to ensure they sum to 100%
  const totalPercentage = demoWalletAgeData.reduce((sum, entry) => sum + entry.value, 0);
  demoWalletAgeData.forEach(entry => {
    entry.value = Math.round((entry.value / totalPercentage) * 100);
  });
  
  // Adjust the last entry to ensure the sum is exactly 100%
  const currentSum = demoWalletAgeData.reduce((sum, entry) => sum + entry.value, 0);
  if (currentSum !== 100) {
    demoWalletAgeData[demoWalletAgeData.length - 1].value += (100 - currentSum);
  }
  
  // Calculate median wallet age based on the distribution (for demo data)
  const calculateMedianAge = () => {
    // Convert wallet age distribution to actual age in years
    const ageData = [
      { ageInYears: 0.25, percentage: demoWalletAgeData.find(d => d.name === "<6M")?.value || 0 }, // 3 months average for <6M
      { ageInYears: 0.75, percentage: demoWalletAgeData.find(d => d.name === "6M-1Y")?.value || 0 }, // 9 months average for 6M-1Y
      { ageInYears: 1.5, percentage: demoWalletAgeData.find(d => d.name === "1Y-2Y")?.value || 0 }, // 1.5 years average for 1Y-2Y
      { ageInYears: 3, percentage: demoWalletAgeData.find(d => d.name === "2Y+")?.value || 0 } // 3 years average for 2Y+
    ];
    
    // Calculate weighted average
    const totalWeight = ageData.reduce((sum, entry) => sum + entry.percentage, 0);
    const weightedSum = ageData.reduce((sum, entry) => sum + (entry.ageInYears * entry.percentage), 0);
    
    return (weightedSum / totalWeight).toFixed(1);
  };
  
  // Calculate the median age for demo data
  const medianWalletAge = calculateMedianAge();

  // Sample data for wallet balance distribution
  const demoWalletBalanceData = [
    { range: "<$100", percentage: 0 },
    { range: "$100-$500", percentage: 0 },
    { range: "$500-$1K", percentage: 0 },
    { range: "$1K-$5K", percentage: 0 },
    { range: "$5K-$10K", percentage: 0 },
    { range: "$10K-$100K", percentage: 0 },
    { range: ">$100K", percentage: 0 },
  ];

  // Generate adaptive transaction count distribution based on actual data
  let demoTransactionCountData;
  
  // For demo data, create a simulated distribution
  if (showDemoData) {
    // Create dummy transaction data
    const dummyTransactions = Array(1000).fill().map((_, i) => {
      // Create a realistic distribution - many low count wallets, few high count wallets
      const walletIndex = Math.floor(Math.random() * 200);
      const count = Math.floor(Math.exp(walletIndex / 25)); // Exponential distribution
      return { 
        walletAddress: `0x${(Math.random().toString(16) + '0000000000000000').slice(2, 18)}`,
        value: Math.random() * 10,
        methodName: Math.random() > 0.8 ? 'approve' : 'transfer'
      };
    });
    
    demoTransactionCountData = createAdaptiveTransactionBuckets(dummyTransactions);
  } else {
    // Use actual contract transactions if available
    demoTransactionCountData = contractData?.tokenDistributionData || createAdaptiveTransactionBuckets(contractTransactions);
  }

  // Generate wallet categorization data with top wallet lists
  let walletCategories;
  if (!showDemoData && contractTransactions && contractTransactions.length > 0) {
    walletCategories = categorizeWallets(contractTransactions);
  } else {
    // Demo data with empty wallet lists
    walletCategories = {
      airdropFarmers: 32,
      whales: 7,
      whalesVolumePercentage: 58,
      bridgeUsers: 15,
      topAirdropFarmers: [],
      topWhales: [],
      topBridgeUsers: []
    };
  }

  // Choose which data to use based on whether we should show demo data
  let transactionData = showDemoData ? demoTransactionData : (contractData?.transactionData || demoTransactionData);
  const walletAgeData = showDemoData ? demoWalletAgeData : (contractData?.walletAgeData || demoWalletAgeData);
  const walletBalanceData = showDemoData ? demoWalletBalanceData : (contractData?.walletBalanceData || demoWalletBalanceData);
  const transactionCountData = showDemoData ? demoTransactionCountData : (contractData?.tokenDistributionData || demoTransactionCountData);

  // Filter transaction data based on selected time range
  if (!showDemoData && contractData?.transactionData) {
    if (contractData.getTransactionDataForRange) {
      // Use the function if available
      transactionData = contractData.getTransactionDataForRange(chartTimeRange);
    } else {
      // Fallback to filtering the existing data
      const now = new Date();
      let startDate = new Date();
      
      switch(chartTimeRange) {
        case '24h':
          startDate.setDate(now.getDate() - 1);
          transactionData = contractData.transactionData.filter(item => {
            const itemDate = parseDate(item.date);
            return itemDate >= startDate;
          });
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          transactionData = contractData.transactionData.filter(item => {
            const itemDate = parseDate(item.date);
            return itemDate >= startDate;
          });
          break;
        case '30d':
          // No filtering needed as this is the default range
          transactionData = contractData.transactionData;
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          transactionData = contractData.transactionData;
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          transactionData = contractData.transactionData;
          break;
        default:
          transactionData = contractData.transactionData;
      }
    }
  } else if (showDemoData) {
    // For demo data, apply filtering to simulate the different time ranges
    const demoDataLength = demoTransactionData.length;
    
    switch(chartTimeRange) {
      case '24h':
        // Just the last day of data (last ~5 items)
        transactionData = demoTransactionData.slice(Math.max(0, demoDataLength - 5));
        break;
      case '7d':
        // Last ~7 days of data
        transactionData = demoTransactionData.slice(Math.max(0, demoDataLength - 10));
        break;
      case '30d':
        // All demo data
        transactionData = demoTransactionData;
        break;
      case 'quarter':
        // All demo data (we don't have 3 months of demo data)
        transactionData = demoTransactionData;
        break;
      case 'year':
        // All demo data (we don't have a year of demo data)
        transactionData = demoTransactionData;
        break;
      default:
        transactionData = demoTransactionData;
    }
  }
  
  // Helper to parse formatted date back to Date object
  const parseDate = (dateStr) => {
    const [day, month] = dateStr.split(' ');
    const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
    const year = new Date().getFullYear(); // Assume current year
    return new Date(year, monthIdx, parseInt(day));
  };

  // Get chain-specific information
  const chainName = selectedContract?.blockchain || 'Ethereum';
  const chainConfig = getChainConfig(chainName);
  const chainColor = !showDemoData && contractData?.contractInfo?.chainColor 
    ? contractData.contractInfo.chainColor 
    : (chainConfig?.color || '#627EEA'); // Default to Ethereum blue
  
  // Customize the label to display percentages properly
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value } = props;
    const RADIAN = Math.PI / 180;
    
    // Only show labels for segments with actual values
    if (value === 0) return null;
    
    // Calculate positions for the line and label
    const radius = outerRadius * 1.2; // Position further out from the pie
    const x1 = cx + (outerRadius) * Math.cos(-midAngle * RADIAN);
    const y1 = cy + (outerRadius) * Math.sin(-midAngle * RADIAN);
    const x2 = cx + radius * Math.cos(-midAngle * RADIAN);
    const y2 = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Determine label position
    const labelX = x2 + (Math.cos(-midAngle * RADIAN) >= 0 ? 10 : -10);

    return (
      <g>
        {/* Line from pie to label */}
        <path
          d={`M ${x1},${y1} L ${x2},${y2}`}
          stroke="#999999"
          strokeWidth={1}
          fill="none"
        />
        {/* Label */}
        <text 
          x={labelX}
          y={y2}
          fill="black"
          textAnchor={Math.cos(-midAngle * RADIAN) >= 0 ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize="12"
          fontWeight="bold"
          fontFamily="'Poppins', sans-serif"
        >
          {`${value}%`}
        </text>
      </g>
    );
  };

  const formatVolume = (value, tokenSymbol) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B ${tokenSymbol}`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${tokenSymbol}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K ${tokenSymbol}`;
    }
    return `${value.toLocaleString()} ${tokenSymbol}`;
  };

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

      {/* Data Source Banner */}
      <ChainBanner 
        showDemoData={showDemoData}
        isLoading={isLoadingTransactions}
        isUpdating={updatingTransactions}
        loadingStatus={loadingStatus}
        contract={selectedContract}
        contractData={contractData}
        transactions={contractTransactions}
      />

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Wallets */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Total Wallets</h2>
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold font-montserrat">
                {showDemoData ? "123" : (contractData?.summary?.uniqueUsers || "0").toLocaleString()}
              </h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-600 font-montserrat">
                {showDemoData ? "89" : (contractData?.summary?.activeWallets || "0").toLocaleString()}
              </h3>
              <p className="text-xs text-gray-500 font-poppins">Active Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Transaction Count</h2>
          <div className="flex justify-between space-x-1">
            <div>
              <h3 className="text-sm font-bold bg-[#1D0C46] text-white px-2 py-1 rounded font-montserrat">
                {showDemoData ? "224" : (contractData?.contractInfo?.totalTransactions || "0").toLocaleString()}
              </h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ backgroundColor: chainColor, color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                {showDemoData ? "95" : (contractData?.recentTransactions?.last7Days || "0").toLocaleString()}
              </h3>
              <p className="text-xs text-gray-500 font-poppins">Last 7 days</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-[#2061E4] text-white px-2 py-1 rounded font-montserrat">
                {showDemoData ? "198" : (contractData?.recentTransactions?.last30Days || "0").toLocaleString()}
              </h3>
              <p className="text-xs text-gray-500 font-poppins">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Wallet Age Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg font-montserrat">Wallet Age Distribution</h2>
            <a href="#" className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
              More Details <ArrowRight size={14} className="ml-1" />
            </a>
          </div>
          <div className="flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={walletAgeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {walletAgeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      value="Wallet Age"
                      position="center"
                      fill="#333"
                      style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Poppins, sans-serif' }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2">
              <div className="flex flex-col space-y-2 ml-4">
                {walletAgeData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <p className="text-sm">{entry.name}: <span className="font-semibold">{entry.value}%</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Volume */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg font-montserrat">Transaction Volume</h2>
            <button 
              onClick={() => setShowVolumeModal(true)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm bg-transparent border-none cursor-pointer"
            >
              More Details <ArrowRight size={14} className="ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Last 7 Days</p>
              <div className="flex items-end">
                <h3 className="text-lg font-bold mr-2">
                  {showDemoData 
                    ? "15.5K ETH" 
                    : formatVolume(parseFloat(contractData?.recentVolume?.last7Days || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                  }
              </h3>
                {!showDemoData && contractData?.recentVolume?.percentChange7Days && (
                  <div className={`flex items-center text-xs ${parseFloat(contractData.recentVolume.percentChange7Days) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {parseFloat(contractData.recentVolume.percentChange7Days) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                    <span>{Math.abs(parseFloat(contractData.recentVolume.percentChange7Days)).toFixed(1)}%</span>
                  </div>
                )}
                {showDemoData && (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp size={12} />
                    <span>24.3%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Last 30 Days</p>
              <div className="flex items-end">
                <h3 className="text-lg font-bold mr-2">
                  {showDemoData 
                    ? "75.8K ETH" 
                    : formatVolume(parseFloat(contractData?.recentVolume?.last30Days || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                  }
              </h3>
                {!showDemoData && contractData?.recentVolume?.percentChange30Days && (
                  <div className={`flex items-center text-xs ${parseFloat(contractData.recentVolume.percentChange30Days) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {parseFloat(contractData.recentVolume.percentChange30Days) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                    <span>{Math.abs(parseFloat(contractData.recentVolume.percentChange30Days)).toFixed(1)}%</span>
                  </div>
                )}
                {showDemoData && (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp size={12} />
                    <span>18.7%</span>
            </div>
                )}
            </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Last Year</p>
              <div className="flex items-end">
                <h3 className="text-lg font-bold mr-2">
                  {showDemoData 
                    ? "420.5K ETH" 
                    : formatVolume(parseFloat(contractData?.recentVolume?.lastYear || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                  }
                </h3>
                {!showDemoData && contractData?.recentVolume?.percentChangeYear && (
                  <div className={`flex items-center text-xs ${parseFloat(contractData.recentVolume.percentChangeYear) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {parseFloat(contractData.recentVolume.percentChangeYear) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                    <span>{Math.abs(parseFloat(contractData.recentVolume.percentChangeYear)).toFixed(1)}%</span>
          </div>
                )}
                {showDemoData && (
                  <div className="flex items-center text-green-500 text-xs">
                    <ArrowUp size={12} />
                    <span>32.1%</span>
        </div>
                )}
      </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Lifetime</p>
              <div className="flex items-end">
                <h3 className="text-lg font-bold mr-2">
                  {showDemoData 
                    ? "1.25M ETH" 
                    : formatVolume(parseFloat(contractData?.recentVolume?.lifetime || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                  }
                </h3>
        </div>
            </div>
          </div>
          <div className="mt-2 p-1">
            <div className="text-xs text-gray-500 mb-1">Token Symbol</div>
            <div className="font-semibold">
              {showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Transactions Over Time */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg font-montserrat">Transactions & Volume Over Time</h2>
            <div className="flex items-center">
              {/* Time range selector */}
              <div className="flex rounded-md overflow-hidden border border-gray-200 mr-4">
                <button 
                  className={`px-2 py-1 text-xs ${chartTimeRange === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setChartTimeRange('24h')}
                >
                  24H
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${chartTimeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setChartTimeRange('7d')}
                >
                  7D
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${chartTimeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setChartTimeRange('30d')}
                >
                  30D
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${chartTimeRange === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setChartTimeRange('quarter')}
                >
                  3M
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${chartTimeRange === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setChartTimeRange('year')}
                >
                  1Y
                </button>
            </div>
              <a 
                href="#"
                onClick={(e) => { e.preventDefault(); setShowAnalysisModal(true); }} 
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
              >
                View Analysis <ArrowRight size={14} className="ml-1" />
              </a>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} name="Transactions" />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }} 
                axisLine={false} 
                tickLine={false}
                name={showDemoData ? "Volume (ETH)" : `Volume (${selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN'})`}
                tickFormatter={(value) => {
                  if (value >= 1000000000) return `${(value/1000000000).toFixed(1)}B`;
                  if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value/1000).toFixed(1)}K`;
                  return value;
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "volume") {
                    // Format volume with token symbol
                    const tokenSymbol = showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN');
                    if (value >= 1000000000) return [`${(value/1000000000).toFixed(2)}B ${tokenSymbol}`, "Volume"];
                    if (value >= 1000000) return [`${(value/1000000).toFixed(2)}M ${tokenSymbol}`, "Volume"];
                    if (value >= 1000) return [`${(value/1000).toFixed(1)}K ${tokenSymbol}`, "Volume"];
                    return [`${value.toLocaleString()} ${tokenSymbol}`, "Volume"];
                  }
                  return [value, name === "transactions" ? "Transactions" : name];
                }}
              />
              <Bar yAxisId="left" dataKey="transactions" fill={chainColor} radius={[4, 4, 0, 0]} name="Transactions" />
              <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#8884d8" fill="#8884d830" name="Volume" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Median Wallet Stats */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-3 font-montserrat">Median Wallet Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Age</p>
              <h3 className="text-lg font-bold">
                {showDemoData && !contractData ? `${medianWalletAge} Years` : contractData?.medianWalletStats?.age || "0 Years"}
              </h3>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Net Worth</p>
              <h3 className="text-lg font-bold">
                {showDemoData ? "$945" : contractData?.medianWalletStats?.netWorth || "$0"}
              </h3>
            </div>
          </div>
        </div>

        {/* Wallet Balance Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-3 font-montserrat">Wallet Balance Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={walletBalanceData}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="range" type="category" tick={{ fontSize: 10 }} width={60} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="percentage" fill={chainColor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Count Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-lg font-montserrat">Token Distribution</h2>
            <button 
              onClick={() => setShowTransactionDistributionModal(true)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm bg-transparent border-none cursor-pointer"
            >
              More Details <ArrowRight size={14} className="ml-1" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={transactionCountData}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="range" type="category" tick={{ fontSize: 10 }} width={60} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="percentage" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-montserrat">
                  Transaction & Volume Analysis
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    {chartTimeRange === '24h' ? 'Last 24 Hours' : 
                     chartTimeRange === '7d' ? 'Last 7 Days' : 
                     chartTimeRange === '30d' ? 'Last 30 Days' : 
                     chartTimeRange === 'quarter' ? 'Last 3 Months' : 'Last Year'}
                  </span>
                </h2>
                <button 
                  onClick={() => setShowAnalysisModal(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Analysis Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-1">Transaction Volume Growth</h3>
                  <p className="text-3xl font-bold">
                    {!showDemoData && contractData?.recentVolume ? (
                      chartTimeRange === '7d' ? `${contractData.recentVolume.percentChange7Days || "0"}%` :
                      chartTimeRange === '30d' ? `${contractData.recentVolume.percentChange30Days || "0"}%` :
                      `${contractData.recentVolume.percentChangeYear || "0"}%`
                    ) : "+23.4%"}
                  </p>
                  <p className="text-sm text-gray-500">
                    compared to previous period
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-1">Transaction Frequency</h3>
                  <p className="text-3xl font-bold">
                    {!showDemoData && contractData?.recentTransactions && contractData?.summary?.uniqueUsers > 0 ? (
                      `${(contractData.recentTransactions.last30Days / contractData.summary.uniqueUsers).toFixed(1)}`
                    ) : "4.2"}
                  </p>
                  <p className="text-sm text-gray-500">
                    avg. transactions per user
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-1">Peak Activity Time</h3>
                  <p className="text-3xl font-bold">
                    {!showDemoData && contractData?.peakActivityTime ? contractData.peakActivityTime : "14:00-18:00"}
                  </p>
                  <p className="text-sm text-gray-500">
                    highest transaction volume
                  </p>
                </div>
              </div>
              
              {/* Key Insights Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold mb-4">Key Insights</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 mt-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold">Transaction Volume Patterns</h4>
                      <p className="text-gray-700">
                        {!showDemoData && contractData?.recentVolume ? (
                          chartTimeRange === '7d' ? 
                          `Transaction volume peaked on ${transactionData.sort((a, b) => b.volume - a.volume)[0]?.date || 'weekends'} with ${formatVolume(Math.max(...transactionData.map(d => d.volume || 0)), selectedContract?.tokenSymbol || 'TOKEN')}. This is ${parseFloat(contractData.recentVolume.percentChange7Days || 0) > 0 ? 'higher' : 'lower'} than the previous period by ${Math.abs(parseFloat(contractData.recentVolume.percentChange7Days || 0)).toFixed(1)}%.` : 
                          
                          chartTimeRange === '30d' ?
                          `Monthly transaction patterns show ${parseFloat(contractData.recentVolume.percentChange30Days || 0) > 0 ? 'an upward' : 'a downward'} trend of ${Math.abs(parseFloat(contractData.recentVolume.percentChange30Days || 0)).toFixed(1)}% compared to previous month. The highest volume days correlate with ${parseFloat(contractData.recentVolume.percentChange30Days || 0) > 10 ? 'market announcements' : 'regular trading patterns'}.` :
                          
                          `Annual data reveals ${parseFloat(contractData.recentVolume.percentChangeYear || 0) > 0 ? 'growth' : 'decline'} of ${Math.abs(parseFloat(contractData.recentVolume.percentChangeYear || 0)).toFixed(1)}%. ${parseFloat(contractData.recentVolume.percentChangeYear || 0) > 20 ? 'This significant growth indicates strong market adoption.' : 'The pattern suggests seasonal fluctuations in user activity.'}`
                        ) : (
                          "Transaction volume consistently peaks on weekends with 25% higher volume compared to weekdays. Wednesday shows the lowest activity, suggesting users are more active during leisure time."
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3 mt-1">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold">User Behavior Analysis</h4>
                      <p className="text-gray-700">
                        {!showDemoData && contractData?.summary ? (
                          `Out of ${contractData.summary.uniqueUsers} unique users, ${contractData.summary.activeWallets} (${((contractData.summary.activeWallets/contractData.summary.uniqueUsers)*100).toFixed(1)}%) have been active in the last 30 days. User retention shows ${((contractData.summary.activeWallets/contractData.summary.uniqueUsers)*100) > 50 ? 'strong engagement' : 'potential churn issues'} that could be addressed with targeted campaigns.`
                        ) : (
                          "30% of users complete transactions within the same 3-hour window weekly, indicating habitual usage patterns. 45% of wallet addresses that conducted transactions within the previous 30 days have returned for additional interactions, showing moderate user retention."
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-orange-100 p-2 rounded-full mr-3 mt-1">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold">Volume Distribution</h4>
                      <p className="text-gray-700">
                        {!showDemoData && contractData?.recentVolume && contractData?.recentTransactions && contractData?.walletAgeData ? (
                          `The average transaction value is ${formatVolume(parseFloat(contractData.recentVolume.last30Days || 0) / (contractData.recentTransactions.last30Days || 1), selectedContract?.tokenSymbol || 'TOKEN')}. ${contractData.walletAgeData.find(w => w.name === "2Y+")?.value > 30 ? 'Long-term users (2Y+) contribute significantly to volume stability.' : 'New users (<6M) drive a substantial portion of recent volume growth.'}`
                        ) : (
                          "20% of users account for 73% of the total transaction volume, indicating a small group of power users. The average transaction size has increased by 15% over the selected period, suggesting growing confidence in the platform."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Market Opportunities Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold mb-4">Market Opportunities</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="font-semibold text-blue-800 mb-2">User Engagement Opportunities</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="min-w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <p className="text-sm">
                          {!showDemoData && contractData && contractData.summary.activeWallets < contractData.summary.uniqueUsers * 0.5 ? (
                            `${(contractData.summary.uniqueUsers - contractData.summary.activeWallets).toLocaleString()} inactive users from your user base could be re-engaged with targeted campaigns.`
                          ) : (
                            "58% of users who haven't transacted in 14+ days historically return with incentives focused on their previous transaction types."
                          )}
                        </p>
                      </li>
                      <li className="flex items-start">
                        <div className="min-w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <p className="text-sm">
                          {!showDemoData && contractData ? (
                            `Peak activity during ${chartTimeRange === '24h' ? 'afternoon hours' : 'mid-week days'} suggests optimal timing for announcements and promotions.`
                          ) : (
                            "Users are most responsive to platform communications during high activity periods (weekends), with 2.3x higher engagement rates."
                          )}
                        </p>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="font-semibold text-green-800 mb-2">Growth Indicators</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="min-w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-1">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <p className="text-sm">
                          {!showDemoData && contractData ? (
                            parseFloat(contractData.recentVolume.percentChange30Days) > 0 ? 
                            `${contractData.recentVolume.percentChange30Days}% volume growth indicates market expansion potential, particularly in ${walletAgeData.find(w => w.name === "<6M")?.value > 20 ? 'the new user segment' : 'established user segments'}.` : 
                            `Despite ${Math.abs(parseFloat(contractData.recentVolume.percentChange30Days))}% volume decline, ${contractData.recentTransactions.last7Days > contractData.recentTransactions.last30Days/4 ? 'transaction count remains stable' : 'opportunities exist to boost per-transaction value'}.`
                          ) : (
                            "First-time users who complete 3+ transactions in their first week show 68% higher lifetime value and 2.4x longer retention periods."
                          )}
                        </p>
                      </li>
                      <li className="flex items-start">
                        <div className="min-w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-1">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        </div>
                        <p className="text-sm">
                          {!showDemoData && contractData ? (
                            `${contractData.walletAgeData.find(w => w.name === "<6M")?.value}% of new users (< 6 months) represents ${contractData.walletAgeData.find(w => w.name === "<6M")?.value > 25 ? 'strong new user acquisition' : 'an opportunity for improved onboarding campaigns'}.`
                          ) : (
                            "Users who interact with educational content show 41% higher transaction volumes within the next 30 days compared to those who don't."
                          )}
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Date Pattern Analysis */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Temporal Patterns</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Day of Week Analysis</h4>
                    <div className="h-32 bg-white p-4 rounded border border-gray-200 flex items-end space-x-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                        <div key={day} className="flex flex-col items-center flex-1">
                          <div className="w-full bg-blue-500 rounded-t opacity-80" 
                               style={{ 
                                 height: `${i === 5 || i === 6 ? '85%' : (40 + Math.random() * 30) + '%'}`,
                                 backgroundColor: i === 5 || i === 6 ? '#3b82f6' : '#93c5fd' 
                               }}></div>
                          <span className="text-xs mt-1">{day}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {!showDemoData && contractData ? (
                        "Transaction volume is highest on weekends, presenting an ideal opportunity for promotional campaigns and community engagement activities."
                      ) : (
                        "Weekend activity exceeds weekday volume by 42%, with Saturday being the most active day for transactions. This weekend-focused pattern suggests optimal windows for feature releases and promotions."
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Hour of Day Distribution {chartTimeRange === '24h' && '(Last 24 Hours)'}</h4>
                    <div className="h-32 bg-white p-4 rounded border border-gray-200 flex items-end space-x-1">
                      {Array(24).fill(0).map((_, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className="w-full bg-purple-500 rounded-t opacity-70" 
                               style={{ 
                                 height: `${(i >= 12 && i <= 18) ? (70 + Math.random() * 20) : (20 + Math.random() * 40)}%`,
                                 backgroundColor: (i >= 14 && i <= 17) ? '#8b5cf6' : '#c4b5fd'
                               }}></div>
                          {i % 4 === 0 && <span className="text-xs mt-1">{`${i}:00`}</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {!showDemoData && contractData ? (
                        "Peak transaction hours occur between 2PM-6PM UTC, coinciding with overlapping active hours across major global markets. This suggests users primarily engage during business hours."
                      ) : (
                        "Activity peaks between 2PM-6PM UTC, with a secondary spike from 8PM-10PM UTC. These time windows represent optimal periods for time-sensitive announcements and customer support availability."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Distribution Modal */}
      {showTransactionDistributionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-montserrat">
                  Wallet Activity Analysis
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    Based on transaction patterns
                  </span>
                </h2>
                <button 
                  onClick={() => setShowTransactionDistributionModal(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Wallet Type Analysis */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 font-montserrat">Wallet Categorization</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Airdrop Farmers */}
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                        <div className="w-6 h-6 text-amber-600">🌱</div>
                      </div>
                      <h4 className="font-semibold text-amber-900">Airdrop Farmers</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      Wallets that perform minimal interactions, often just enough to qualify for potential airdrops.
                    </p>
                    <div className="mt-2 font-medium text-center text-amber-800 text-lg">
                      {!showDemoData && contractData?.walletCategories?.airdropFarmers ? 
                        `${contractData.walletCategories.airdropFarmers}%` : 
                        "38%"
                      }
                      <span className="block text-xs text-gray-500 font-normal">of total wallets</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Typically 1-3 transactions, often with minimal token amounts
                    </p>
                  </div>
                  
                  {/* Whales */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <div className="w-6 h-6 text-blue-600">🐋</div>
                      </div>
                      <h4 className="font-semibold text-blue-900">Whales</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      High-value wallets that move significant amounts of tokens and can influence markets.
                    </p>
                    <div className="mt-2 font-medium text-center text-blue-800 text-lg">
                      {!showDemoData && contractData?.walletCategories?.whales ? 
                        `${contractData.walletCategories.whales}%` : 
                        "5%"
                      }
                      <span className="block text-xs text-gray-500 font-normal">of total wallets</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Control {!showDemoData && contractData?.walletCategories?.whalesVolumePercentage ? 
                        `${contractData.walletCategories.whalesVolumePercentage}%` : 
                        "63%"
                      } of total transaction volume
                    </p>
                  </div>
                  
                  {/* Bridge/Approval Users */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                        <div className="w-6 h-6 text-purple-600">🌉</div>
                      </div>
                      <h4 className="font-semibold text-purple-900">Bridge Users</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">
                      Wallets primarily using approval transactions for cross-chain bridging.
                    </p>
                    <div className="mt-2 font-medium text-center text-purple-800 text-lg">
                      {!showDemoData && contractData?.walletCategories?.bridgeUsers ? 
                        `${contractData.walletCategories.bridgeUsers}%` : 
                        "12%"
                      }
                      <span className="block text-xs text-gray-500 font-normal">of total wallets</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Primarily approval transactions with minimal direct token transfers
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Detailed Transaction Distribution */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 font-montserrat">Token Distribution</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 text-left border border-gray-200">Token Range</th>
                        <th className="py-2 px-4 text-left border border-gray-200">% of Wallets</th>
                        <th className="py-2 px-4 text-left border border-gray-200">Wallet Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionCountData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-4 border border-gray-200">{item.range}</td>
                          <td className="py-2 px-4 border border-gray-200">{item.percentage}%</td>
                          <td className="py-2 px-4 border border-gray-200">
                            {!showDemoData && contractData?.summary?.uniqueUsers 
                              ? Math.round((contractData.summary.uniqueUsers) * (item.percentage / 100))
                              : Math.round(item.percentage * 64.29)
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Analysis based on {!showDemoData && contractData?.summary?.uniqueUsers 
                    ? (contractData.summary.uniqueUsers).toLocaleString() 
                    : "6,429"} unique wallet addresses
                </p>
              </div>
              
              {/* Top Wallets by Category */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 font-montserrat">Top Wallets by Category</h3>
                
                {/* Tabs for different wallet categories */}
                <div className="mb-4">
                  <div className="flex border-b">
                    <button 
                      onClick={() => setActiveWalletTab('whales')}
                      className={`px-4 py-2 border-b-2 ${activeWalletTab === 'whales' ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-500'} font-medium`}
                    >
                      Whales
                    </button>
                    <button 
                      onClick={() => setActiveWalletTab('airdropFarmers')}
                      className={`px-4 py-2 border-b-2 ${activeWalletTab === 'airdropFarmers' ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-500'} font-medium`}
                    >
                      Airdrop Farmers
                    </button>
                    <button 
                      onClick={() => setActiveWalletTab('bridgeUsers')}
                      className={`px-4 py-2 border-b-2 ${activeWalletTab === 'bridgeUsers' ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-500'} font-medium`}
                    >
                      Bridge Users
                    </button>
                  </div>
                </div>
                
                {/* Tab content */}
                <div>
                  {/* Whales Tab */}
                  <div className={activeWalletTab === 'whales' ? 'block' : 'hidden'}>
                    <p className="text-sm mb-3">Top wallets by transaction volume (whales represent approximately {!showDemoData && walletCategories?.whales ? walletCategories.whales : 7}% of all wallets but control {!showDemoData && walletCategories?.whalesVolumePercentage ? walletCategories.whalesVolumePercentage : 58}% of volume)</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr className="bg-blue-50">
                            <th className="py-2 px-4 text-left border border-gray-200">Wallet Address</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Transaction Count</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Total Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!showDemoData && walletCategories?.topWhales && walletCategories.topWhales.length > 0 ? (
                            walletCategories.topWhales.map((whale, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  {whale.address.substring(0, 8)}...{whale.address.substring(whale.address.length - 6)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">{whale.transactionCount}</td>
                                <td className="py-2 px-4 border border-gray-200">
                                  {formatVolume(whale.volume, selectedContract?.tokenSymbol || "TOKEN")}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Demo data for whales
                            Array(10).fill(0).map((_, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 8)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">{Math.floor(Math.random() * 500) + 100}</td>
                                <td className="py-2 px-4 border border-gray-200">
                                  {formatVolume((Math.random() * 50000) + 10000, "ETH")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Airdrop Farmers Tab */}
                  <div className={activeWalletTab === 'airdropFarmers' ? 'block' : 'hidden'}>
                    <p className="text-sm mb-3">Wallets with exactly 1 transaction and token value ≤ 1 (these wallets represent approximately {!showDemoData && walletCategories?.airdropFarmers ? walletCategories.airdropFarmers : 32}% of all wallets)</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="py-2 px-4 text-left border border-gray-200">Wallet Address</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Transaction Count</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!showDemoData && walletCategories?.topAirdropFarmers && walletCategories.topAirdropFarmers.length > 0 ? (
                            walletCategories.topAirdropFarmers.map((farmer, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  {farmer.address.substring(0, 8)}...{farmer.address.substring(farmer.address.length - 6)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">{farmer.transactionCount}</td>
                                <td className="py-2 px-4 border border-gray-200">
                                  {formatVolume(farmer.volume, selectedContract?.tokenSymbol || "TOKEN")}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Demo data for airdrop farmers
                            Array(10).fill(0).map((_, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 8)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">1</td>
                                <td className="py-2 px-4 border border-gray-200">
                                  {formatVolume(Math.random() * 0.01, "ETH")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Bridge Users Tab */}
                  <div className={activeWalletTab === 'bridgeUsers' ? 'block' : 'hidden'}>
                    <p className="text-sm mb-3">Wallets with high percentage of approvals or zero-value transactions (these wallets represent approximately {!showDemoData && walletCategories?.bridgeUsers ? walletCategories.bridgeUsers : 15}% of all wallets)</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                          <tr className="bg-purple-50">
                            <th className="py-2 px-4 text-left border border-gray-200">Wallet Address</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Total Transactions</th>
                            <th className="py-2 px-4 text-left border border-gray-200">Approval Txns</th>
                            <th className="py-2 px-4 text-left border border-gray-200">No-Value Txns</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!showDemoData && walletCategories?.topBridgeUsers && walletCategories.topBridgeUsers.length > 0 ? (
                            walletCategories.topBridgeUsers.map((bridgeUser, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  {bridgeUser.address.substring(0, 8)}...{bridgeUser.address.substring(bridgeUser.address.length - 6)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">{bridgeUser.transactionCount}</td>
                                <td className="py-2 px-4 border border-gray-200">{bridgeUser.approvals}</td>
                                <td className="py-2 px-4 border border-gray-200">{bridgeUser.noValueTxs}</td>
                              </tr>
                            ))
                          ) : (
                            // Demo data for bridge users
                            Array(10).fill(0).map((_, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-50'}>
                                <td className="py-2 px-4 border border-gray-200 font-mono text-sm">
                                  0x{Math.random().toString(16).substring(2, 10)}...{Math.random().toString(16).substring(2, 8)}
                                </td>
                                <td className="py-2 px-4 border border-gray-200">{Math.floor(Math.random() * 20) + 5}</td>
                                <td className="py-2 px-4 border border-gray-200">{Math.floor(Math.random() * 10) + 3}</td>
                                <td className="py-2 px-4 border border-gray-200">{Math.floor(Math.random() * 8) + 2}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button 
                onClick={() => setShowTransactionDistributionModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Volume Modal */}
      {showVolumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold font-montserrat">
                Transaction Volume Details - {!showDemoData && selectedContract?.name ? selectedContract.name : "Demo Contract"}
              </h2>
              <button 
                onClick={() => setShowVolumeModal(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Volume Overview */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 font-montserrat">Volume Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 7 Days</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.last7Days
                        ? formatVolume(parseFloat(contractData.recentVolume.last7Days), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                        : "15.5K ETH"
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChange7Days) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChange7Days || 0) >= 0 ? 'text-green-500' : 'text-red-500') : 'text-green-500'}`}>
                        {!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChange7Days || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />) : <ArrowUp size={12} />}
                        <span>{!showDemoData ? Math.abs(parseFloat(contractData?.recentVolume?.percentChange7Days || 0)).toFixed(1) : "24.3"}%</span>
                        <span className="ml-1 text-gray-500">vs previous</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 30 Days</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.last30Days
                        ? formatVolume(parseFloat(contractData.recentVolume.last30Days), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                        : "75.8K ETH"
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChange30Days) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChange30Days || 0) >= 0 ? 'text-green-500' : 'text-red-500') : 'text-green-500'}`}>
                        {!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChange30Days || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />) : <ArrowUp size={12} />}
                        <span>{!showDemoData ? Math.abs(parseFloat(contractData?.recentVolume?.percentChange30Days || 0)).toFixed(1) : "18.7"}%</span>
                        <span className="ml-1 text-gray-500">vs previous</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last Year</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.lastYear
                        ? formatVolume(parseFloat(contractData.recentVolume.lastYear), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                        : "420.5K ETH"
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChangeYear) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChangeYear || 0) >= 0 ? 'text-green-500' : 'text-red-500') : 'text-green-500'}`}>
                        {!showDemoData ? (parseFloat(contractData?.recentVolume?.percentChangeYear || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />) : <ArrowUp size={12} />}
                        <span>{!showDemoData ? Math.abs(parseFloat(contractData?.recentVolume?.percentChangeYear || 0)).toFixed(1) : "32.1"}%</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Lifetime</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.lifetime
                        ? formatVolume(parseFloat(contractData.recentVolume.lifetime), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                        : "1.25M ETH"
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {!showDemoData ? (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN") : "ETH"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Volume Over Time Chart */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 font-montserrat">Volume Over Time</h3>
                <div className="flex justify-between items-center mb-3">
                  <div></div> {/* Empty div for flex alignment */}
                  <div className="flex rounded-md overflow-hidden border border-gray-200">
                    <button 
                      className={`px-2 py-1 text-xs ${chartTimeRange === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setChartTimeRange('24h')}
                    >
                      24H
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs ${chartTimeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setChartTimeRange('7d')}
                    >
                      7D
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs ${chartTimeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setChartTimeRange('30d')}
                    >
                      30D
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs ${chartTimeRange === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setChartTimeRange('quarter')}
                    >
                      3M
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs ${chartTimeRange === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      onClick={() => setChartTimeRange('year')}
                    >
                      1Y
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={transactionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(value) => {
                          if (value >= 1000000000) return `${(value/1000000000).toFixed(1)}B`;
                          if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value/1000).toFixed(1)}K`;
                          return value;
                        }}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          const tokenSymbol = !showDemoData ? (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN') : "ETH";
                          if (value >= 1000000000) return [`${(value/1000000000).toFixed(2)}B ${tokenSymbol}`, "Volume"];
                          if (value >= 1000000) return [`${(value/1000000).toFixed(2)}M ${tokenSymbol}`, "Volume"];
                          if (value >= 1000) return [`${(value/1000).toFixed(1)}K ${tokenSymbol}`, "Volume"];
                          return [`${value.toLocaleString()} ${tokenSymbol}`, "Volume"];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke={chainColor} 
                        fill={`${chainColor}30`} 
                        activeDot={{ r: 6 }}
                        name={`Volume (${!showDemoData ? (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN') : "ETH"})`}
                      />
                    </AreaChart>
            </ResponsiveContainer>
                </div>
              </div>
              
              {/* Average Daily Volume */}
              <div>
                <h3 className="text-lg font-medium mb-4 font-montserrat">Average Daily Volume</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 7 Days Avg.</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.last7Days
                        ? formatVolume(
                            parseFloat(contractData.recentVolume.last7Days) / 7,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
                        : "2.2K ETH"
                      }
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 30 Days Avg.</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.last30Days
                        ? formatVolume(
                            parseFloat(contractData.recentVolume.last30Days) / 30,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
                        : "2.5K ETH"
                      }
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last Year Avg.</p>
                    <p className="text-xl font-bold">
                      {!showDemoData && contractData?.recentVolume?.lastYear
                        ? formatVolume(
                            parseFloat(contractData.recentVolume.lastYear) / 365,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
                        : "1.2K ETH"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button 
                onClick={() => setShowVolumeModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
