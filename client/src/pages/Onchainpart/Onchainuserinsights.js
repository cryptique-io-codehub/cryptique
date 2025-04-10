import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function Onchainuserinsights() {
  // Platform colors
  const platformColors = {
    'X': '#4285F4',
    'Discord': '#7289DA',  
    'Telegram': '#0088cc',
    'Google': '#34A853',
    'OpenAI': '#FF6600',
    'Facebook': '#E94235'
  };

  // Data for Protocol Explorers and NFT Diggers
  const barData = [
    { name: 'X', protocol: 75, nft: 70 },
    { name: 'Discord', protocol: 30, nft: 30 },
    { name: 'Telegram', protocol: 60, nft: 60 },
    { name: 'Google', protocol: 80, nft: 75 },
    { name: 'OpenAI', protocol: 40, nft: 40 },
    { name: 'Facebook', protocol: 65, nft: 65 }
  ];

  // Data for Multichain Power Users
  const powerUserData = [
    { name: 'Twitter', value: 30, color: '#1DA1F2' },
    { name: 'Discord', value: 25, color: '#7289DA' },
    { name: 'Facebook', value: 15, color: '#E94235' },
    { name: 'Telegram', value: 20, color: '#0088cc' },
    { name: 'Other', value: 10, color: '#9CA3AF' }
  ];

  // Data for Airdrop Farmers
  const airdropFarmerData = [
    { name: 'Twitter', value: 30, color: '#1DA1F2' },
    { name: 'Discord', value: 25, color: '#7289DA' },
    { name: 'Facebook', value: 15, color: '#E94235' },
    { name: 'Telegram', value: 20, color: '#0088cc' },
    { name: 'Other', value: 10, color: '#9CA3AF' }
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

  // Custom bar component for colored bars
  const CustomBar = (props) => {
    const { x, y, width, height, name } = props;
    return <rect x={x} y={y} width={width} height={height} fill={platformColors[name]} rx={4} ry={4} />;
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Protocol Explorers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">Protocol Explorers (%)</h2>
          <p className="text-sm text-gray-500 mb-4">Users who've interacted with multiple dApps outside of their main</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="protocol" shape={<CustomBar />} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* NFT Diggers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">NFT Diggers (%)</h2>
          <p className="text-sm text-gray-500 mb-4">% of NFT users from each traffic channel</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="nft" shape={<CustomBar />} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Multichain Power Users */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">Multichain Power Users</h2>
          <p className="text-sm text-gray-500 mb-4">Users transacting across 3+ chains</p>
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
                >
                  {powerUserData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Airdrop Farmers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">Airdrop Farmers</h2>
          <p className="text-sm text-gray-500 mb-4">Users with high contact count, low retention, and interaction with airdrops/targeted NFTs</p>
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
                >
                  {airdropFarmerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* One-Time vs Retained Users */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">One-Time vs Retained Users</h2>
          <p className="text-sm text-gray-500 mb-4">Did they come back after first visit? Did they keep using the chain?</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="newUsers" name="New" fill="#4285F4" />
                <Bar dataKey="retained" name="Retained" fill="#ff4d4d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Whales */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-1">Whales (average transaction value)</h2>
          <p className="text-sm text-gray-500 mb-4">Source with highest average transaction value</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={whalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}