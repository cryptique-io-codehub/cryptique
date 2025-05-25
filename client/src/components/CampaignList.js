import { useState } from 'react';
import { ChevronDown, X, ExternalLink, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { fetchCampaignMetrics } from '../api/campaigns';

const styles = {
  primaryColor: "#1d0c46", // Deep purple
  accentColor: "#caa968",  // Gold accent
  backgroundColor: "#f9fafb",
  cardBg: "white",
  textPrimary: "#111827",
  textSecondary: "#4b5563"
};

// Add helper function for safe percentage calculation
const calculatePercentage = (numerator, denominator) => {
  if (!numerator || !denominator) return 0;
  return ((numerator / denominator) * 100).toFixed(1);
};

// Add helper function for safe number formatting
const formatNumber = (number) => {
  if (!number) return '0';
  return number.toLocaleString();
};

export default function CampaignList({ campaigns = [] }) {
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [campaignMetrics, setCampaignMetrics] = useState(null);

  const openCampaignDetails = async (campaign) => {
    setActiveCampaign(campaign);
    setIsLoadingDetails(true);
    setCampaignMetrics(null);

    try {
      const metrics = await fetchCampaignMetrics(campaign.id);
      setCampaignMetrics(metrics);
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeCampaignDetails = () => {
    setActiveCampaign(null);
    setCampaignMetrics(null);
  };

  return (
    <div className="space-y-6">
      {/* Campaign List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
            Active Campaigns
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Visitors</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Web3 Users</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Wallets</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transacted Users</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const stats = campaign.stats || {};
                return (
                  <tr key={campaign.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.source || 'N/A'} / {campaign.medium || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatNumber(stats.visitors)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatNumber(stats.web3Users)}</div>
                      <div className="text-xs text-gray-500">
                        {calculatePercentage(stats.web3Users, stats.visitors)}% of visitors
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatNumber(stats.uniqueWallets)}</div>
                      <div className="text-xs text-gray-500">
                        {calculatePercentage(stats.uniqueWallets, stats.web3Users)}% of web3 users
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatNumber(stats.transactedUsers)}</div>
                      <div className="text-xs text-gray-500">
                        {calculatePercentage(stats.transactedUsers, stats.uniqueWallets)}% conversion
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCampaignDetails(campaign)}
                        className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                        style={{ 
                          backgroundColor: `${styles.primaryColor}10`, 
                          color: styles.primaryColor
                        }}
                      >
                        More Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      {activeCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto p-0">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg font-montserrat" style={{ color: styles.primaryColor }}>
                  Campaign Analysis
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-poppins">{activeCampaign.name}</p>
                  <a 
                    href={activeCampaign.shortUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-500 hover:text-indigo-600"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={closeCampaignDetails}
              >
                <X size={20} />
              </button>
            </div>

            {/* Show loading state while calculating metrics */}
            {isLoadingDetails && !campaignMetrics && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" style={{ color: styles.primaryColor }} />
                <p className="text-gray-600">Loading campaign metrics...</p>
              </div>
            )}

            {/* Show metrics when available */}
            {campaignMetrics && (
              <div className="p-4">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Visit Duration</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {formatNumber(Math.round(campaignMetrics.overview?.visitDuration / 60))} mins
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Conversions</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {formatNumber(campaignMetrics.overview?.conversions)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Conversions Value</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {formatNumber(campaignMetrics.overview?.conversionsValue)} ETH
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">Budget</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {formatNumber(activeCampaign.budget?.amount)} {activeCampaign.budget?.currency || 'USD'}
                    </p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">CAC (Cost per Acquisition)</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {formatNumber(campaignMetrics.overview?.cac)} {activeCampaign.budget?.currency || 'USD'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-poppins">ROI</p>
                    <p className="text-xl font-semibold font-montserrat">
                      {(campaignMetrics.overview?.roi || 0).toFixed(2)}x
                    </p>
                  </div>
                </div>

                {/* Smart Contract Performance */}
                {campaignMetrics.contractPerformance?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                      Smart Contract Performance
                    </h3>
                    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaignMetrics.contractPerformance.map((contract, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2 px-4">
                                <div className="font-medium text-sm">{contract.name || 'Unknown Contract'}</div>
                                <div className="text-xs text-gray-500 truncate">{contract.address}</div>
                              </td>
                              <td className="py-2 px-4 text-sm">{formatNumber(contract.transactions)}</td>
                              <td className="py-2 px-4 text-sm">{formatNumber(contract.uniqueUsers)}</td>
                              <td className="py-2 px-4 text-sm">{formatNumber(contract.totalValue)} ETH</td>
                              <td className="py-2 px-4 text-sm">{formatNumber(contract.avgValue)} ETH</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Activity Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Daily Visitors */}
                  {campaignMetrics.dailyVisitors?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                        Daily Visitors
                      </h3>
                      <div className="bg-white border border-gray-100 rounded-lg p-4" style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={campaignMetrics.dailyVisitors} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontFamily: 'Poppins', fontSize: 10 }}
                            />
                            <YAxis tick={{ fontFamily: 'Poppins', fontSize: 10 }} />
                            <Tooltip 
                              contentStyle={{ fontFamily: 'Poppins', fontSize: 11 }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="visitors" 
                              stroke={styles.primaryColor} 
                              fill={`${styles.primaryColor}20`} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Daily Transactions */}
                  {campaignMetrics.dailyTransactions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-md mb-3 font-montserrat" style={{ color: styles.primaryColor }}>
                        Daily Transactions
                      </h3>
                      <div className="bg-white border border-gray-100 rounded-lg p-4" style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={campaignMetrics.dailyTransactions} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontFamily: 'Poppins', fontSize: 10 }}
                            />
                            <YAxis tick={{ fontFamily: 'Poppins', fontSize: 10 }} />
                            <Tooltip 
                              contentStyle={{ fontFamily: 'Poppins', fontSize: 11 }}
                            />
                            <Bar 
                              dataKey="transactions" 
                              fill={styles.primaryColor} 
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 