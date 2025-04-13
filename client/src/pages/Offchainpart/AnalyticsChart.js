import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import axiosInstance from '../../axiosInstance';
import ReactApexChart from 'react-apexcharts';

const AnalyticsChart = ({ analytics, setAnalytics, isLoading, error }) => {
  const [timeRange, setTimeRange] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTimeRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'daily':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      case 'monthly':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      case 'yearly':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Last 365 days
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get('/sessions');
        const sessions = response.data;

        const startDate = getTimeRange();
        const filteredSessions = sessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= startDate;
        });

        const groupedData = filteredSessions.reduce((acc, session) => {
          const date = new Date(session.startTime).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = {
              visitors: 0,
              walletConnections: 0,
              date: date
            };
          }
          acc[date].visitors++;
          
          // Check if wallet address exists and is valid
          if (session.wallet && 
              session.wallet.walletAddress && 
              session.wallet.walletAddress.trim() !== '' && 
              session.wallet.walletAddress !== 'undefined' && 
              session.wallet.walletAddress !== 'null') {
            acc[date].walletConnections++;
          }
          return acc;
        }, {});

        const finalData = Object.values(groupedData).sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });

        setChartData(finalData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load analytics data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const chartOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      type: 'datetime',
      categories: chartData.map(item => new Date(item.date).getTime()),
      labels: {
        format: 'MMM dd'
      }
    },
    yaxis: [
      {
        title: {
          text: 'Visitors'
        }
      },
      {
        opposite: true,
        title: {
          text: 'Wallet Connections'
        }
      }
    ],
    tooltip: {
      x: {
        format: 'MMM dd, yyyy'
      }
    },
    series: [
      {
        name: 'Visitors',
        data: chartData.map(item => item.visitors)
      },
      {
        name: 'Wallet Connections',
        data: chartData.map(item => item.walletConnections)
      }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Analytics Overview</h2>
        <div className="flex space-x-2">
          {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : (
        <ReactApexChart
          options={chartOptions}
          series={chartOptions.series}
          type="area"
          height={350}
        />
      )}
    </div>
  );
};

export default AnalyticsChart;