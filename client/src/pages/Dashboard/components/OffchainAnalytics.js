import React from "react";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from "chart.js";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

// Geo data for the world map
const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

// Sample data for charts
const lineChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  datasets: [
    {
      label: "Visitors",
      data: [500, 600, 800, 700, 900, 1200, 1100, 1000, 800, 600, 500, 400],
      borderColor: "#8B5CF6",
      backgroundColor: "rgba(139, 92, 246, 0.2)",
      fill: true,
    },
    {
      label: "Wallets",
      data: [300, 400, 500, 450, 600, 800, 750, 700, 550, 400, 350, 300],
      borderColor: "#FBBF24",
      backgroundColor: "rgba(251, 191, 36, 0.2)",
      fill: true,
    },
  ],
};

const doughnutChartData = {
  labels: ["New", "Returning"],
  datasets: [
    {
      data: [541204, 541204],
      backgroundColor: ["#8B5CF6", "#FBBF24"],
      borderWidth: 0,
    },
  ],
};

// Sample traffic sources data
const trafficSources = [
  { source: "Twitter", visitors: 688723, wallets: 3342 },
  { source: "LinkedIn", visitors: 614213, wallets: 1274 },
  { source: "Instagram", visitors: 167186, wallets: 576187 },
  { source: "Dribbble", visitors: 13677, wallets: 68412 },
  { source: "Behance", visitors: 8717, wallets: 69823 },
  { source: "Pinterest", visitors: 312, wallets: 176 },
];

// Sample map data (simplified)
const mapData = [
  { country: "USA", users: 5761867 },
  { country: "CHN", users: 688723 },
  { country: "IND", users: 68412 },
];

const OffchainAnalytics = ({ onMenuClick, onClose }) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 h-[600px]">
      {/* Header */}
      <div className="bg-amber-200 p-1 text-center">
        <p className="text-xs font-semibold">Welcome back, Julia!</p>
        <p className="text-[8px] text-gray-600">Get an overview of how things are now with real-time analytics.</p>
      </div>

      {/* Main Content */}
      <main className="p-2 flex flex-col gap-2 flex-1">
        {/* Filters */}
        <div className="flex items-center gap-1">
          <select className="border rounded-md p-0.5 text-[10px]">
            <option>Select Website</option>
          </select>
          <select className="border rounded-md p-0.5 text-[10px]">
            <option>Select Date</option>
          </select>
          <button className="border rounded-md p-0.5 text-[10px]">Filters</button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-1">
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] text-gray-500">Unique Visitors</p>
            <p className="text-[10px] font-bold">24,000,000.00</p>
          </div>
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] text-gray-500">Total page views</p>
            <p className="text-[10px] font-bold">36,000.00</p>
          </div>
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] text-gray-500">Pages per visit</p>
            <p className="text-[10px] font-bold">24,000.00</p>
          </div>
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] text-gray-500">Bounce rate</p>
            <p className="text-[10px] font-bold">36,000.00%</p>
          </div>
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] text-gray-500">Average visit duration</p>
            <p className="text-[10px] font-bold">24,000,000.00</p>
          </div>
        </div>

        {/* Graph and Funnel Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 h-1/3">
          <div className="col-span-2 bg-white p-1 rounded-lg shadow">
            <div className="flex items-center gap-0.5 mb-0.5">
              <p className="text-[8px] font-semibold">Analytics</p>
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
              <p className="text-[8px]">Visitors</p>
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
              <p className="text-[8px]">Wallets count</p>
            </div>
            <Line data={lineChartData} options={{ maintainAspectRatio: false }} height={80} />
          </div>
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] font-semibold mb-0.5">Web3 visitors & wallets</p>
            <div className="flex items-center gap-0.5 mb-0.5">
              <p className="text-[10px] font-bold">50.02%</p>
              <p className="text-green-500 text-[8px]">6.7%</p>
            </div>
            <div className="flex items-center gap-0.5 mb-0.5">
              <p className="text-[10px] font-bold">558</p>
              <p className="text-green-500 text-[8px]">7.1%</p>
            </div>
            <svg className="w-full h-12" viewBox="0 0 200 100">
              <polygon points="0,0 200,0 150,50 50,50" fill="#1F2937" />
              <polygon points="50,50 150,50 125,75 75,75" fill="#8B5CF6" />
              <polygon points="75,75 125,75 100,100 100,100" fill="#FBBF24" />
            </svg>
            <div className="flex justify-between text-[8px] mt-0.5">
              <p>Unique Visitors</p>
              <p>Web3 Users</p>
              <p>Transactions recorded</p>
            </div>
          </div>
        </div>

        {/* Traffic Sources, Map, and Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 h-1/2">
          {/* Traffic Sources */}
          <div className="bg-white p-1 rounded-lg shadow">
            <div className="flex justify-between items-center mb-0.5">
              <p className="text-[8px] font-semibold">Traffic sources</p>
              <select className="border rounded-md p-0.5 text-[8px]">
                <option>This Month</option>
              </select>
            </div>
            <table className="w-full text-[8px]">
              <thead>
                <tr className="text-left text-gray-500">
                  <th>Traffic Source</th>
                  <th>Visitors</th>
                  <th>Wallet</th>
                </tr>
              </thead>
              <tbody>
                {trafficSources.map((source, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-0.5 flex items-center gap-0.5">
                      <img src={`https://via.placeholder.com/8?text=${source.source[0]}`} alt={source.source} className="w-2 h-2 rounded-full" />
                      {source.source}
                    </td>
                    <td>{source.visitors.toLocaleString()}</td>
                    <td>{source.wallets.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Users by Country (Map) */}
          <div className="bg-white p-1 rounded-lg shadow">
            <p className="text-[8px] font-semibold mb-0.5">Users by country</p>
            <ComposableMap className="h-28">
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryData = mapData.find((d) => d.country === geo.properties.ISO_A3);
                    const fillColor = countryData
                      ? `rgba(59, 130, 246, ${countryData.users / 688723})`
                      : "#E5E7EB";
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#D1D5DB"
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
            <div className="text-[8px] mt-0.5">
              <div className="flex items-center gap-0.5">
                <img src="https://flagcdn.com/16x12/us.png" alt="USA" className="w-2 h-2" />
                <p>United State (USA)</p>
                <p className="text-gray-500">54% • 5,761,867 Users</p>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <img src="https://flagcdn.com/16x12/cn.png" alt="China" className="w-2 h-2" />
                <p>China</p>
                <p className="text-gray-500">31% • 688,723 Users</p>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <img src="https://flagcdn.com/16x12/in.png" alt="India" className="w-2 h-2" />
                <p>India</p>
                <p className="text-gray-500">15% • 68,412 Users</p>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white p-1 rounded-lg shadow">
            <div className="flex justify-between items-center mb-0.5">
              <p className="text-[8px] font-semibold">Type</p>
              <select className="border rounded-md p-0.5 text-[8px]">
                <option>This Month</option>
              </select>
            </div>
            <div className="flex justify-center">
              <Doughnut
                data={doughnutChartData}
                options={{
                  maintainAspectRatio: false,
                  cutout: "70%",
                  plugins: { legend: { display: false } },
                }}
                width={100}
                height={100}
              />
            </div>
            <div className="text-[8px] mt-0.5">
              <div className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                <p>New</p>
                <p className="text-gray-500">541,204</p>
                <p className="text-gray-500">50.04%</p>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                <p>Returning</p>
                <p className="text-gray-500">541,204</p>
                <p className="text-gray-500">50.04%</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OffchainAnalytics;