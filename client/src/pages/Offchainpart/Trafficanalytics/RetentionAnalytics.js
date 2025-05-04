import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RetentionAnalytics = ({analytics, setanalytics}) => {
  const [timeFrame, setTimeFrame] = useState('Last 7 Days');
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
        
        // Calculate DAU - Users active in the current calendar day
        const dailyActiveUserIds = new Set();
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        allSessions.forEach(session => {
          const sessionDate = new Date(session.startTime);
          if (sessionDate >= todayStart && sessionDate <= todayEnd && session.userId) {
            dailyActiveUserIds.add(session.userId);
          }
        });
        const dailyActiveUsers = dailyActiveUserIds.size;
        
        // Calculate WAU - Users active in the last 7 calendar days
        const weeklyActiveUserIds = new Set();
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        
        allSessions.forEach(session => {
          const sessionDate = new Date(session.startTime);
          if (sessionDate >= weekStart && sessionDate <= todayEnd && session.userId) {
            weeklyActiveUserIds.add(session.userId);
          }
        });
        const weeklyActiveUsers = weeklyActiveUserIds.size;
        
        // Calculate MAU - Users active in the last 30 calendar days
        const monthlyActiveUserIds = new Set();
        const monthStart = new Date(todayStart);
        monthStart.setDate(monthStart.getDate() - 29);
        
        allSessions.forEach(session => {
          const sessionDate = new Date(session.startTime);
          if (sessionDate >= monthStart && sessionDate <= todayEnd && session.userId) {
            monthlyActiveUserIds.add(session.userId);
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
          
          // Get all unique dates from sessions
          const dates = new Set(allSessions.map(session => {
            const date = new Date(session.startTime);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }));
          
          // Process each date
          [...dates].sort((a, b) => {
            const [aDay, aMonth] = a.split('/').map(Number);
            const [bDay, bMonth] = b.split('/').map(Number);
            return aMonth === bMonth ? aDay - bDay : aMonth - bMonth;
          }).forEach(formattedDate => {
            const [day, month] = formattedDate.split('/').map(Number);
            const currentDate = new Date(now.getFullYear(), month - 1, day);
            
            // Calculate DAU for this date
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dauUsers = new Set();
            allSessions.forEach(session => {
              const sessionDate = new Date(session.startTime);
              if (sessionDate >= dayStart && sessionDate <= dayEnd && session.userId) {
                dauUsers.add(session.userId);
              }
            });
            
            // Calculate WAU for this date (last 7 days from this date)
            const wauUsers = new Set();
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0);
            
            allSessions.forEach(session => {
              const sessionDate = new Date(session.startTime);
              if (sessionDate >= weekStart && sessionDate <= dayEnd && session.userId) {
                wauUsers.add(session.userId);
              }
            });
            
            // Calculate MAU for this date (last 30 days from this date)
            const mauUsers = new Set();
            const monthStart = new Date(currentDate);
            monthStart.setDate(monthStart.getDate() - 29);
            monthStart.setHours(0, 0, 0, 0);
            
            allSessions.forEach(session => {
              const sessionDate = new Date(session.startTime);
              if (sessionDate >= monthStart && sessionDate <= dayEnd && session.userId) {
                mauUsers.add(session.userId);
              }
            });
            
            chartData.push({
              month: formattedDate,
              DAU: dauUsers.size,
              WAU: wauUsers.size,
              MAU: mauUsers.size
            });
          });
          
          return chartData;
        };
        
        // Get the chart data from analytics
        const chartData = processChartData();
        
        // Process cohort data for the past 7 days
        const processCohortData = (timeFrame, allSessions) => {
          const cohortData = [];
          
          // Get the first and last session dates
          const sessionDates = allSessions.map(session => new Date(session.startTime));
          const firstSessionDate = new Date(Math.min(...sessionDates));
          const lastSessionDate = new Date(Math.max(...sessionDates));
          
          // Configure time periods based on selected timeframe
          const timeFrameConfig = {
            'Last 7 Days': {
              periods: 7,
              periodType: 'day',
              periodLength: 1,
              getStart: (date) => {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                return start;
              },
              getEnd: (date) => {
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                return end;
              },
              formatLabel: (date) => {
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              },
              getNextPeriod: (date) => {
                const next = new Date(date);
                next.setDate(next.getDate() + 1);
                return next;
              }
            },
            'Last Month': {
              periods: 4,
              periodType: 'week',
              periodLength: 7,
              getStart: (date) => {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                // Align to week start (Monday)
                const day = start.getDay();
                const diff = day === 0 ? 6 : day - 1;
                start.setDate(start.getDate() - diff);
                return start;
              },
              getEnd: (date) => {
                const end = new Date(date);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return end;
              },
              formatLabel: (date) => {
                const startDate = new Date(date);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 6);
                return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              },
              getNextPeriod: (date) => {
                const next = new Date(date);
                next.setDate(next.getDate() + 7);
                return next;
              }
            },
            'Last 3 Months': {
              periods: 3,
              periodType: 'month',
              periodLength: 30,
              getStart: (date) => {
                const start = new Date(date);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                return start;
              },
              getEnd: (date) => {
                const end = new Date(date);
                end.setMonth(end.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                return end;
              },
              formatLabel: (date) => {
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              },
              getNextPeriod: (date) => {
                const next = new Date(date);
                next.setMonth(next.getMonth() + 1);
                next.setDate(1);
                return next;
              }
            },
            'Last Year': {
              periods: 12,
              periodType: 'month',
              periodLength: 30,
              getStart: (date) => {
                const start = new Date(date);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                return start;
              },
              getEnd: (date) => {
                const end = new Date(date);
                end.setMonth(end.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                return end;
              },
              formatLabel: (date) => {
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              },
              getNextPeriod: (date) => {
                const next = new Date(date);
                next.setMonth(next.getMonth() + 1);
                next.setDate(1);
                return next;
              }
            }
          };

          const config = timeFrameConfig[timeFrame] || timeFrameConfig['Last 7 Days'];
          const { periods, periodType, getStart, getEnd, formatLabel, getNextPeriod } = config;

          // Start from the first session date
          let currentPeriodStart = getStart(firstSessionDate);
          let currentPeriodEnd = getEnd(currentPeriodStart);
          
          // Process data for each period
          while (currentPeriodStart <= lastSessionDate) {
            // Get sessions for this period
            const periodSessions = allSessions.filter(session => {
              const sessionDate = new Date(session.startTime);
              return sessionDate >= currentPeriodStart && sessionDate <= currentPeriodEnd;
            });

            // Get unique users for this period
            const uniqueUserIds = [...new Set(periodSessions.map(session => session.userId))];
            const initialUsers = uniqueUserIds.length;

            if (initialUsers > 0) {
              // Calculate retention for subsequent periods
              const retentionByDay = [];
              retentionByDay.push({ day: 0, value: initialUsers, percentage: '100.0' });

              // Calculate retention for each subsequent period
              let nextRetentionStart = getNextPeriod(currentPeriodStart);
              let nextRetentionEnd = getEnd(nextRetentionStart);
              let dayIndex = 1;

              while (dayIndex < periods && nextRetentionStart <= lastSessionDate) {
                const retentionSessions = allSessions.filter(session => {
                  const sessionDate = new Date(session.startTime);
                  return sessionDate >= nextRetentionStart && sessionDate <= nextRetentionEnd;
                });

                const retentionUserIds = [...new Set(retentionSessions.map(session => session.userId))];
                const returningUsers = uniqueUserIds.filter(userId => retentionUserIds.includes(userId));
                const retentionValue = returningUsers.length;
                const retentionPercentage = ((retentionValue / initialUsers) * 100).toFixed(1);

                retentionByDay.push({
                  day: dayIndex,
                  value: retentionValue,
                  percentage: retentionPercentage
                });

                nextRetentionStart = getNextPeriod(nextRetentionStart);
                nextRetentionEnd = getEnd(nextRetentionStart);
                dayIndex++;
              }

              // Fill remaining periods with null values
              while (retentionByDay.length < periods) {
                retentionByDay.push({
                  day: retentionByDay.length,
                  value: null,
                  percentage: null
                });
              }

              cohortData.push({
                date: formatLabel(currentPeriodStart),
                initialUsers,
                retentionByDay
              });
            }

            // Move to next period
            currentPeriodStart = getNextPeriod(currentPeriodStart);
            currentPeriodEnd = getEnd(currentPeriodStart);
          }

          return cohortData;
        };
        
        // Get cohort data
        const cohortData = processCohortData(timeFrame, allSessions);
        
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
    <div className="bg-gray-50 min-h-screen p-6 font-poppins">
      {/* Import the fonts in the head */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
      `}</style>

      <h1 className="text-2xl font-bold mb-6 font-montserrat">Retention Analytics</h1>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cohort Retention Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Cohort Retention Analysis</h2>
          {/* ... cohort retention content ... */}
        </div>
        
        {/* User Return Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">User Return Rate</h2>
          {/* ... user return rate content ... */}
        </div>
        
        {/* Retention by Traffic Source */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Retention by Traffic Source</h2>
          {/* ... retention by traffic source content ... */}
        </div>
        
        {/* Web3 User Retention */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 font-montserrat">Web3 User Retention</h2>
          {/* ... web3 user retention content ... */}
        </div>
        
      </div>
    </div>
  );
};

export default RetentionAnalytics;