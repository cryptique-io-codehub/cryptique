import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { PieChart, Pie, Cell, Label, Sector } from 'recharts';
import { ArrowUp, ArrowRight, AlertCircle } from 'lucide-react';
import { useContract } from '../../context/ContractContext';
import SmartContractSelector from '../../components/SmartContractSelector';

// Helper component to indicate data source
const DataSourceIndicator = ({ isDemoData }) => {
  return (
    <div className={`text-xs px-1.5 py-0.5 rounded-md inline-flex items-center ml-2 ${
      isDemoData ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
    }`}>
      {isDemoData ? (
        <>
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Demo</span>
        </>
      ) : (
        <>
          <span>Live</span>
        </>
      )}
    </div>
  );
};

export default function OnchainDashboard() {
  const { selectedContract, shouldShowDemoData } = useContract();
  
  // States for live data
  const [transactionData, setTransactionData] = useState([]);
  const [walletAgeData, setWalletAgeData] = useState([]);
  const [walletBalanceData, setWalletBalanceData] = useState([]);
  const [transactionCountData, setTransactionCountData] = useState([]);
  const [totalWallets, setTotalWallets] = useState(null);
  const [activeWallets, setActiveWallets] = useState(null);
  const [txnTotal, setTxnTotal] = useState(null);
  const [txnLast7Days, setTxnLast7Days] = useState(null);
  const [txnLast30Days, setTxnLast30Days] = useState(null);
  const [medianWalletAge, setMedianWalletAge] = useState(null);
  const [medianWalletWorth, setMedianWalletWorth] = useState(null);
  const [txnValueTotal, setTxnValueTotal] = useState(null);
  const [txnValueLast7Days, setTxnValueLast7Days] = useState(null);
  const [txnValueLast30Days, setTxnValueLast30Days] = useState(null);
  const [onChainConversion, setOnChainConversion] = useState(null);
  const [onChainConversionChange, setOnChainConversionChange] = useState(null);
  const [popularDex, setPopularDex] = useState(null);
  const [popularCex, setPopularCex] = useState(null);
  
  // Sample demo data
  const demoTransactionData = [
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

  const demoWalletAgeData = [
    { name: ">2Y", value: 30, color: "#3b82f6" },    // Blue segment - 40%
    { name: "1Y-2Y", value: 40, color: "#f97316" },  // Orange segment - 60%
    { name: "6M-1Y", value: 20, color: "#10b981" },   // Green segment - 0%
    { name: "<6M", value: 10, color: "#eab308" }      // Yellow segment - 0%
  ];

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

  const demoTransactionCountData = [
    { range: "0-10", percentage: 19.1 },
    { range: "11-50", percentage: 16.9 },
    { range: ">50", percentage: 12.3 },
    { range: "101-250", percentage: 11.7 },
    { range: "251-500", percentage: 8.0 },
    { range: "501-1000", percentage: 10.6 },
    { range: ">1000", percentage: 21.4 },
  ];

  // Demo stats for dashboard metrics
  const demoTotalWallets = 123;
  const demoActiveWallets = 89;
  const demoTxnTotal = 224;
  const demoTxnLast7Days = 87;
  const demoTxnLast30Days = 29;
  const demoMedianWalletAge = "2.5 Years";
  const demoMedianWalletWorth = "$945";
  const demoTxnValueTotal = "$9,721";
  const demoTxnValueLast7Days = "$1043";
  const demoTxnValueLast30Days = "$103";
  const demoOnChainConversion = "40%";
  const demoOnChainConversionChange = "+247%";
  const demoPopularDex = "UniSwap";
  const demoPopularCex = "Binance";

  // Fetch real data when contract changes
  useEffect(() => {
    if (selectedContract) {
      // Fetch real data here and set to respective state variables
      // For now, we'll simulate this with a timeout
      const fetchData = async () => {
        try {
          // API calls would go here
          // For demo purposes, just setting timeout
          setTimeout(() => {
            // If API call was successful, you'd set the data like this:
            // setTransactionData(responseData.transactions);
            // setWalletAgeData(responseData.walletAge);
            // etc.
            
            // For now, let's just set empty data to test fallback logic
            setTransactionData([]);
            setWalletAgeData([]);
            setWalletBalanceData([]);
            setTransactionCountData([]);
          }, 1000);
        } catch (error) {
          console.error("Error fetching on-chain data:", error);
        }
      };

      fetchData();
    }
  }, [selectedContract]);

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

  // Data to use based on availability
  const displayTransactionData = shouldShowDemoData('transactionChart') ? demoTransactionData : transactionData;
  const displayWalletAgeData = shouldShowDemoData('walletAge') ? demoWalletAgeData : walletAgeData;
  const displayWalletBalanceData = shouldShowDemoData('walletBalance') ? demoWalletBalanceData : walletBalanceData;
  const displayTransactionCountData = shouldShowDemoData('transactionCount') ? demoTransactionCountData : transactionCountData;
  
  // Stats to display based on availability
  const displayTotalWallets = shouldShowDemoData('totalWallets') ? demoTotalWallets : totalWallets;
  const displayActiveWallets = shouldShowDemoData('activeWallets') ? demoActiveWallets : activeWallets;
  const displayTxnTotal = shouldShowDemoData('txnTotal') ? demoTxnTotal : txnTotal;
  const displayTxnLast7Days = shouldShowDemoData('txnLast7Days') ? demoTxnLast7Days : txnLast7Days;
  const displayTxnLast30Days = shouldShowDemoData('txnLast30Days') ? demoTxnLast30Days : txnLast30Days;
  const displayMedianWalletAge = shouldShowDemoData('medianWalletAge') ? demoMedianWalletAge : medianWalletAge;
  const displayMedianWalletWorth = shouldShowDemoData('medianWalletWorth') ? demoMedianWalletWorth : medianWalletWorth;
  const displayTxnValueTotal = shouldShowDemoData('txnValueTotal') ? demoTxnValueTotal : txnValueTotal;
  const displayTxnValueLast7Days = shouldShowDemoData('txnValueLast7Days') ? demoTxnValueLast7Days : txnValueLast7Days;
  const displayTxnValueLast30Days = shouldShowDemoData('txnValueLast30Days') ? demoTxnValueLast30Days : txnValueLast30Days;
  const displayOnChainConversion = shouldShowDemoData('onChainConversion') ? demoOnChainConversion : onChainConversion;
  const displayOnChainConversionChange = shouldShowDemoData('onChainConversionChange') ? demoOnChainConversionChange : onChainConversionChange;
  const displayPopularDex = shouldShowDemoData('popularDex') ? demoPopularDex : popularDex;
  const displayPopularCex = shouldShowDemoData('popularCex') ? demoPopularCex : popularCex;

  return (
    <div className="bg-gray-50 p-4 text-gray-900">
      {/* Smart Contract Selector */}
      <SmartContractSelector />
      
      {/* Contract selection notification */}
      {!selectedContract && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
          <p className="font-bold">No Smart Contract Selected</p>
          <p>Demo data is being displayed. Please select a smart contract to see real data.</p>
        </div>
      )}
      
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

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Wallets */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Total Wallets
            <DataSourceIndicator isDemoData={shouldShowDemoData('totalWallets')} />
          </h2>
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold font-montserrat">{displayTotalWallets}</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-600 font-montserrat">{displayActiveWallets}</h3>
              <p className="text-xs text-gray-500 font-poppins">Active Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Transaction Count
            <DataSourceIndicator isDemoData={shouldShowDemoData('txnTotal')} />
          </h2>
          <div className="flex justify-between space-x-1">
            <div>
              <h3 className="text-sm font-bold bg-[#1D0C46] text-white px-2 py-1 rounded font-montserrat">{displayTxnTotal}</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">{displayTxnLast7Days}</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 7 days</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">{displayTxnLast30Days}</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 30 days</p>
            </div>
            <div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Median Wallet */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Median Wallet
            <DataSourceIndicator isDemoData={shouldShowDemoData('medianWalletAge')} />
          </h2>
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold font-montserrat">{displayMedianWalletAge}</h3>
              <p className="text-xs text-gray-500 font-poppins">Age</p>
            </div>
            <div>
              <h3 className="text-xl font-bold font-montserrat">{displayMedianWalletWorth}</h3>
              <p className="text-xs text-gray-500 font-poppins">Net Worth</p>
            </div>
          </div>
        </div>

        {/* Transaction Value */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Transaction Value (USD)
            <DataSourceIndicator isDemoData={shouldShowDemoData('txnValueTotal')} />
          </h2>
          <div className="flex justify-between space-x-1">
            <div>
              <h3 className="text-sm font-bold bg-[#1D0C46] text-white px-2 py-1 rounded font-montserrat">{displayTxnValueTotal}</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">{displayTxnValueLast7Days}</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 7 days</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">{displayTxnValueLast30Days}</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 30 days</p>
            </div>
            <div>
             
            </div>
          </div>
        </div>
      </div>

      {/* Lower Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* On-Chain Conversion */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            On-Chain Conversion
            <DataSourceIndicator isDemoData={shouldShowDemoData('onChainConversion')} />
          </h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">{displayOnChainConversion}</h3>
            <div className="bg-green-100 text-green-600 px-2 py-1 rounded flex items-center text-sm font-poppins">
              <ArrowUp className="w-4 h-4 mr-1" />
              <span>{displayOnChainConversionChange}</span>
            </div>
          </div>
          <div className="flex items-center text-gray-500 text-sm mt-2 font-poppins">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            <span>LinkedIn</span>
          </div>
        </div>

        {/* Most Popular DEX */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Most Popular DEX by Value
            <DataSourceIndicator isDemoData={shouldShowDemoData('popularDex')} />
          </h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">{displayPopularDex}</h3>
            <div className="text-purple-600">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Most Popular CEX */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat flex items-center">
            Most Popular CEX by Value
            <DataSourceIndicator isDemoData={shouldShowDemoData('popularCex')} />
          </h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">{displayPopularCex}</h3>
            <div className="text-green-500">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Chart - Using demo or real data */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex justify-between mb-2">
          <h2 className="font-semibold text-lg font-montserrat flex items-center">
            Transactions
            <DataSourceIndicator isDemoData={shouldShowDemoData('transactionChart')} />
          </h2>
          <div className="flex space-x-4 font-poppins">
            <div className="text-sm font-bold">
              <span>1D</span>
            </div>
            <div className="text-sm font-bold">
              <span>1W</span>
            </div>
            <div className="text-sm font-bold">
              <span>1M</span>
            </div>
            <div className="text-sm font-bold">
              <span>1Y</span>
            </div>
          </div>
        </div>

        {/* The chart itself - use displayTransactionData here */}
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={displayTransactionData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }} 
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }} 
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }} 
            />
            <Tooltip 
              contentStyle={{ fontFamily: "'Poppins', sans-serif" }} 
              labelStyle={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "bold" }} 
            />
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="transactions" 
              stroke="#3b82f6" 
              fill="#e0f2fe" 
              dot={false} 
            />
            <Bar 
              yAxisId="right" 
              dataKey="volume" 
              fill="#f97316" 
              radius={[4, 4, 0, 0]} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Distribution Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Wallet Age Distribution - Updated to match the image exactly */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-4 font-montserrat">Wallet age distribution</h2>
          <div className="flex items-center justify-center relative h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayWalletAgeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {displayWalletAgeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
               
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend - Updated to show all 4 segments as in the image */}
            <div className="absolute right-0 top-0 text-sm font-poppins">
              {displayWalletAgeData.map((item, index) => (
                <div key={index} className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold font-montserrat">2.2Y</span>
              <span className="text-xs text-gray-500 font-poppins">Avg. wallet age</span>
            </div>
          </div>
        </div>

        {/* Wallet Balance Distribution - Updated with "percentage of distribution" x-axis */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-4 font-montserrat">Wallet balance distribution (USD)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={displayWalletBalanceData}
                layout="vertical"
                margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 25]} 
                  tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }} 
                  label={{ 
                    value: "Percentage of distribution", 
                    position: "insideBottom", 
                    offset: -5, 
                    fontSize: 10,
                    fontFamily: "'Poppins', sans-serif"
                  }}
                />
                <YAxis 
                  dataKey="range" 
                  type="category" 
                  tick={{ fontSize: 8, fontFamily: "'Poppins', sans-serif" }} 
                  width={45} 
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']} 
                  contentStyle={{ fontFamily: "'Poppins', sans-serif" }} 
                  labelStyle={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "bold" }}
                />
                <Bar dataKey="percentage" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wallet Transactions Count Distribution - Updated with "percentage of distribution" x-axis */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-4 font-montserrat">Wallet transactions count distribution</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={displayTransactionCountData}
                layout="vertical"
                margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 25]} 
                  tick={{ fontSize: 10, fontFamily: "'Poppins', sans-serif" }} 
                  label={{ 
                    value: "Percentage of distribution", 
                    position: "insideBottom", 
                    offset: -5, 
                    fontSize: 10,
                    fontFamily: "'Poppins', sans-serif"
                  }}
                />
                <YAxis 
                  dataKey="range" 
                  type="category" 
                  tick={{ fontSize: 8, fontFamily: "'Poppins', sans-serif" }} 
                  width={45} 
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']} 
                  contentStyle={{ fontFamily: "'Poppins', sans-serif" }} 
                  labelStyle={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "bold" }}
                />
                <Bar dataKey="percentage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}