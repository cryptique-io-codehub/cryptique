import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { PieChart, Pie, Cell, Label, Sector } from 'recharts';
import { ArrowUp, ArrowRight } from 'lucide-react';
import { useContract } from '../../context/ContractContext';

export default function OnchainDashboard() {
  const { selectedContract, showDemoData, contractData, isLoading } = useContract();

  // Sample transaction data for the chart - DEMO DATA
  const transactionData = [
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

  // Updated data for wallet age distribution - DEMO DATA
  const walletAgeData = [
    { name: ">2Y", value: 30, color: "#3b82f6" },    // Blue segment - 40%
    { name: "1Y-2Y", value: 40, color: "#f97316" },  // Orange segment - 60%
    { name: "6M-1Y", value: 20, color: "#10b981" },   // Green segment - 0%
    { name: "<6M", value: 10, color: "#eab308" }      // Yellow segment - 0%
  ];

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

  // Sample data for wallet balance distribution
  const walletBalanceData = [
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
  const transactionCountData = [
    { range: "0-10", percentage: 19.1 },
    { range: "11-50", percentage: 16.9 },
    { range: ">50", percentage: 12.3 },
    { range: "101-250", percentage: 11.7 },
    { range: "251-500", percentage: 8.0 },
    { range: "501-1000", percentage: 10.6 },
    { range: ">1000", percentage: 21.4 },
  ];

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

      {/* Contract Selection Status */}
      {isLoading ? (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <p className="text-center">Loading contract data...</p>
        </div>
      ) : (
        selectedContract && (
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <p className="text-sm font-medium">Currently analyzing: <span className="font-bold text-purple-600">{selectedContract.name || selectedContract.id}</span></p>
          </div>
        )
      )}

      {showDemoData && (
        <div className="bg-blue-50 p-4 rounded-lg shadow mb-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-bold">Demo Mode:</span> Select a smart contract to view real analytics data. Currently showing sample data.
          </p>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Wallets */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Total Wallets</h2>
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold font-montserrat">123</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-600 font-montserrat">89</h3>
              <p className="text-xs text-gray-500 font-poppins">Active Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Transaction Count</h2>
          <div className="flex justify-between space-x-1">
            <div>
              <h3 className="text-sm font-bold bg-[#1D0C46] text-white px-2 py-1 rounded font-montserrat">224</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">87</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 7 days</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">29</h3>
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
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Median Wallet</h2>
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold font-montserrat">2.5 Years</h3>
              <p className="text-xs text-gray-500 font-poppins">Age</p>
            </div>
            <div>
              <h3 className="text-xl font-bold font-montserrat">$945</h3>
              <p className="text-xs text-gray-500 font-poppins">Net Worth</p>
            </div>
          </div>
        </div>

        {/* Transaction Value */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Transaction Value (USD)</h2>
          <div className="flex justify-between space-x-1">
            <div>
              <h3 className="text-sm font-bold bg-[#1D0C46] text-white px-2 py-1 rounded font-montserrat">$9,721</h3>
              <p className="text-xs text-gray-500 font-poppins">Total Overall</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">$1043</h3>
              <p className="text-xs text-gray-500 font-poppins">Last 7 days</p>
            </div>
            <div>
              <h3 className="text-sm font-bold bg-green-500 text-white px-2 py-1 rounded font-montserrat">$103</h3>
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
          <h2 className="font-semibold text-lg mb-2 font-montserrat">On-Chain Conversion</h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">40%</h3>
            <div className="bg-green-100 text-green-600 px-2 py-1 rounded flex items-center text-sm font-poppins">
              <ArrowUp className="w-4 h-4 mr-1" />
              <span>+247%</span>
            </div>
          </div>
          <div className="flex items-center text-gray-500 text-sm mt-2 font-poppins">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            <span>LinkedIn</span>
          </div>
        </div>

        {/* Most Popular DEX */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Most Popular DEX by Value (USD)</h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">UniSwap</h3>
            <div className="text-purple-600">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Most Popular CEX */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat">Most Popular CEX by Value (USD)</h2>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-montserrat">Binance</h3>
            <div className="text-green-500">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex justify-between mb-2">
          <h2 className="font-semibold text-lg font-montserrat">Transactions</h2>
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
        <p className="text-sm text-gray-500 mb-4 font-poppins">Total transactions and volume over time</p>
        
        <div className="flex justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold font-montserrat">1.27M</h3>
            <p className="text-xs text-gray-500 font-poppins">Total Transactions</p>
          </div>
          <div>
            <h3 className="text-2xl font-bold font-montserrat">$29.21B</h3>
            <p className="text-xs text-gray-500 font-poppins">Total Volume (USD)</p>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={transactionData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
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
        
        <div className="flex justify-center mt-2 text-sm font-poppins">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span>Transaction quantity</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
            <span>Transaction volume</span>
          </div>
        </div>
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
                  data={walletAgeData}
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
                  {walletAgeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
               
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend - Updated to show all 4 segments as in the image */}
            <div className="absolute right-0 top-0 text-sm font-poppins">
              {walletAgeData.map((item, index) => (
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
                data={walletBalanceData}
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
                data={transactionCountData}
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