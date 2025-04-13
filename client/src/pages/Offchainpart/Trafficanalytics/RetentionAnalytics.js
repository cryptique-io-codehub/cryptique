import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetentionAnalytics = ({analytics, setanalytics}) => {
  const [timeFrame, setTimeFrame] = useState('daily');
  const [retentionData, setRetentionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        const now = new Date();
        const allSessions = analytics.sessions || [];
        
        // Calculate retention periods based on timeframe
        let retentionPeriod;
        let maxDays;
        switch (timeFrame) {
          case 'daily':
            retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
            maxDays = 1;
            break;
          case 'weekly':
            retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
            maxDays = 7;
            break;
          case 'monthly':
            retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
            maxDays = 30;
            break;
          case 'yearly':
            retentionPeriod = 365 * 24 * 60 * 60 * 1000; // 365 days
            maxDays = 365;
            break;
          default:
            retentionPeriod = 7 * 24 * 60 * 60 * 1000;
            maxDays = 7;
        }

        const startDate = new Date(now - retentionPeriod);
        
        // Process cohort data
        const processCohortData = () => {
          const cohortData = [];
          const today = new Date();
          
          // Process data for the retention period
          for (let i = maxDays - 1; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            
            // Format the date for display
            const formattedDate = currentDate.toLocaleDateString([], { 
              month: 'short', 
              day: 'numeric' 
            });
            
            // Filter sessions for this day
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daysSessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
            // Get unique user IDs for this day
            const dayUniqueUserIds = [...new Set(daysSessions.map(session => session.userId).filter(Boolean))];
            const initialUsers = dayUniqueUserIds.length;
            
            if (initialUsers === 0) {
              continue;
            }
            
            // Calculate retention for subsequent days
            const retentionByDay = [];
            
            // Day 0 (initial users)
            retentionByDay.push({ 
              day: 0, 
              value: initialUsers,
              percentage: '100.0'
            });
            
            // Calculate retention for each subsequent day
            for (let j = 1; j <= maxDays; j++) {
              const retentionDate = new Date(currentDate);
              retentionDate.setDate(currentDate.getDate() + j);
              
              // Skip if we're looking beyond today
              if (retentionDate > today) {
                retentionByDay.push({ day: j, value: null, percentage: null });
                continue;
              }
              
              const retentionDayStart = new Date(retentionDate);
              retentionDayStart.setHours(0, 0, 0, 0);
              const retentionDayEnd = new Date(retentionDate);
              retentionDayEnd.setHours(23, 59, 59, 999);
              
              // Get sessions for the retention day
              const retentionDaySessions = allSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= retentionDayStart && sessionDate <= retentionDayEnd;
              });
              
              // Get unique user IDs for retention day
              const retentionDayUserIds = [...new Set(retentionDaySessions.map(session => session.userId).filter(Boolean))];
              
              // Find returning users
              const returningUserIds = dayUniqueUserIds.filter(userId => 
                retentionDayUserIds.includes(userId)
              );
              
              // Calculate retention value and percentage
              const retentionValue = returningUserIds.length;
              const retentionPercentage = initialUsers > 0 
                ? ((retentionValue / initialUsers) * 100).toFixed(1)
                : '0.0';
              
              retentionByDay.push({ 
                day: j, 
                value: retentionValue,
                percentage: retentionPercentage
              });
            }
            
            cohortData.push({
              date: formattedDate,
              initialUsers: initialUsers,
              retentionByDay: retentionByDay
            });
          }
          
          return cohortData;
        };
        
        const processedData = {
          cohortData: processCohortData()
        };
        
        setRetentionData(processedData);
      } catch (error) {
        console.error("Error processing analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (analytics) {
      processAnalyticsData();
    }
  }, [analytics, timeFrame]);

  // Get intensity color for cohort cell based on percentage
  const getCellColor = (percentage) => {
    if (percentage === null || percentage === undefined) return 'bg-gray-100';
    
    const value = parseFloat(percentage);
    if (value >= 80.0) return 'bg-green-600 text-white';
    if (value >= 60.0) return 'bg-green-500 text-white';
    if (value >= 40.0) return 'bg-green-400';
    if (value >= 20.0) return 'bg-green-300';
    if (value > 0) return 'bg-green-200';
    return 'bg-gray-100';
  };

  // Format the retention value
  const formatRetentionValue = (value, percentage) => {
    if (value === null || value === undefined) return '-';
    if (percentage !== null && percentage !== undefined) {
      return `${value} (${percentage}%)`;
    }
    return value.toString();
  };

  if (isLoading || !retentionData) {
    return (
      <div className="w-full flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h3 className="text-md md:text-lg font-semibold">Visitors Retention</h3>
          <p className="text-xs md:text-sm text-gray-500">
            Shows how many unique users return to your site over time
          </p>
        </div>
        
        <div className="self-start sm:self-center">
          <select 
            className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm"
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
          >
            <option value="daily">Last 24 Hours</option>
            <option value="weekly">Last 7 Days</option>
            <option value="monthly">Last 30 Days</option>
            <option value="yearly">Last 365 Days</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <table className="min-w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr>
                <th className="p-1 md:p-2 bg-gray-50 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10">
                  Date
                </th>
                <th className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initial Users
                </th>
                {Array.from({ length: retentionData.cohortData[0]?.retentionByDay.length || 0 }, (_, i) => (
                  <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {i === 0 ? 'Day 0' : `Day ${i}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retentionData.cohortData.map((cohort, index) => (
                <tr key={index}>
                  <td className="p-1 md:p-2 border bg-gray-50 sticky left-0 z-10">
                    <div className="font-medium text-xs md:text-sm">{cohort.date}</div>
                    <div className="text-xs text-gray-500">Users: {cohort.initialUsers}</div>
                  </td>
                  <td className="p-1 md:p-2 border text-center bg-gray-100">
                    {cohort.initialUsers}
                  </td>
                  {cohort.retentionByDay.map((day, dayIndex) => (
                    <td 
                      key={dayIndex} 
                      className={`p-1 md:p-2 border text-center ${getCellColor(day.percentage)}`}
                    >
                      {formatRetentionValue(day.value, day.percentage)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RetentionAnalytics;