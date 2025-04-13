import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetentionAnalytics = ({analytics, setanalytics}) => {
  const [timeFrame, setTimeFrame] = useState('Last 7 days');
  const [retentionData, setRetentionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Process the actual analytics data
    const processAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        const now = new Date();
        
        // Extract sessions from the new data structure
        const allSessions = analytics.sessions || [];
        
        // Calculate DAU (last 24 hours)
        const dauStartDate = new Date(now - 24 * 60 * 60 * 1000);
        const dauSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= dauStartDate && sessionDate <= now;
        });
        const dailyActiveUserIds = new Set(dauSessions.map(session => session.userId).filter(Boolean));
        const dailyActiveUsers = dailyActiveUserIds.size;
        
        // Calculate WAU (last 7 days)
        const wauStartDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const wauSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= wauStartDate && sessionDate <= now;
        });
        const weeklyActiveUserIds = new Set(wauSessions.map(session => session.userId).filter(Boolean));
        const weeklyActiveUsers = weeklyActiveUserIds.size;
        
        // Calculate MAU (last 30 days)
        const mauStartDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const mauSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= mauStartDate && sessionDate <= now;
        });
        const monthlyActiveUserIds = new Set(mauSessions.map(session => session.userId).filter(Boolean));
        const monthlyActiveUsers = monthlyActiveUserIds.size;
        
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
        
        // Process chart data for DAU, WAU, MAU
        const processChartData = () => {
          const chartData = [];
          const today = new Date();
          
          // Generate data points for the last 30 days
          for (let i = 29; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            
            // Format the date for display
            const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
            
            // Calculate DAU for this day
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const daySessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
            const dayUserIds = new Set(daySessions.map(session => session.userId).filter(Boolean));
            const dau = dayUserIds.size;
            
            // Calculate WAU for the 7 days ending on this day
            const wauStart = new Date(currentDate);
            wauStart.setDate(currentDate.getDate() - 6);
            wauStart.setHours(0, 0, 0, 0);
            
            const wauSessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= wauStart && sessionDate <= dayEnd;
            });
            
            const wauUserIds = new Set(wauSessions.map(session => session.userId).filter(Boolean));
            const wau = wauUserIds.size;
            
            // Calculate MAU for the 30 days ending on this day
            const mauStart = new Date(currentDate);
            mauStart.setDate(currentDate.getDate() - 29);
            mauStart.setHours(0, 0, 0, 0);
            
            const mauSessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= mauStart && sessionDate <= dayEnd;
            });
            
            const mauUserIds = new Set(mauSessions.map(session => session.userId).filter(Boolean));
            const mau = mauUserIds.size;
            
            chartData.push({
              date: formattedDate,
              dau: dau,
              wau: wau,
              mau: mau
            });
          }
          
          return chartData;
        };
        
        const chartData = processChartData();
        
        // Process cohort data based on selected timeframe
        const processCohortData = () => {
          const cohortData = [];
          const today = new Date();
          
          switch (timeFrame) {
            case 'Last 7 days':
          // Process data for past 7 days
          for (let i = 6; i >= 0; i--) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            
                // Format the date for display
            const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
            
                // Filter sessions for this day
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
                const daySessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= dayStart && sessionDate <= dayEnd;
            });
            
                const dayUserIds = new Set(daySessions.map(session => session.userId).filter(Boolean));
                const initialUsers = dayUserIds.size;
                
            const retentionByDay = [];
            retentionByDay.push({ day: 0, value: initialUsers });
            
                // Calculate retention for next 7 days
            for (let j = 1; j <= 7; j++) {
                  const retentionDate = new Date(currentDate);
                  retentionDate.setDate(currentDate.getDate() + j);
                  
                  if (retentionDate > today) {
                retentionByDay.push({ day: j, value: null });
                continue;
              }
              
              const retentionDayStart = new Date(retentionDate);
              retentionDayStart.setHours(0, 0, 0, 0);
              const retentionDayEnd = new Date(retentionDate);
              retentionDayEnd.setHours(23, 59, 59, 999);
              
                  const retentionSessions = allSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= retentionDayStart && sessionDate <= retentionDayEnd;
              });
              
                  const retentionUserIds = new Set(retentionSessions.map(session => session.userId).filter(Boolean));
                  const returningUsers = [...dayUserIds].filter(id => retentionUserIds.has(id)).length;
              
              retentionByDay.push({ 
                day: j, 
                    value: returningUsers,
                    percentage: initialUsers > 0 ? ((returningUsers / initialUsers) * 100).toFixed(1) : '0.0'
              });
            }
            
            cohortData.push({
              date: formattedDate,
              initialUsers: initialUsers,
              retentionByDay: retentionByDay
            });
          }
              break;
              
            case 'Last Month':
              // Process data for past 5 weeks
              for (let i = 4; i >= 0; i--) {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - (i * 7));
                weekStart.setHours(0, 0, 0, 0);
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                
                const weekSessions = allSessions.filter(session => {
                  const sessionDate = new Date(session.startTime);
                  return sessionDate >= weekStart && sessionDate <= weekEnd;
                });
                
                const weekUserIds = new Set(weekSessions.map(session => session.userId).filter(Boolean));
                const initialUsers = weekUserIds.size;
                
                const retentionByWeek = [];
                retentionByWeek.push({ week: 0, value: initialUsers });
                
                // Calculate retention for next 5 weeks
                for (let j = 1; j <= 5; j++) {
                  const retentionWeekStart = new Date(weekStart);
                  retentionWeekStart.setDate(weekStart.getDate() + (j * 7));
                  const retentionWeekEnd = new Date(retentionWeekStart);
                  retentionWeekEnd.setDate(retentionWeekStart.getDate() + 6);
                  retentionWeekEnd.setHours(23, 59, 59, 999);
                  
                  if (retentionWeekStart > today) {
                    retentionByWeek.push({ week: j, value: null });
                    continue;
                  }
                  
                  const retentionSessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.startTime);
                    return sessionDate >= retentionWeekStart && sessionDate <= retentionWeekEnd;
                  });
                  
                  const retentionUserIds = new Set(retentionSessions.map(session => session.userId).filter(Boolean));
                  const returningUsers = [...weekUserIds].filter(id => retentionUserIds.has(id)).length;
                  
                  retentionByWeek.push({ 
                    week: j, 
                    value: returningUsers,
                    percentage: initialUsers > 0 ? ((returningUsers / initialUsers) * 100).toFixed(1) : '0.0'
                  });
                }
                
                cohortData.push({
                  date: `Week ${5 - i}`,
                  initialUsers: initialUsers,
                  retentionByWeek: retentionByWeek
                });
              }
              break;
              
            case 'Last 3 months':
              // Process data for past 3 months
              for (let i = 2; i >= 0; i--) {
                const monthStart = new Date(today);
                monthStart.setMonth(today.getMonth() - i);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthStart.getMonth() + 1);
                monthEnd.setDate(0);
                monthEnd.setHours(23, 59, 59, 999);
                
                const monthSessions = allSessions.filter(session => {
                  const sessionDate = new Date(session.startTime);
                  return sessionDate >= monthStart && sessionDate <= monthEnd;
                });
                
                const monthUserIds = new Set(monthSessions.map(session => session.userId).filter(Boolean));
                const initialUsers = monthUserIds.size;
                
                const retentionByMonth = [];
                retentionByMonth.push({ month: 0, value: initialUsers });
                
                // Calculate retention for next 3 months
                for (let j = 1; j <= 3; j++) {
                  const retentionMonthStart = new Date(monthStart);
                  retentionMonthStart.setMonth(monthStart.getMonth() + j);
                  const retentionMonthEnd = new Date(retentionMonthStart);
                  retentionMonthEnd.setMonth(retentionMonthStart.getMonth() + 1);
                  retentionMonthEnd.setDate(0);
                  retentionMonthEnd.setHours(23, 59, 59, 999);
                  
                  if (retentionMonthStart > today) {
                    retentionByMonth.push({ month: j, value: null });
                    continue;
                  }
                  
                  const retentionSessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.startTime);
                    return sessionDate >= retentionMonthStart && sessionDate <= retentionMonthEnd;
                  });
                  
                  const retentionUserIds = new Set(retentionSessions.map(session => session.userId).filter(Boolean));
                  const returningUsers = [...monthUserIds].filter(id => retentionUserIds.has(id)).length;
                  
                  retentionByMonth.push({ 
                    month: j, 
                    value: returningUsers,
                    percentage: initialUsers > 0 ? ((returningUsers / initialUsers) * 100).toFixed(1) : '0.0'
                  });
                }
                
                cohortData.push({
                  date: `Month ${3 - i}`,
                  initialUsers: initialUsers,
                  retentionByMonth: retentionByMonth
                });
              }
              break;
              
            case 'Last 12 months':
              // Process data for past 12 months
              for (let i = 11; i >= 0; i--) {
                const monthStart = new Date(today);
                monthStart.setMonth(today.getMonth() - i);
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthStart.getMonth() + 1);
                monthEnd.setDate(0);
                monthEnd.setHours(23, 59, 59, 999);
                
                const monthSessions = allSessions.filter(session => {
                  const sessionDate = new Date(session.startTime);
                  return sessionDate >= monthStart && sessionDate <= monthEnd;
                });
                
                const monthUserIds = new Set(monthSessions.map(session => session.userId).filter(Boolean));
                const initialUsers = monthUserIds.size;
                
                const retentionByMonth = [];
                retentionByMonth.push({ month: 0, value: initialUsers });
                
                // Calculate retention for next 12 months
                for (let j = 1; j <= 12; j++) {
                  const retentionMonthStart = new Date(monthStart);
                  retentionMonthStart.setMonth(monthStart.getMonth() + j);
                  const retentionMonthEnd = new Date(retentionMonthStart);
                  retentionMonthEnd.setMonth(retentionMonthStart.getMonth() + 1);
                  retentionMonthEnd.setDate(0);
                  retentionMonthEnd.setHours(23, 59, 59, 999);
                  
                  if (retentionMonthStart > today) {
                    retentionByMonth.push({ month: j, value: null });
                    continue;
                  }
                  
                  const retentionSessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.startTime);
                    return sessionDate >= retentionMonthStart && sessionDate <= retentionMonthEnd;
                  });
                  
                  const retentionUserIds = new Set(retentionSessions.map(session => session.userId).filter(Boolean));
                  const returningUsers = [...monthUserIds].filter(id => retentionUserIds.has(id)).length;
                  
                  retentionByMonth.push({ 
                    month: j, 
                    value: returningUsers,
                    percentage: initialUsers > 0 ? ((returningUsers / initialUsers) * 100).toFixed(1) : '0.0'
                  });
                }
            
            cohortData.push({
                  date: `Month ${12 - i}`,
                  initialUsers: initialUsers,
                  retentionByMonth: retentionByMonth
                });
              }
              break;
          }
          
          return cohortData;
        };
        
        const cohortData = processCohortData();
        
        // Create the data object
        const processedData = {
          summaryCards: [
            { 
              title: 'Daily Active Users', 
              value: dailyActiveUsers.toLocaleString(),
              country: dailyTopCountry.name,
              flag: dailyTopCountry.flag
            },
            { 
              title: 'Weekly Active Users', 
              value: weeklyActiveUsers.toLocaleString(),
              country: weeklyTopCountry.name,
              flag: weeklyTopCountry.flag
            },
            { 
              title: 'Monthly Active Users', 
              value: monthlyActiveUsers.toLocaleString(),
              country: monthlyTopCountry.name,
              flag: monthlyTopCountry.flag
            }
          ],
          retentionChart: chartData,
          cohortData: cohortData || []
        };
        
        setRetentionData(processedData);
      } catch (error) {
        console.error("Error processing analytics data:", error);
        // Set default data structure to prevent blank screen
        setRetentionData({
          summaryCards: [
            { title: 'Daily Active Users', value: '0', country: 'N/A', flag: '' },
            { title: 'Weekly Active Users', value: '0', country: 'N/A', flag: '' },
            { title: 'Monthly Active Users', value: '0', country: 'N/A', flag: '' }
          ],
          retentionChart: [],
          cohortData: []
        });
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
              <XAxis dataKey="date" tick={{ fontSize: '0.75rem' }} />
              <YAxis tick={{ fontSize: '0.75rem' }} />
              <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="dau" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="wau" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="mau" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Visitors Retention Section */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <h3 className="text-md md:text-lg font-semibold">Visitors retention</h3>
            <p className="text-xs md:text-sm text-gray-500">The retention rate shows how many unique users return to your site</p>
          </div>
          
          <div className="self-start sm:self-center">
            <select 
              className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
            >
              <option>Last 7 days</option>
              <option>Last Month</option>
              <option>Last 3 months</option>
              <option>Last 12 months</option>
            </select>
          </div>
        </div>
        
        {/* Retention Cohort Table */}
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="min-w-max">
            <table className="min-w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="p-1 md:p-2 bg-gray-50 border text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10">
                    {timeFrame === 'Last 7 days' ? 'Day' : 
                     timeFrame === 'Last Month' ? 'Week' : 'Month'}
                  </th>
                  {timeFrame === 'Last 7 days' ? (
                    Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {i === 0 ? 'Initial' : `Day ${i}`}
                    </th>
                    ))
                  ) : timeFrame === 'Last Month' ? (
                    Array.from({ length: 6 }, (_, i) => (
                      <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {i === 0 ? 'Initial' : `Week ${i}`}
                      </th>
                    ))
                  ) : timeFrame === 'Last 3 months' ? (
                    Array.from({ length: 4 }, (_, i) => (
                      <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {i === 0 ? 'Initial' : `Month ${i}`}
                      </th>
                    ))
                  ) : (
                    Array.from({ length: 13 }, (_, i) => (
                      <th key={i} className="p-1 md:p-2 bg-gray-50 border text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {i === 0 ? 'Initial' : `Month ${i}`}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {(retentionData?.cohortData || []).map((cohort, index) => (
                  <tr key={index}>
                    <td className="p-1 md:p-2 border bg-gray-50 sticky left-0 z-10">
                      <div className="font-medium text-xs md:text-sm">{cohort.date}</div>
                      <div className="text-xs text-gray-500">Users: {cohort.initialUsers}</div>
                    </td>
                    {timeFrame === 'Last 7 days' ? (
                      (cohort.retentionByDay || []).map((day, dayIndex) => (
                      <td 
                        key={dayIndex} 
                        className={`p-1 md:p-2 border text-center ${getCellColor(day.value, cohort.initialUsers)}`}
                      >
                        {formatRetentionValue(day.value, day.percentage)}
                      </td>
                      ))
                    ) : timeFrame === 'Last Month' ? (
                      (cohort.retentionByWeek || []).map((week, weekIndex) => (
                        <td 
                          key={weekIndex} 
                          className={`p-1 md:p-2 border text-center ${getCellColor(week.value, cohort.initialUsers)}`}
                        >
                          {formatRetentionValue(week.value, week.percentage)}
                        </td>
                      ))
                    ) : (
                      (cohort.retentionByMonth || []).map((month, monthIndex) => (
                        <td 
                          key={monthIndex} 
                          className={`p-1 md:p-2 border text-center ${getCellColor(month.value, cohort.initialUsers)}`}
                        >
                          {formatRetentionValue(month.value, month.percentage)}
                        </td>
                      ))
                    )}
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