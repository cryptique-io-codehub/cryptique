import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetentionAnalytics = () => {
  const [timeFrame, setTimeFrame] = useState('This Month');
  const [retentionData, setRetentionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data fetch - in production, replace with actual API call
    const fetchRetentionData = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data for retention metrics
        const mockData = {
          summaryCards: [
            { 
              title: 'Daily Active Users', 
              value: '100,000', 
              increase: '5.8% Increase',
              country: 'United States of America',
              flag: '🇺🇸'
            },
            { 
              title: 'Weekly Active Users', 
              value: '100,000', 
              increase: '4.2% Increase',
              country: 'United States of America',
              flag: '🇺🇸'
            },
            { 
              title: 'Monthly Active Users', 
              value: '100,000', 
              increase: '3.7% Increase',
              country: 'United States of America',
              flag: '🇺🇸'
            }
          ],
          retentionChart: [
            { month: '2017', DAU: 30, WAU: 40, MAU: 100 },
            { month: '2018', DAU: 40, WAU: 60, MAU: 120 },
            { month: '2019', DAU: 50, WAU: 70, MAU: 150 },
            { month: '2020', DAU: 65, WAU: 50, MAU: 90 },
            { month: '2021', DAU: 75, WAU: 40, MAU: 70 },
            { month: '2022', DAU: 60, WAU: 55, MAU: 110 }
          ],
          cohortData: [
            { 
              date: 'May 14-20', 
              initialUsers: 454,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 5.2 },
                { day: 2, value: 3.2 },
                { day: 3, value: 2.1 },
                { day: 4, value: 1.9 },
                { day: 5, value: 1.2 },
                { day: 6, value: 1.1 },
                { day: 7, value: 0.7 }
              ]
            },
            { 
              date: 'May 17-20', 
              initialUsers: 322,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 5.0 },
                { day: 2, value: 4.4 },
                { day: 3, value: 4.0 },
                { day: 4, value: 3.3 },
                { day: 5, value: 2.5 },
                { day: 6, value: 1.5 },
                { day: 7, value: 0.7 }
              ]
            },
            { 
              date: 'May 16-20', 
              initialUsers: 564,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 5.7 },
                { day: 2, value: 3.2 },
                { day: 3, value: 2.3 },
                { day: 4, value: 1.9 },
                { day: 5, value: 1.2 },
                { day: 6, value: 0.7 },
                { day: 7, value: 0.3 }
              ] 
            },
            { 
              date: 'May 20-22', 
              initialUsers: 348,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 3.1 },
                { day: 2, value: 2.1 },
                { day: 3, value: 1.4 },
                { day: 4, value: 0.9 },
                { day: 5, value: 0.7 },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 20-23', 
              initialUsers: 433,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 2.4 },
                { day: 2, value: 1.7 },
                { day: 3, value: 1.2 },
                { day: 4, value: 0.5 },
                { day: 5, value: 0.2 },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 21-25', 
              initialUsers: 387,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 3.2 },
                { day: 2, value: 0.2 },
                { day: 3, value: 0.0 },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 22-25', 
              initialUsers: 311,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 2.0 },
                { day: 2, value: 1.7 },
                { day: 3, value: 1.2 },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 23-25', 
              initialUsers: 290,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 0.5 },
                { day: 2, value: 0.3 },
                { day: 3, value: null },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 24-25', 
              initialUsers: 312,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 0.7 },
                { day: 2, value: null },
                { day: 3, value: null },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 25-26', 
              initialUsers: 278,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: 0.7 },
                { day: 2, value: null },
                { day: 3, value: null },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 26-29', 
              initialUsers: 407,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: null },
                { day: 2, value: null },
                { day: 3, value: null },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            },
            { 
              date: 'May 27-30', 
              initialUsers: 344,
              retentionByDay: [
                { day: 0, value: 100.0 },
                { day: 1, value: null },
                { day: 2, value: null },
                { day: 3, value: null },
                { day: 4, value: null },
                { day: 5, value: null },
                { day: 6, value: null },
                { day: 7, value: null }
              ]
            }
          ]
        };
        
        setRetentionData(mockData);
      } catch (error) {
        console.error("Error fetching retention data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRetentionData();
  }, [timeFrame]);

  // Get intensity color for cohort cell based on value
  const getCellColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-100';
    if (value === 100) return 'bg-gray-100';
    
    // Create a color gradient from light green to dark green
    if (value >= 5.0) return 'bg-green-500 text-white';
    if (value >= 3.0) return 'bg-green-400 text-white';
    if (value >= 2.0) return 'bg-green-300';
    if (value >= 1.0) return 'bg-green-200';
    if (value > 0) return 'bg-green-100';
    return 'bg-gray-100';
  };

  // Format the retention value
  const formatRetentionValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (value === 100) return '100%';
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Retention</h1>
      
      {/* Active Users Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {retentionData.summaryCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow">
            <h3 className="text-center text-sm md:text-lg font-semibold mb-2">{card.title}</h3>
            <p className="text-center text-xl md:text-2xl font-bold">{card.value}</p>
            <p className="text-center text-green-500 text-xs md:text-sm">{card.increase}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span>{card.flag}</span>
              <span className="text-xs text-gray-500 truncate">{card.country}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Retention Chart */}
      <div className="bg-white rounded-lg p-4 shadow mb-6">
        <h3 className="text-md md:text-lg font-semibold mb-4">Active Users Over Time</h3>
        <div className="h-60 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={retentionData.retentionChart}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: '0.75rem' }} />
              <YAxis tick={{ fontSize: '0.75rem' }} />
              <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="DAU" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="WAU" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="MAU" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Visitors Retention Section */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <h3 className="text-md md:text-lg font-semibold">Visitors retention</h3>
            <p className="text-xs md:text-sm text-gray-500">The retention rate is the percentage of users still visiting the website over a certain period of time</p>
          </div>
          
          <div className="self-start sm:self-center">
            <select 
              className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
            >
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last 3 Months</option>
            </select>
          </div>
        </div>
        
        {/* Retention Cohort Table */}
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="min-w-max">
            <table className="min-w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="p-1 md:p-2 bg-gray-50 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10">Day</th>
                  {Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retentionData.cohortData.map((cohort, index) => (
                  <tr key={index}>
                    <td className="p-1 md:p-2 border bg-gray-50 sticky left-0 z-10">
                      <div className="font-medium text-xs md:text-sm">{cohort.date}</div>
                      <div className="text-xs text-gray-500">Initial: {cohort.initialUsers}</div>
                    </td>
                    {cohort.retentionByDay.slice(0, 8).map((day, dayIndex) => (
                      <td 
                        key={dayIndex} 
                        className={`p-1 md:p-2 border text-center ${getCellColor(day.value)}`}
                      >
                        {formatRetentionValue(day.value)}
                      </td>
                    ))}
                    {/* Fill the remaining cells if less than 8 days of data */}
                    {Array.from({ length: 8 - cohort.retentionByDay.length }, (_, i) => (
                      <td key={`empty-${i}`} className="p-1 md:p-2 border text-center bg-gray-100">-</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile-friendly card view for small screens */}
        <div className="md:hidden mt-4">
          <h4 className="text-sm font-medium mb-2">Recent Retention Data</h4>
          <div className="space-y-3">
            {retentionData.cohortData.slice(0, 4).map((cohort, index) => (
              <div key={`mobile-${index}`} className="bg-gray-50 p-3 rounded border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{cohort.date}</span>
                  <span className="text-xs text-gray-500">Initial: {cohort.initialUsers}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {cohort.retentionByDay.slice(0, 4).map((day, dayIndex) => (
                    <div 
                      key={`mobile-day-${dayIndex}`} 
                      className={`p-1 text-center rounded ${getCellColor(day.value)}`}
                    >
                      <div className="text-xs text-gray-600">Day {day.day}</div>
                      <div>{formatRetentionValue(day.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetentionAnalytics;