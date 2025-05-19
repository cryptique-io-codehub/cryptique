import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export const FeatureCards = () => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const selectedTeam = localStorage.getItem("selectedTeam") || "";

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCardClick = (path) => {
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else {
      navigate(`/${selectedTeam}/${path}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-0 max-h-full sm:max-h-[300px] overflow-y-auto pb-4 sm:pb-0 sm:overflow-hidden">
      {[
        {
          title: "Cryptique works with your Google Analytics",
          description: "You don't need to change anything in your Google Analytics setup.",
          path: "offchain",
          icon: "📊"
        },
        {
          title: "Run KOL Intelligence",
          description: "Get access to advanced KOL data and on-chain insights into your social dynamics.",
          path: "cq-intelligence",
          icon: "🔍"
        },
        {
          title: "Campaigns",
          description: "Measure performance & retention of all your campaigns.",
          path: "campaigns",
          icon: "🎯"
        },
        {
          title: "Documentation",
          description: "Learn more about Cryptique's features and capabilities.",
          path: "https://cryptique.gitbook.io/cryptique",
          icon: "📚"
        }
      ].map((card, index) => (
        <div
          key={index}
          onClick={() => handleCardClick(card.path)}
          className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm">{card.description}</p>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">{card.icon}</span>
              {card.path.startsWith('http') && <ExternalLink size={16} className="text-gray-400" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};