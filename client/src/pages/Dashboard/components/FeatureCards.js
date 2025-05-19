import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Users, Trophy, LineChart, Clock, Zap, ArrowRight, ArrowUpRight } from "lucide-react";
import axios from "axios";
import axiosInstance from "../../../axiosInstance";
import sdkApi from "../../../utils/sdkApi";

export const FeatureCards = () => {
  const navigate = useNavigate();
  const selectedTeam = localStorage.getItem("selectedTeam") || "";
  const [websiteData, setWebsiteData] = useState({
    totalWebsites: 0,
    recentVisitors: 0,
    activeWebsites: 0,
    activeCampaigns: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Style definitions matching the brand
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968",  // Gold accent
    futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)"
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch websites for this team
        const teamId = selectedTeam;
        if (!teamId) return;

        const response = await axiosInstance.get(`/website/team/${teamId}`);
        
        if (response.data && response.data.websites) {
          const websites = response.data.websites;
          const activeWebs = websites.filter(site => site.isActive).length;
          
          // Get sample analytics data for the first website if available
          let visitorCount = 0;
          let campaignCount = 0;
          
          if (websites.length > 0) {
            const firstWebsite = websites[0];
            
            try {
              // Fetch analytics data
              const analyticsResponse = await sdkApi.getAnalytics(firstWebsite.siteId);
              if (analyticsResponse && analyticsResponse.analytics) {
                visitorCount = analyticsResponse.analytics.uniqueVisitors || 0;
              }
            } catch (err) {
              console.error("Error fetching analytics:", err);
            }
            
            try {
              // Fetch campaign data for the first website
              const campaignResponse = await axiosInstance.get(`/campaign/site/${firstWebsite.siteId}`);
              if (campaignResponse && campaignResponse.data && campaignResponse.data.campaigns) {
                campaignCount = campaignResponse.data.campaigns.length;
              }
            } catch (err) {
              console.error("Error fetching campaigns:", err);
              // If there's an error, we'll leave the campaign count at 0
            }
          }
          
          setWebsiteData({
            totalWebsites: websites.length,
            recentVisitors: visitorCount,
            activeWebsites: activeWebs,
            activeCampaigns: campaignCount
          });
        }
      } catch (error) {
        console.error("Error fetching website data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedTeam]);

  const dashboardCards = [
    {
      title: "Quick Setup Guide",
      description: "Learn how to add the Cryptique tracking script to your website",
      icon: <Zap size={20} style={{ color: styles.accentColor }} />,
      path: "https://cryptique.gitbook.io/cryptique",
      external: true,
      color: styles.primaryColor,
      textLight: true
    },
    {
      title: "Manage Websites",
      description: `You have ${websiteData.totalWebsites} registered websites`,
      icon: <LineChart size={20} style={{ color: styles.accentColor }} />,
      path: "manage-websites",
      external: false,
      metric: websiteData.totalWebsites,
      metricLabel: "Websites"
    },
    {
      title: "Recent Visitors",
      description: "Monitor your website traffic",
      icon: <Users size={20} style={{ color: styles.accentColor }} />,
      path: "offchain",
      external: false,
      metric: websiteData.recentVisitors,
      metricLabel: "Visitors"
    },
    {
      title: "Campaign Performance",
      description: "Track your marketing campaigns",
      icon: <Trophy size={20} style={{ color: styles.accentColor }} />,
      path: "campaigns",
      external: false,
      metric: websiteData.activeCampaigns,
      metricLabel: "Active"
    }
  ];

  const handleCardClick = (path, external) => {
    if (external) {
      window.open(path, '_blank');
    } else {
      navigate(`/${selectedTeam}/${path}`);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg p-5 shadow-sm animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
            <div className="flex justify-between items-end">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-5"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {dashboardCards.map((card, index) => (
        <div
          key={index}
          onClick={() => handleCardClick(card.path, card.external)}
          className={`rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full border border-gray-100`}
          style={{
            backgroundColor: index === 0 ? styles.primaryColor : 'white',
            color: index === 0 ? 'white' : 'inherit'
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-lg ${index === 0 ? 'text-white' : ''}`}>
                {card.title}
              </h3>
              <div className={`p-1.5 rounded-full ${index === 0 ? 'bg-white/10' : `bg-${styles.primaryColor}/10`}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-sm ${index === 0 ? 'text-white/80' : 'text-gray-500'} mb-4`}>
              {card.description}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            {card.metric !== undefined && (
              <div>
                <span className="text-2xl font-semibold">{card.metric}</span>
                <span className={`text-xs ml-1 ${index === 0 ? 'text-white/70' : 'text-gray-500'}`}>{card.metricLabel}</span>
              </div>
            )}
            
            <div className={`flex items-center text-sm font-medium ${index === 0 ? 'text-white' : ''}`}>
              {card.external ? (
                <ExternalLink size={16} className={index === 0 ? 'text-white' : ''} />
              ) : (
                <ArrowRight size={16} className={index === 0 ? 'text-white' : ''} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};