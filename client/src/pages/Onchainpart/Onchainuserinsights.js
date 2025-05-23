import { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useContractData } from '../../contexts/ContractDataContext';

export default function Onchainuserinsights() {
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Platform colors
  const platformColors = {
    'X': '#4285F4',
    'Discord': '#7289DA',  
    'Telegram': '#0088cc',
    'Google': '#34A853',
    'OpenAI': '#FF6600',
    'Facebook': '#E94235'
  };

  // Data for Protocol Explorers - custom values
  const protocolExplorerData = [
    { name: 'X', protocol: 75 },
    { name: 'Discord', protocol: 30 },
    { name: 'Telegram', protocol: 60 },
    { name: 'Google', protocol: 80 },
    { name: 'OpenAI', protocol: 40 },
    { name: 'Facebook', protocol: 65 }
  ];

  // Data for NFT Diggers - different values
  const nftDiggerData = [
    { name: 'X', nft: 70 },
    { name: 'Discord', nft: 45 },
    { name: 'Telegram', nft: 55 },
    { name: 'Google', nft: 65 },
    { name: 'OpenAI', nft: 50 },
    { name: 'Facebook', nft: 40 }
  ];

  // Data for Multichain Power Users - updated with different values
  const powerUserData = [
    { name: 'X', value: 35, color: '#4285F4' },
    { name: 'Discord', value: 25, color: '#7289DA' },
    { name: 'Facebook', value: 15, color: '#E94235' },
    { name: 'Telegram', value: 18, color: '#0088cc' },
    { name: 'Other', value: 7, color: '#9CA3AF' }
  ];

  // Data for Airdrop Farmers - different from multichain
  const airdropFarmerData = [
    { name: 'X', value: 22, color: '#4285F4' },
    { name: 'Discord', value: 30, color: '#7289DA' },
    { name: 'Facebook', value: 18, color: '#E94235' },
    { name: 'Telegram', value: 25, color: '#0088cc' },
    { name: 'Other', value: 5, color: '#9CA3AF' }
  ];

  // Data for One-Time vs Retained Users
  const retentionData = [
    { name: 'X', newUsers: 240, retained: 140 },
    { name: 'Facebook', newUsers: 120, retained: 180 },
    { name: 'Discord', newUsers: 200, retained: 160 },
    { name: 'Telegram', newUsers: 220, retained: 90 },
    { name: 'Google', newUsers: 80, retained: 260 }
  ];

  // Data for Whales
  const whalesData = [
    { name: 'X', value: 110 },
    { name: 'Discord', value: 230 },
    { name: 'Telegram', value: 170 },
    { name: 'Google', value: 80 },
    { name: 'Facebook', value: 60 }
  ];

  // Use loading state from contract context or simulate loading data
  useEffect(() => {
    if (!isLoadingTransactions) {
      // If contract data is loaded, we can set our loading to false
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // short timeout to ensure smooth transitions
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingTransactions]);

  // Custom bar component for colored bars
  const CustomBar = (props) => {
    const { x, y, width, height, name } = props;
    return <rect x={x} y={y} width={width} height={height} fill={platformColors[name]} rx={4} ry={4} />;
  };

  // Show loading state when transactions are loading
  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: styles.primaryColor }} />
          <p className="text-lg font-medium font-montserrat" style={{ color: styles.primaryColor }}>
            Loading user insights...
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
          User Insights {selectedContract ? `for ${selectedContract.name}` : ''}
        </h1>
        <p className="text-sm text-gray-600 font-poppins mt-1">
          Analyze your user behavior patterns and optimize your conversion strategies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        
        {/* Protocol Explorers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Protocol Explorers (%)</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">Users who've interacted with multiple dApps outside of their main</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={protocolExplorerData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={62}
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                  label={{ angle: -90, position: 'insideLeft', dx: -10, fontFamily: 'Poppins', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
                <Bar dataKey="protocol" shape={<CustomBar />} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* NFT Diggers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>NFT Diggers (%)</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">% of NFT users from each traffic channel</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={nftDiggerData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={62}
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                  label={{ angle: -90, position: 'insideLeft', dx: -10, fontFamily: 'Poppins', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
                <Bar dataKey="nft" shape={<CustomBar />} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Multichain Power Users */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Multichain Power Users</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">Users transacting across 3+ chains</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={powerUserData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
                >
                  {powerUserData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']}
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Airdrop Farmers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Airdrop Farmers</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">Users with high contact count, low retention, and interaction with airdrops/targeted NFTs</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={airdropFarmerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#555', strokeWidth: 1 }}
                >
                  {airdropFarmerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']}
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* One-Time vs Retained Users */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>One-Time vs Retained Users</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">Did they come back after first visit? Did they keep using the chain?</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={retentionData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Users', angle: -90, position: 'insideLeft', fontFamily: 'Poppins', fontSize: 12 }}
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
                <Legend 
                  wrapperStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                />
                <Bar dataKey="newUsers" name="New" fill={styles.primaryColor} radius={[4, 4, 0, 0]} />
                <Bar dataKey="retained" name="Retained" fill={styles.accentColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Whales */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 font-montserrat" style={{ color: styles.primaryColor }}>Whales (average transaction value)</h2>
          <p className="text-xs text-gray-500 mb-3 font-poppins">Source with highest average transaction value</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={whalesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Users', angle: -90, position: 'insideLeft', fontFamily: 'Poppins', fontSize: 12 }}
                  tick={{ fontFamily: 'Poppins', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 12 }}
                  labelStyle={{ fontFamily: 'Montserrat', fontWeight: 600 }}
                />
                <Bar dataKey="value" fill={styles.primaryColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}