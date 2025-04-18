import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Copy, Trash2, Plus, X } from 'lucide-react';
import Header from '../../components/Header';
import Filters from '../Offchainpart/Filters';
import axiosInstance from '../../axiosInstance';

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
        const response = await axiosInstance.post('/website/getWebsites', {
          teamName: selectedTeam
        });
        
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
    term: '',
    content: '',
    budgetCurrency: 'USD',
    budgetAmount: '',
    shortenedDomain: 'link.cryptique.io'  // Set default value
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
          term: campaignForm.term,
          content: campaignForm.content
        }),
        shortUrl: `https://${campaignForm.shortenedDomain}/${Math.random().toString(36).substring(7)}`
      };

      // Send to backend
      const response = await axiosInstance.post('/campaign', newCampaign);
      
      if (response.data.campaign) {
        // Add the new campaign to the list
        setCampaigns(prevCampaigns => [response.data.campaign, ...prevCampaigns]);
        
        // Close the modal and reset form
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
                          />
        <div className="bg-gray-50 flex-1 p-4 overflow-auto" onClick={handleClickOutside}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-medium">Campaigns</h1>
            <button 
              onClick={openAddCampaignModal}
              className="bg-indigo-900 text-amber-300 px-4 py-2 rounded-md flex items-center hover:bg-indigo-800 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Campaign
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Table header with metrics */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div className="grid grid-cols-11 text-xs text-gray-500 p-4 border-b bg-gray-50 sticky top-0">
                  <div className="px-4">CAMPAIGN NAME</div>
                  <div className="px-4">VISITORS</div>
                  <div className="px-4">WEB USERS</div>
                  <div className="px-4">UNIQUE WALLETS</div>
                  <div className="px-4">TRANSACTED USERS</div>
                  <div className="px-4">VISIT DURATION (MINS)</div>
                  <div className="px-4">CONVERSIONS</div>
                  <div className="px-4">CONVERSIONS VALUE</div>
                  <div className="px-4">BUDGET</div>
                  <div className="px-4">CAC</div>
                  <div className="px-4">ROI</div>
                </div>
                
                {/* Summary row */}
                <div className="grid grid-cols-11 text-sm p-4 border-b bg-gray-50">
                  <div className="px-4 font-medium">Total</div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.visitors || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.webUsers || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.uniqueWallets || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {campaigns.reduce((sum, camp) => sum + (camp.stats.transactedUsers || 0), 0)}
                  </div>
                  <div className="px-4 font-medium">
                    {(campaigns.reduce((sum, camp) => sum + (camp.stats.visitDuration || 0), 0) / campaigns.length || 0).toFixed(2)}
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
                <div className="max-h-96 overflow-y-auto">
                  {campaigns.map((campaign, index) => (
                    <div key={campaign._id} className="grid grid-cols-11 text-sm p-3 border-b hover:bg-gray-50 relative">
                      <div className="flex items-center px-2">
                        <span>{campaign.name}</span>
                        <div className="ml-2 flex space-x-1">
                          <button 
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => handleDeleteCampaign(campaign._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-gray-400 hover:text-gray-600"
                            onClick={(e) => handleCopyClick(index, e)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Popup menu */}
                        {activePopup === index && (
                          <div 
                            className="absolute left-16 top-8 z-10 bg-white shadow-lg rounded border" 
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex flex-col divide-y text-sm">
                              <button 
                                className="flex items-center px-3 py-2 hover:bg-gray-50"
                                onClick={(e) => handleCopyUrl(campaign, 'short', e)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy short URL
                              </button>
                              <button 
                                className="flex items-center px-3 py-2 hover:bg-gray-50"
                                onClick={(e) => handleCopyUrl(campaign, 'long', e)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy long URL
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-2">{campaign.stats.visitors || '-'}</div>
                      <div className="px-2">{campaign.stats.webUsers || '-'}</div>
                      <div className="px-2">{campaign.stats.uniqueWallets || '-'}</div>
                      <div className="px-2">{campaign.stats.transactedUsers || '-'}</div>
                      <div className="px-2">{campaign.stats.visitDuration || '-'}</div>
                      <div className="px-2">{campaign.stats.conversions || '-'}</div>
                      <div className="px-2">{campaign.stats.conversionsValue ? `$${campaign.stats.conversionsValue}` : '-'}</div>
                      <div className="px-2">{campaign.budget ? `${campaign.budget.currency} ${campaign.budget.amount}` : '-'}</div>
                      <div className="px-2">{campaign.stats.cac ? `$${campaign.stats.cac}` : '-'}</div>
                      <div className="px-2">{campaign.stats.roi ? `${campaign.stats.roi}%` : '-'}</div>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 relative">
            {/* Close (X) button */}
            <button 
              onClick={closeAddCampaignModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-indigo-900">Create a Campaign</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Select Website*</label>
                  <div className="col-span-3">
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
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Campaign Destination*</label>
                  <div className="col-span-3">
                    <div className="flex items-center">
                      <div className="bg-gray-50 p-2 border rounded-l text-gray-700 min-w-fit">
                        {campaignForm.domain || 'Select a website'}
                      </div>
                      <input 
                        type="text"
                        name="path"
                        value={campaignForm.path}
                        onChange={handleFormChange}
                        className="w-full p-2 border-y border-r rounded-r focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="/path"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the path after domain (e.g. /page or / for root)
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Campaign Name*</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="name"
                      value={campaignForm.name}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g. summer_sale_2024, black_friday_promo, new_year_campaign
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Source*</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="source"
                      value={campaignForm.source}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g. newsletter, twitter, google, etc.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Medium*</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="medium"
                      value={campaignForm.medium}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g. email, social, cpc, etc.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Campaign</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="campaign"
                      value={campaignForm.campaign}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      e.g. promotion, sale, etc.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Term</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="term"
                      value={campaignForm.term}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Keywords for your paid search campaigns
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Content</label>
                  <div className="col-span-3">
                    <input 
                      type="text"
                      name="content"
                      value={campaignForm.content}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Any call-to-action or headline, e.g. buy-now
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Budget</label>
                  <div className="col-span-3">
                    <div className="flex gap-2">
                      <select
                        name="budgetCurrency"
                        value={campaignForm.budgetCurrency}
                        onChange={handleFormChange}
                        className="w-24 p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Optional: Enter your campaign budget with currency
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center">
                  <label className="text-sm font-medium">Shortened Domain</label>
                  <div className="col-span-3">
                    <div className="w-full p-2 border rounded bg-gray-50 text-gray-700">
                      link.cryptique.io
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Default Cryptique URL shortener domain (custom domains coming soon)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button 
                  type="submit"
                  className="bg-indigo-900 text-amber-300 font-bold py-3 px-8 rounded-md hover:bg-indigo-800 transition-colors"
                  disabled={isLoading}
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}