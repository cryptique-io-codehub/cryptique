import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Copy, Trash2, Plus, X } from 'lucide-react';
import Header from '../../components/Header';
import Filters from '../Offchainpart/Filters';
import axiosInstance from '../../axiosInstance';
import { v4 as uuidv4 } from 'uuid';
import { formatDuration } from '../../utils/analyticsHelpers';

// Add styles object at the top level
const styles = {
  primaryColor: "#1d0c46", // Deep purple
  accentColor: "#caa968",  // Gold accent
  backgroundColor: "#f9fafb",
  cardBg: "white",
  textPrimary: "#111827",
  textSecondary: "#4b5563"
};

export default function Campaigns({ onMenuClick, screenSize, selectedPage }) {
  const [contractarray, setcontractarray] = useState([]);
  const [isCustomExpanded, setIsCustomExpanded] = useState(true);
  const [activePopup, setActivePopup] = useState(null);
  const [selectedWebsite, setSelectedWebsite] = useState();
  const [selectedDate, setSelectedDate] = useState('Select Date');
  const [selectedFilters, setSelectedFilters] = useState('Select Filters');
  const [websitearray, setWebsitearray] = useState([]);
  const [analytics, setanalytics] = useState({});
  const [idy, setidy] = useState(localStorage.getItem("idy"));
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  
  // Sample data - In a real app, you might fetch this from an API
  const campaignsData = [
    { name: 'test', budget: '$1,000' },
    { name: 'presale', budget: '$2,000' },
    { name: 'tradingpromo', budget: '-' },
    { name: 'ivanoritech', budget: '-' },
    { name: 'airdrop', budget: '-' },
    { name: 'airdropsummer', budget: '-' }
  ];

  // Fetch websites when component mounts
  useEffect(() => {
    const fetchWebsites = async () => {
      setIsLoading(true);
      try {
        const selectedTeam = localStorage.getItem("selectedTeam");
        const response = await axiosInstance.get(`/website/team/${selectedTeam}`);
        
        if (response.status === 200 && response.data.websites) {
          setWebsitearray(response.data.websites);
          
          // If there's a currently selected website in localStorage, use it
          const savedWebsiteId = localStorage.getItem("idy");
          if (savedWebsiteId) {
            const currentWebsite = response.data.websites.find(
              website => website.siteId === savedWebsiteId
            );
            if (currentWebsite) {
              setSelectedWebsite(currentWebsite);
              // Update the campaign form with the selected website
              setCampaignForm(prev => ({
                ...prev,
                website: currentWebsite.siteId,
                domain: currentWebsite.Domain
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching websites:", error);
        setError("Failed to load websites. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebsites();
  }, []);

  // Add this useEffect to fetch campaigns when component mounts or website changes
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!selectedWebsite?.siteId) return;
      
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`/campaign/site/${selectedWebsite.siteId}`);
        if (response.data.campaigns) {
          setCampaigns(response.data.campaigns);
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        setError("Failed to load campaigns. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [selectedWebsite]);

  // Function to generate UTM URL
  const generateUtmUrl = (campaign) => {
    const baseUrl = `${campaign.domain}${campaign.path}`;
    const params = new URLSearchParams();
    
    if (campaign.source) params.append('utm_source', campaign.source);
    if (campaign.medium) params.append('utm_medium', campaign.medium);
    if (campaign.campaign) params.append('utm_campaign', campaign.campaign);
    if (campaign.content) params.append('utm_content', campaign.content);
    if (campaign.term) params.append('utm_term', campaign.term);
    if (campaign.utm_id) params.append('utm_id', campaign.utm_id);

    const queryString = params.toString();
    return `https://${baseUrl}${queryString ? '?' + queryString : ''}`;
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyClick = (index, event) => {
    event.stopPropagation();
    setActivePopup(activePopup === index ? null : index);
  };

  const handleCopyUrl = async (campaign, type, event) => {
    event.stopPropagation();
    const urlToCopy = type === 'long' ? campaign.longUrl : campaign.shortUrl;
    await copyToClipboard(urlToCopy);
    setActivePopup(null);
  };

  const handleClickOutside = () => {
    setActivePopup(null);
  };

  const openAddCampaignModal = () => {
    const uniqueId = generateUniqueCampaignId();
    setCampaignForm(prev => ({
      ...prev,
      utm_id: uniqueId
    }));
    setShowAddCampaignModal(true);
  };

  const closeAddCampaignModal = () => {
    setShowAddCampaignModal(false);
    // Reset form state when closing modal
    setCampaignForm({
      website: selectedWebsite?.siteId || '',
      domain: selectedWebsite?.Domain || '',
      path: '/',
      name: '',
      source: '',
      medium: '',
      campaign: '',
      utm_id: uuidv4().split('-')[0].toUpperCase(),
      term: '',
      content: '',
      budgetCurrency: 'USD',
      budgetAmount: '',
      shortenedDomain: 'link.cryptique.io'  // Reset to default value
    });
  };

  // Form state for new campaign
  const [campaignForm, setCampaignForm] = useState({
    website: selectedWebsite?.siteId || '',
    domain: selectedWebsite?.Domain || '',
    path: '/',
    name: '',
    source: '',
    medium: '',
    campaign: '',
    utm_id: uuidv4().split('-')[0].toUpperCase(),
    term: '',
    content: '',
    budgetCurrency: 'USD',
    budgetAmount: '',
    shortenedDomain: 'link.cryptique.io'
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'website') {
      // When website is changed, update both website and domain
      const selectedSite = websitearray.find(site => site.siteId === value);
      setCampaignForm({
        ...campaignForm,
        website: value,
        domain: selectedSite?.Domain || '',
        path: '/'
      });
    } else {
      setCampaignForm({
        ...campaignForm,
        [name]: value
      });
    }
  };

  // Function to generate unique campaign ID
  const generateUniqueCampaignId = () => {
    // Generate a short unique ID (8 characters)
    return uuidv4().split('-')[0].toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create campaign object
      const newCampaign = {
        siteId: selectedWebsite.siteId,
        name: campaignForm.name,
        domain: campaignForm.domain,
        path: campaignForm.path,
        source: campaignForm.source,
        medium: campaignForm.medium,
        campaign: campaignForm.campaign,
        utm_id: campaignForm.utm_id,
        term: campaignForm.term,
        content: campaignForm.content,
        budget: {
          currency: campaignForm.budgetCurrency,
          amount: parseFloat(campaignForm.budgetAmount) || 0
        },
        shortenedDomain: campaignForm.shortenedDomain,
        longUrl: generateUtmUrl({
          domain: campaignForm.domain,
          path: campaignForm.path,
          source: campaignForm.source,
          medium: campaignForm.medium,
          campaign: campaignForm.campaign,
          utm_id: campaignForm.utm_id,
          term: campaignForm.term,
          content: campaignForm.content
        }),
        shortUrl: `https://${campaignForm.shortenedDomain}/${Math.random().toString(36).substring(7)}`
      };

      // Send to backend
      const response = await axiosInstance.post('/campaign', newCampaign);
      
      if (response.data.campaign) {
        setCampaigns(prevCampaigns => [response.data.campaign, ...prevCampaigns]);
        closeAddCampaignModal();
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Failed to create campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add delete campaign functionality
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/campaign/${campaignId}`);
      setCampaigns(prevCampaigns => prevCampaigns.filter(camp => camp._id !== campaignId));
    } catch (error) {
      console.error("Error deleting campaign:", error);
      setError("Failed to delete campaign. Please try again.");
    }
  };

  // Currency options
  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'AUD', symbol: 'A$' },
    { code: 'CAD', symbol: 'C$' },
    { code: 'CHF', symbol: 'CHF' },
    { code: 'CNY', symbol: '¥' },
    { code: 'INR', symbol: '₹' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex flex-col w-full h-screen">
        <Header className="w-full flex-shrink-0" onMenuClick={onMenuClick} screenSize={screenSize} />
        <div className="flex-1 overflow-y-auto p-4">
          {/* Import fonts in the head */}
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');
              
              h1, h2, h3, h4, h5, h6 {
                font-family: 'Montserrat', sans-serif;
              }
              
              body, p, span, div {
                font-family: 'Poppins', sans-serif;
              }
            `}
          </style>

          <Filters 
            websitearray={websitearray}
            setWebsitearray={setWebsitearray}
            contractarray={contractarray}
            setcontractarray={setcontractarray}
            analytics={analytics}
            setanalytics={setanalytics}
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate} 
            selectedWebsite={selectedWebsite} 
            setSelectedWebsite={setSelectedWebsite}
            selectedFilters={selectedFilters} 
            setSelectedFilters={setSelectedFilters}
            idy={idy}
            setidy={setidy}
            selectedPage={selectedPage}
            onMenuClick={onMenuClick}
          />
          
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 font-montserrat" style={{ color: styles.primaryColor }}>
              Campaigns
            </h1>
            <p className="text-sm text-gray-600 font-poppins mt-1">
              Create and manage your marketing campaigns
            </p>
          </div>

          <div className="flex justify-end mb-4">
            <button 
              onClick={openAddCampaignModal}
              className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity flex items-center"
              style={{ backgroundColor: styles.primaryColor }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Campaign
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Table header with metrics */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div className="grid grid-cols-11 text-xs font-medium text-gray-500 p-4 border-b bg-gray-50 sticky top-0 font-montserrat uppercase tracking-wider">
                  <div className="px-4">Campaign Name</div>
                  <div className="px-4">Visitors</div>
                  <div className="px-4">Web3 Users</div>
                  <div className="px-4">Unique Wallets</div>
                  <div className="px-4">Transacted Users</div>
                  <div className="px-4">Visit Duration (mins)</div>
                  <div className="px-4">Conversions</div>
                  <div className="px-4">Conversions Value</div>
                  <div className="px-4">Budget</div>
                  <div className="px-4">CAC</div>
                  <div className="px-4">ROI</div>
                </div>
                
                {/* Summary row */}
                <div className="grid grid-cols-11 text-sm p-4 border-b bg-gray-50 font-poppins">
                  <div className="px-4 font-medium">Total</div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.visitors || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.web3Users || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.uniqueWallets || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.transactedUsers || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {formatDuration(campaigns.reduce((sum, camp) => sum + (camp.stats.visitDuration || 0), 0) / campaigns.length)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.conversions || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    ${campaigns.reduce((sum, camp) => sum + (camp.stats.conversionsValue || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    ${campaigns.reduce((sum, camp) => sum + (camp.budget?.amount || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    ${(campaigns.reduce((sum, camp) => sum + (camp.stats.cac || 0), 0) / campaigns.length || 0).toFixed(2)}
                  </div>
                  <div className="px-4 font-medium">
                    {(campaigns.reduce((sum, camp) => sum + (camp.stats.roi || 0), 0) / campaigns.length || 0).toFixed(2)}%
                  </div>
                </div>
                
                {/* Campaign rows */}
                <div className="max-h-[calc(100vh-24rem)] overflow-y-auto font-poppins">
                  {campaigns.map((campaign, index) => (
                    <div key={campaign._id} className="grid grid-cols-11 text-sm p-4 border-b hover:bg-gray-50 transition-colors relative">
                      <div className="flex items-center px-4 relative">
                        <span>{campaign.name}</span>
                        <div className="ml-2 flex space-x-2">
                          <button 
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            onClick={() => handleDeleteCampaign(campaign._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={(e) => handleCopyClick(index, e)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Popup menu */}
                        {activePopup === index && (
                          <div 
                            className="absolute left-0 top-full mt-1 z-10 bg-white shadow-lg rounded-md border border-gray-200" 
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex flex-col divide-y text-sm">
                              <button 
                                className="flex items-center px-4 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                onClick={(e) => handleCopyUrl(campaign, 'short', e)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy short URL
                              </button>
                              <button 
                                className="flex items-center px-4 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                onClick={(e) => handleCopyUrl(campaign, 'long', e)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy long URL
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-4">{campaign.stats.visitors || '-'}</div>
                      <div className="px-4">{campaign.stats.web3Users || '-'}</div>
                      <div className="px-4">{campaign.stats.uniqueWallets || '-'}</div>
                      <div className="px-4">{campaign.stats.transactedUsers || '-'}</div>
                      <div className="px-4">{formatDuration(campaign.stats.visitDuration)}</div>
                      <div className="px-4">{campaign.stats.conversions || '-'}</div>
                      <div className="px-4">{campaign.stats.conversionsValue ? `$${campaign.stats.conversionsValue}` : '-'}</div>
                      <div className="px-4">{campaign.budget ? `${campaign.budget.currency} ${campaign.budget.amount}` : '-'}</div>
                      <div className="px-4">{campaign.stats.cac ? `$${campaign.stats.cac}` : '-'}</div>
                      <div className="px-4">{campaign.stats.roi ? `${campaign.stats.roi}%` : '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Campaign Modal */}
      {showAddCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold font-montserrat" style={{ color: styles.primaryColor }}>
                Create a Campaign
              </h2>
              <button 
                onClick={closeAddCampaignModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="font-poppins">
              <div className="space-y-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Select Website*</label>
                  <div>
                    {isLoading ? (
                      <div className="w-full p-2 border rounded bg-gray-50">
                        Loading websites...
                      </div>
                    ) : error ? (
                      <div className="w-full p-2 border rounded bg-red-50 text-red-600">
                        {error}
                      </div>
                    ) : (
                      <select 
                        name="website"
                        value={campaignForm.website}
                        onChange={handleFormChange}
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                        style={{ focusRing: styles.primaryColor }}
                        required
                      >
                        <option value="">Select a website...</option>
                        {websitearray.map(website => (
                          <option key={website.siteId} value={website.siteId}>
                            {website.Domain} {website.Name ? `(${website.Name})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Campaign Destination*</label>
                  <div className="flex items-center">
                    <div className="bg-gray-50 p-2 border rounded-l text-gray-700 min-w-fit">
                      {campaignForm.domain || 'Select a website'}
                    </div>
                    <input 
                      type="text"
                      name="path"
                      value={campaignForm.path}
                      onChange={handleFormChange}
                      className="flex-1 p-2 border-y border-r rounded-r focus:outline-none focus:ring-2 transition-shadow"
                      style={{ focusRing: styles.primaryColor }}
                      placeholder="/path"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the path after domain (e.g. /page or / for root)
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Campaign Name*</label>
                  <input 
                    type="text"
                    name="name"
                    value={campaignForm.name}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    e.g. summer_sale_2024, black_friday_promo, new_year_campaign
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Source*</label>
                  <input 
                    type="text"
                    name="source"
                    value={campaignForm.source}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    e.g. newsletter, twitter, google, etc.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Medium*</label>
                  <input 
                    type="text"
                    name="medium"
                    value={campaignForm.medium}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    e.g. email, social, cpc, etc.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Campaign</label>
                  <input 
                    type="text"
                    name="campaign"
                    value={campaignForm.campaign}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                    placeholder="e.g. summer_sale"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    The campaign name for UTM tracking
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Campaign ID</label>
                  <div className="bg-gray-50 px-3 py-2 rounded-md text-sm font-mono">
                    {campaignForm.utm_id}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Unique identifier for this campaign (UTM_ID parameter)
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Term</label>
                  <input 
                    type="text"
                    name="term"
                    value={campaignForm.term}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Keywords for your paid search campaigns
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Content</label>
                  <input 
                    type="text"
                    name="content"
                    value={campaignForm.content}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                    style={{ focusRing: styles.primaryColor }}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Any call-to-action or headline, e.g. buy-now
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Budget</label>
                  <div className="flex gap-2">
                    <select
                      name="budgetCurrency"
                      value={campaignForm.budgetCurrency}
                      onChange={handleFormChange}
                      className="w-24 p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow bg-white"
                      style={{ focusRing: styles.primaryColor }}
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code}
                        </option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      name="budgetAmount"
                      value={campaignForm.budgetAmount}
                      onChange={handleFormChange}
                      placeholder="Enter amount"
                      className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 transition-shadow"
                      style={{ focusRing: styles.primaryColor }}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Optional: Enter your campaign budget with currency
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">Shortened Domain</label>
                  <div className="w-full p-2 border rounded-md bg-gray-50 text-gray-700">
                    link.cryptique.io
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Default Cryptique URL shortener domain (custom domains coming soon)
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeAddCampaignModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: styles.primaryColor }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}