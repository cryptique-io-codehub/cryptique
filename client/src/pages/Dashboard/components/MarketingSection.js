import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart2, Users, Target } from 'lucide-react';

const MarketingSection = () => {
  const navigate = useNavigate();
  const selectedTeam = localStorage.getItem("selectedTeam") || "";

  const features = [
    {
      title: "Analytics Dashboard",
      description: "Track your website's performance with detailed analytics",
      icon: <BarChart2 className="w-6 h-6" />,
      path: "offchain"
    },
    {
      title: "User Insights",
      description: "Understand your users' behavior and preferences",
      icon: <Users className="w-6 h-6" />,
      path: "cq-intelligence"
    },
    {
      title: "Campaign Management",
      description: "Create and manage your marketing campaigns",
      icon: <Target className="w-6 h-6" />,
      path: "campaigns"
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Cryptique Analytics
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your all-in-one platform for web analytics, user insights, and campaign management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => navigate(`/${selectedTeam}/${feature.path}`)}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 ml-4">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                Learn more
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://cryptique.gitbook.io/cryptique"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            View Documentation
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MarketingSection;