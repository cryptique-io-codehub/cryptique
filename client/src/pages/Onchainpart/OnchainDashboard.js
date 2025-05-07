import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { PieChart, Pie, Cell, Label, Sector } from 'recharts';
import { ArrowUp, ArrowRight, ExternalLink, X } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';
import { getChainConfig } from '../../utils/chainRegistry';
import ChainBanner from '../../components/ChainBanner';

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

  // Add state for modal
  const [showVolumeModal, setShowVolumeModal] = useState(false);

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
    { name: ">2Y", value: 30, color: "#3b82f6" },    // Blue segment - 40%
    { name: "1Y-2Y", value: 40, color: "#f97316" },  // Orange segment - 60%
    { name: "6M-1Y", value: 20, color: "#10b981" },   // Green segment - 0%
    { name: "<6M", value: 10, color: "#eab308" }      // Yellow segment - 0%
  ];

  // Sample data for wallet balance distribution
  const demoWalletBalanceData = [
    { range: "<$100", percentage: 21.9 },
    { range: "$100-$1K", percentage: 20.3 },
    { range: "$1K-$10K", percentage: 6.1 },
    { range: "$10K-$100K", percentage: 21.6 },
    { range: "$100K-$1M", percentage: 14.8 },
    { range: "$1M-$10M", percentage: 5.4 },
    { range: "$10M-$100M", percentage: 7.4 },
    { range: ">$100M", percentage: 2.5 },
  ];

  // Sample data for wallet transactions count distribution
  const demoTransactionCountData = [
    { range: "0-10", percentage: 19.1 },
    { range: "11-50", percentage: 16.9 },
    { range: ">50", percentage: 12.3 },
    { range: "101-250", percentage: 11.7 },
    { range: "251-500", percentage: 8.0 },
    { range: "501-1000", percentage: 10.6 },
    { range: ">1000", percentage: 21.4 },
  ];

  // Choose which data to use based on whether we should show demo data
  const transactionData = showDemoData ? demoTransactionData : (contractData?.transactionData || demoTransactionData);
  const walletAgeData = showDemoData ? demoWalletAgeData : (contractData?.walletAgeData || demoWalletAgeData);
  const walletBalanceData = showDemoData ? demoWalletBalanceData : (contractData?.walletBalanceData || demoWalletBalanceData);
  const transactionCountData = showDemoData ? demoTransactionCountData : (contractData?.transactionCountData || demoTransactionCountData);

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
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.8;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="black" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
        fontFamily="'Poppins', sans-serif"
      >
        {`${value}%`}
      </text>
    );
  };

  const formatVolume = (value, tokenSymbol) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${tokenSymbol}`;
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
                    ? "15,500 ETH" 
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
            <a href="#" className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
              View Analysis <ArrowRight size={14} className="ml-1" />
            </a>
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
                tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "volume") {
                    // Format volume with token symbol
                    const tokenSymbol = showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN');
                    return value >= 1000000 
                      ? [`${(value/1000000).toFixed(2)}M ${tokenSymbol}`, "Volume"]
                      : [`${value.toLocaleString()} ${tokenSymbol}`, "Volume"];
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
                {showDemoData ? "1.7 Years" : contractData?.medianWalletStats?.age || "0 Years"}
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
          <h2 className="font-semibold text-lg mb-3 font-montserrat">Transaction Count Distribution</h2>
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

      {/* Transaction Volume Modal */}
      {showVolumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold font-montserrat">
                Transaction Volume Details - {showDemoData ? "Demo Contract" : (selectedContract?.name || "Unknown Contract")}
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
                      {showDemoData 
                        ? "15,500 ETH" 
                        : formatVolume(parseFloat(contractData?.recentVolume?.last7Days || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChange7Days) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${showDemoData || parseFloat(contractData?.recentVolume?.percentChange7Days || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {showDemoData || parseFloat(contractData?.recentVolume?.percentChange7Days || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                        <span>{showDemoData ? "24.3" : Math.abs(parseFloat(contractData?.recentVolume?.percentChange7Days || 0)).toFixed(1)}%</span>
                        <span className="ml-1 text-gray-500">vs previous</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 30 Days</p>
                    <p className="text-xl font-bold">
                      {showDemoData 
                        ? "75.8K ETH" 
                        : formatVolume(parseFloat(contractData?.recentVolume?.last30Days || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChange30Days) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${showDemoData || parseFloat(contractData?.recentVolume?.percentChange30Days || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {showDemoData || parseFloat(contractData?.recentVolume?.percentChange30Days || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                        <span>{showDemoData ? "18.7" : Math.abs(parseFloat(contractData?.recentVolume?.percentChange30Days || 0)).toFixed(1)}%</span>
                        <span className="ml-1 text-gray-500">vs previous</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last Year</p>
                    <p className="text-xl font-bold">
                      {showDemoData 
                        ? "420.5K ETH" 
                        : formatVolume(parseFloat(contractData?.recentVolume?.lastYear || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                      }
                    </p>
                    {(!showDemoData && contractData?.recentVolume?.percentChangeYear) || showDemoData ? (
                      <div className={`flex items-center text-xs mt-1 ${showDemoData || parseFloat(contractData?.recentVolume?.percentChangeYear || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {showDemoData || parseFloat(contractData?.recentVolume?.percentChangeYear || 0) >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />}
                        <span>{showDemoData ? "32.1" : Math.abs(parseFloat(contractData?.recentVolume?.percentChangeYear || 0)).toFixed(1)}%</span>
                        <span className="ml-1 text-gray-500">vs previous</span>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Lifetime</p>
                    <p className="text-xl font-bold">
                      {showDemoData 
                        ? "1.25M ETH" 
                        : formatVolume(parseFloat(contractData?.recentVolume?.lifetime || 0), selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN")}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Volume Over Time Chart */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 font-montserrat">Volume Over Time</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={transactionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          const tokenSymbol = showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN');
                          return value >= 1000000 
                            ? [`${(value/1000000).toFixed(2)}M ${tokenSymbol}`, "Volume"]
                            : [`${value.toLocaleString()} ${tokenSymbol}`, "Volume"];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke={chainColor} 
                        fill={`${chainColor}30`} 
                        activeDot={{ r: 6 }}
                        name={`Volume (${showDemoData ? "ETH" : (selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || 'TOKEN')})`}
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
                      {showDemoData 
                        ? "2,214.29 ETH" 
                        : formatVolume(
                            parseFloat(contractData?.recentVolume?.last7Days || 0) / 7,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
                      }
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last 30 Days Avg.</p>
                    <p className="text-xl font-bold">
                      {showDemoData 
                        ? "2,526.67 ETH" 
                        : formatVolume(
                            parseFloat(contractData?.recentVolume?.last30Days || 0) / 30,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
                      }
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Last Year Avg.</p>
                    <p className="text-xl font-bold">
                      {showDemoData 
                        ? "1,152.05 ETH" 
                        : formatVolume(
                            parseFloat(contractData?.recentVolume?.lastYear || 0) / 365,
                            selectedContract?.tokenSymbol || chainConfig?.nativeCurrency?.symbol || "TOKEN"
                          )
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
