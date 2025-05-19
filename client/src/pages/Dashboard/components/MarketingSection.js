import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Database, LineChart, Activity, ExternalLink } from 'lucide-react';

const MarketingSection = () => {
  const navigate = useNavigate();
  const selectedTeam = localStorage.getItem("selectedTeam") || "";

  // Style definitions matching the brand
  const styles = {
    primaryColor: "#1d0c46", // Deep purple
    accentColor: "#caa968",  // Gold accent
    futuristicGradient: "linear-gradient(135deg, #1d0c46 0%, #3a1d8a 50%, #1d0c46 100%)"
  };

  return (
    <div className="rounded-xl overflow-hidden mb-6">
      {/* Hero Banner */}
      <div 
        className="p-8 text-white relative overflow-hidden"
        style={{
          background: styles.futuristicGradient,
          borderRadius: '0.75rem',
          boxShadow: '0 10px 25px rgba(29, 12, 70, 0.2)'
        }}
      >
        {/* Decorative elements - abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/3 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/3"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Welcome to Cryptique Analytics
          </h1>
          <p className="text-lg opacity-90 max-w-2xl mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Track both on-chain and off-chain user behavior with a comprehensive analytics platform built for Web3.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate(`/${selectedTeam}/offchain`)}
              className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ 
                backgroundColor: styles.accentColor, 
                color: styles.primaryColor
              }}
            >
              Explore Analytics
            </button>
            <a 
              href="https://cryptique.gitbook.io/cryptique" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg font-medium text-sm bg-white/10 backdrop-blur-sm text-white transition-all hover:bg-white/20 hover:shadow-lg hover:-translate-y-1 flex items-center"
            >
              Documentation
              <ExternalLink size={16} className="ml-2" />
            </a>
          </div>
        </div>
      </div>

      {/* Key features section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          {
            title: "Off-chain Analytics",
            description: "Track website visitors, traffic sources, and user behavior",
            icon: <BarChart2 style={{ color: styles.accentColor }} />,
            path: "offchain"
          },
          {
            title: "On-chain Explorer",
            description: "Monitor blockchain activity and transactions",
            icon: <Database style={{ color: styles.accentColor }} />,
            path: "onchain"
          },
          {
            title: "CQ Intelligence",
            description: "Get intelligent insights from your data with AI-powered analytics",
            icon: <LineChart style={{ color: styles.accentColor }} />,
            path: "cq-intelligence"
          },
          {
            title: "Campaign Management",
            description: "Track marketing campaign performance",
            icon: <Activity style={{ color: styles.accentColor }} />,
            path: "campaigns"
          }
        ].map((feature, index) => (
          <div 
            key={index}
            onClick={() => navigate(`/${selectedTeam}/${feature.path}`)}
            className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
            style={{ 
              borderLeft: `3px solid ${styles.primaryColor}`,
              transform: 'translateY(0)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(29, 12, 70, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-lg mr-3" style={{ backgroundColor: `${styles.primaryColor}20` }}>
                {feature.icon}
              </div>
              <h3 className="font-semibold" style={{ color: styles.primaryColor }}>
                {feature.title}
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingSection;