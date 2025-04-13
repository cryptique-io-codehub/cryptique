import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetentionAnalytics = ({analytics, setanalytics}) => {
  const [timeFrame, setTimeFrame] = useState('This Month');
  const [retentionData, setRetentionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Process the actual analytics data
    const processAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Calculate metrics from real analytics data
        const now = new Date();
        
        // Extract sessions from the new data structure
        const allSessions = analytics.sessions || [];
        
        // Extract daily stats
        const dailyStatsData = analytics.dailyStats && analytics.dailyStats.analyticsSnapshot 
          ? analytics.dailyStats.analyticsSnapshot 
          : [];
        
        // Extract weekly stats
        const weeklyStatsData = analytics.weeklyStats && analytics.weeklyStats.analyticsSnapshot 
          ? analytics.weeklyStats.analyticsSnapshot 
          : [];
        
        // Extract monthly stats
        const monthlyStatsData = analytics.monthlyStats && analytics.monthlyStats.analyticsSnapshot 
          ? analytics.monthlyStats.analyticsSnapshot 
          : [];
        
        // Calculate DAU - All unique users across all dailyStatsData elements
        const dailyActiveUserIds = new Set();
        dailyStatsData.forEach(snapshot => {
          // Check if analyticsId exists and has sessions
          if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
            snapshot.analyticsId.sessions.forEach(session => {
              if (session.userId) {
                dailyActiveUserIds.add(session.userId);
              }
            });
          }
        });
        const dailyActiveUsers = dailyActiveUserIds.size;
        
        // Calculate WAU - All unique users across all weeklyStatsData elements
        const weeklyActiveUserIds = new Set();
        weeklyStatsData.forEach(snapshot => {
          if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
            snapshot.analyticsId.sessions.forEach(session => {
              if (session.userId) {
                weeklyActiveUserIds.add(session.userId);
              }
            });
          }
        });
        const weeklyActiveUsers = weeklyActiveUserIds.size;
        
        // Calculate MAU - All unique users across all monthlyStatsData elements
        const monthlyActiveUserIds = new Set();
        monthlyStatsData.forEach(snapshot => {
          if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
            snapshot.analyticsId.sessions.forEach(session => {
              if (session.userId) {
                monthlyActiveUserIds.add(session.userId);
              }
            });
          }
        });
        const monthlyActiveUsers = monthlyActiveUserIds.size;
        
        // Use the data directly from analytics if no daily/weekly/monthly stats found
        if (dailyActiveUsers === 0 && analytics.userId) {
          dailyActiveUserIds.add(...analytics.userId);
        }
        if (weeklyActiveUsers === 0 && analytics.userId) {
          weeklyActiveUserIds.add(...analytics.userId);
        }
        if (monthlyActiveUsers === 0 && analytics.userId) {
          monthlyActiveUserIds.add(...analytics.userId);
        }
        
        // Determine top country for each time period by counting userIds by country
        const getTopCountry = (userIds, sessions) => {
          const countryUserCounts = {};
          
          // Filter sessions to only include those from the provided userIds
          const relevantSessions = sessions.filter(session => 
            userIds.has(session.userId)
          );
          
          // Count distinct userIds per country
          relevantSessions.forEach(session => {
            // Use the actual country from the session if available
            const country = session.country || 'Unknown';
            
            if (!countryUserCounts[country]) {
              countryUserCounts[country] = new Set();
            }
            countryUserCounts[country].add(session.userId);
          });
          
          // Find country with most distinct users
          let maxCount = 0;
          let topCountry = 'Unknown';
          
          Object.entries(countryUserCounts).forEach(([country, userIdSet]) => {
            const count = userIdSet.size;
            if (count > maxCount) {
              maxCount = count;
              topCountry = country;
            }
          });
          
          // Map of country codes to country names and flags
          const countryMap = {
            'IN': { name: 'India', flag: '🇮🇳' },
            'US': { name: 'United States', flag: '🇺🇸' },
            'GB': { name: 'United Kingdom', flag: '🇬🇧' },
            'CA': { name: 'Canada', flag: '🇨🇦' },
            'DE': { name: 'Germany', flag: '🇩🇪' },
            'AU': { name: 'Australia', flag: '🇦🇺' },
            'FR': { name: 'France', flag: '🇫🇷' },
            'JP': { name: 'Japan', flag: '🇯🇵' },
            'CN': { name: 'China', flag: '🇨🇳' },
            'BR': { name: 'Brazil', flag: '🇧🇷' },
            'Unknown': { name: 'Unknown', flag: '🌍' }
          };
          
          const countryInfo = countryMap[topCountry] || { name: topCountry, flag: '🌍' };
          
          return { 
            name: countryInfo.name, 
            flag: countryInfo.flag
          };
        };
        
        // Get top countries for each time period
        const dailyTopCountry = getTopCountry(dailyActiveUserIds, allSessions);
        const weeklyTopCountry = getTopCountry(weeklyActiveUserIds, allSessions);
        const monthlyTopCountry = getTopCountry(monthlyActiveUserIds, allSessions);
        
        // Calculate growth percentage (placeholder - would need historical data)
        const calculateGrowth = (value) => {
          // In a real app, you'd compare to previous period
          // For now we'll just return random reasonable values
          return `${(Math.random() * 5 + 1).toFixed(1)}% Increase`;
        };
        
        // Process daily, weekly, and monthly stats for the chart
        const processChartData = () => {
          const chartData = [];
          
          // Process dailyStats
          dailyStatsData.forEach(snapshot => {
            if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
              // Get distinct user IDs from this daily stat
              const distinctUserIds = new Set();
              snapshot.analyticsId.sessions.forEach(session => {
                if (session.userId) {
                  distinctUserIds.add(session.userId);
                }
              });
              
              // Format the date for display in dd/mm format
              const date = new Date(snapshot.hour);
              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
              
              // Add to chart data
              chartData.push({
                month: formattedDate, // Using date as the x-axis label
                DAU: distinctUserIds.size,
                // We'll add WAU and MAU when processing those stats
              });
            }
          });
          
          // Process weeklyStats and update matching dates or add new entries
          weeklyStatsData.forEach(snapshot => {
            if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
              const distinctUserIds = new Set();
              snapshot.analyticsId.sessions.forEach(session => {
                if (session.userId) {
                  distinctUserIds.add(session.userId);
                }
              });
              
              const date = new Date(snapshot.hour);
              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
              
              // Check if we already have this date in chartData
              const existingEntry = chartData.find(entry => entry.month === formattedDate);
              if (existingEntry) {
                existingEntry.WAU = distinctUserIds.size;
              } else {
                chartData.push({
                  month: formattedDate,
                  WAU: distinctUserIds.size,
                });
              }
            }
          });
          
          // Process monthlyStats and update matching dates or add new entries
          monthlyStatsData.forEach(snapshot => {
            if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
              const distinctUserIds = new Set();
              snapshot.analyticsId.sessions.forEach(session => {
                if (session.userId) {
                  distinctUserIds.add(session.userId);
                }
              });
              
              const date = new Date(snapshot.hour);
              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
              
              // Check if we already have this date in chartData
              const existingEntry = chartData.find(entry => entry.month === formattedDate);
              if (existingEntry) {
                existingEntry.MAU = distinctUserIds.size;
              } else {
                chartData.push({
                  month: formattedDate,
                  MAU: distinctUserIds.size,
                });
              }
            }
          });
          
          // If no chart data found yet, use direct analytics data
          if (chartData.length === 0 && analytics.userId && analytics.userId.length > 0) {
            const today = new Date();
            const formattedDate = `${today.getDate()}/${today.getMonth() + 1}`;
            
            chartData.push({
              month: formattedDate,
              DAU: analytics.userId.length,
              WAU: analytics.userId.length,
              MAU: analytics.userId.length,
            });
          }
          
          // Sort chart data by date
          chartData.sort((a, b) => {
            const [aDay, aMonth] = a.month.split('/').map(Number);
            const [bDay, bMonth] = b.month.split('/').map(Number);
            
            if (aMonth !== bMonth) {
              return aMonth - bMonth;
            }
            return aDay - bDay;
          });
          
          // Ensure all entries have DAU, WAU, MAU (even if 0)
          chartData.forEach(entry => {
            entry.DAU = entry.DAU || 0;
            entry.WAU = entry.WAU || 0;
            entry.MAU = entry.MAU || 0;
          });
          
          return chartData;
        };
        
        // Get the chart data from analytics
        const chartData = processChartData();
        
        // Process cohort data for the past 7 days
        const processCohortData = () => {
          const cohortData = [];
          const today = new Date();
          
          // Process data for past 7 days
          for (let i = 6; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            
            // Format the date for display in dd/mm format
            const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
            
            // Filter sessions for this day to get initial user count
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daysSessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
            // Get unique user IDs for this day (initial users)
            const dayUniqueUserIds = [...new Set(daysSessions.map(session => session.userId))];
            const initialUsers = dayUniqueUserIds.length;
            
            if (initialUsers === 0) {
              continue; // Skip days with no users
            }
            
            // Calculate retention for subsequent days
            const retentionByDay = [];
            
            // Day 0 is not showing 100% as requested
            retentionByDay.push({ day: 0, value: initialUsers });
            
            // Calculate retention for each subsequent day
            for (let j = 1; j <= 7; j++) {
              // Skip if we're looking beyond today
              if (i - j < 0) {
                retentionByDay.push({ day: j, value: null });
                continue;
              }
              
              const retentionDate = new Date(currentDate);
              retentionDate.setDate(currentDate.getDate() + j);
              
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
              const retentionDayUserIds = [...new Set(retentionDaySessions.map(session => session.userId))];
              
              // Find returning users (intersection of day 0 and current day)
              const returningUserIds = dayUniqueUserIds.filter(userId => 
                retentionDayUserIds.includes(userId)
              );
              
              // Calculate retention value - number of returning users
              const retentionValue = returningUserIds.length;
              
              // Calculate retention percentage
              const retentionPercentage = initialUsers > 0 
                ? (retentionValue / initialUsers) * 100 
                : 0;
              
              retentionByDay.push({ 
                day: j, 
                value: retentionValue, 
                percentage: retentionPercentage.toFixed(1)
              });
            }
            
            // Add cohort data for this day
            cohortData.push({
              date: formattedDate,
              initialUsers: initialUsers,
              retentionByDay: retentionByDay
            });
          }
          
          // If no cohort data was generated, create a single entry for today
          if (cohortData.length === 0 && analytics.userId && analytics.userId.length > 0) {
            const today = new Date();
            const formattedDate = `${today.getDate()}/${today.getMonth() + 1}`;
            
            cohortData.push({
              date: formattedDate,
              initialUsers: analytics.userId.length,
              retentionByDay: Array.from({ length: 8 }, (_, i) => ({
                day: i,
                value: i === 0 ? analytics.userId.length : 0,
                percentage: i === 0 ? '100.0' : '0.0'
              }))
            });
          }
          
          return cohortData;
        };
        
        // Get cohort data
        const cohortData = processCohortData();
        
        // If we don't have any chart data, use a placeholder
        const finalChartData = chartData.length > 0 ? chartData : [
          { month: 'No Data', DAU: 0, WAU: 0, MAU: 0 }
        ];
        
        // Create the data object with real analytics
        const processedData = {
          summaryCards: [
            { 
              title: 'Daily Active Users', 
              value: dailyActiveUsers ? dailyActiveUsers.toLocaleString() : (analytics.userId ? analytics.userId.length.toLocaleString() : '0'), 
              // increase: calculateGrowth(dailyActiveUsers),
              country: dailyTopCountry.name,
              flag: dailyTopCountry.flag
            },
            { 
              title: 'Weekly Active Users', 
              value: weeklyActiveUsers ? weeklyActiveUsers.toLocaleString() : (analytics.userId ? analytics.userId.length.toLocaleString() : '0'), 
              // increase: calculateGrowth(weeklyActiveUsers),
              country: weeklyTopCountry.name,
              flag: weeklyTopCountry.flag
            },
            { 
              title: 'Monthly Active Users', 
              value: monthlyActiveUsers ? monthlyActiveUsers.toLocaleString() : (analytics.userId ? analytics.userId.length.toLocaleString() : '0'), 
              // increase: calculateGrowth(monthlyActiveUsers),
              country: monthlyTopCountry.name,
              flag: monthlyTopCountry.flag
            }
          ],
          // Use the dynamic chart data instead of hardcoded values
          retentionChart: finalChartData,
          // Use dynamic cohort data
          cohortData: cohortData.length > 0 ? cohortData : [
            { 
              date: 'No Data', 
              initialUsers: 0,
              retentionByDay: [
                { day: 0, value: 0 },
                { day: 1, value: 0 },
                { day: 2, value: 0 },
                { day: 3, value: 0 },
                { day: 4, value: 0 },
                { day: 5, value: 0 },
                { day: 6, value: 0 },
                { day: 7, value: 0 }
              ]
            }
          ]
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
  const getCellColor = (value, initialUsers) => {
    if (value === null || value === undefined) return 'bg-gray-100';
    if (value === initialUsers) return 'bg-gray-100';
    
    // Calculate percentage for color intensity
    const percentage = initialUsers > 0 ? (value / initialUsers) * 100 : 0;
    
    // Create a color gradient from light green to dark green
    if (percentage >= 50.0) return 'bg-green-500 text-white';
    if (percentage >= 30.0) return 'bg-green-400 text-white';
    if (percentage >= 20.0) return 'bg-green-300';
    if (percentage >= 10.0) return 'bg-green-200';
    if (percentage > 0) return 'bg-green-100';
    return 'bg-gray-100';
  };

  // Format the retention value to show returning users count
  const formatRetentionValue = (value, percentage) => {
    if (value === null || value === undefined) return '-';
    if (percentage !== undefined) {
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
            <p className="text-xs md:text-sm text-gray-500">The retention rate shows how many unique users return to your site on subsequent days</p>
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
                      {i === 0 ? 'Initial' : `Day ${i}`}
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
                    {cohort.retentionByDay.slice(0, 8).map((day, dayIndex) => (
                      <td 
                        key={dayIndex} 
                        className={`p-1 md:p-2 border text-center ${getCellColor(day.value, cohort.initialUsers)}`}
                      >
                        {formatRetentionValue(day.value, day.percentage)}
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
      </div>
    </div>
  );
};

export default RetentionAnalytics;