import React, { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTeam } from "../../../context/teamContext";
import axios from "axios";
import { API_URL } from "../../../utils/constants";

// Billing Details Modal Component
const BillingDetailsModal = ({ isOpen, onClose, onSave, initialData = {} }) => {
  const [formData, setFormData] = useState({
    companyName: initialData.companyName || "",
    address: initialData.address || "",
    city: initialData.city || "",
    zipCode: initialData.zipCode || "",
    country: initialData.country || "",
    isRegisteredCompany: initialData.isRegisteredCompany || false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
    onClose();
  };

  const handleClear = () => {
    setFormData({
      companyName: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
      isRegisteredCompany: false
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-medium">Provide Billing Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company name
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="flex gap-4 mb-4">
            <div className="w-1/2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City*
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                Zip/Postal Code*
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <div className="relative">
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none pr-8"
                required
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="IN">India</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="JP">Japan</option>
                <option value="BR">Brazil</option>
                <option value="IT">Italy</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="isRegisteredCompany"
                name="isRegisteredCompany"
                checked={formData.isRegisteredCompany}
                onChange={handleChange}
                className="mt-1 mr-2"
              />
              <label htmlFor="isRegisteredCompany" className="text-sm text-gray-700">
                I hereby confirm that this product is being purchased on behalf of a registered company.
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subscription Plan Card Component
const PlanCard = ({ plan, isActive, onSelect, isAddon }) => {
  return (
    <div 
      className={`border rounded-lg p-6 flex flex-col h-full ${
        isActive ? 'border-blue-500 border-2 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-2xl font-bold">${plan.price}</span>
          <span className="text-sm text-gray-500 ml-1">/month</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
      </div>
      
      <div className="flex-grow">
        <ul className="space-y-2">
          {plan.features.maxWebsites > 0 && (
            <li className="flex items-center text-sm">
              <CheckCircle size={16} className="text-green-500 mr-2" />
              {plan.features.maxWebsites === -1 ? 'Unlimited websites' : `${plan.features.maxWebsites} website${plan.features.maxWebsites > 1 ? 's' : ''}`}
            </li>
          )}
          {plan.features.maxSmartContracts > 0 && (
            <li className="flex items-center text-sm">
              <CheckCircle size={16} className="text-green-500 mr-2" />
              {plan.features.maxSmartContracts === -1 ? 'Unlimited smart contracts' : `${plan.features.maxSmartContracts} smart contract${plan.features.maxSmartContracts > 1 ? 's' : ''}`}
            </li>
          )}
          {plan.features.maxApiCalls > 0 && (
            <li className="flex items-center text-sm">
              <CheckCircle size={16} className="text-green-500 mr-2" />
              {plan.features.maxApiCalls === -1 ? 'Unlimited API calls' : `${plan.features.maxApiCalls.toLocaleString()} API calls/month`}
            </li>
          )}
          {plan.features.maxTeamMembers > 0 && (
            <li className="flex items-center text-sm">
              <CheckCircle size={16} className="text-green-500 mr-2" />
              {plan.features.maxTeamMembers === -1 ? 'Unlimited team members' : `${plan.features.maxTeamMembers} team member${plan.features.maxTeamMembers > 1 ? 's' : ''}`}
            </li>
          )}
          <li className="flex items-center text-sm">
            {plan.features.hasOffChainAnalytics ? (
              <CheckCircle size={16} className="text-green-500 mr-2" />
            ) : (
              <XCircle size={16} className="text-red-500 mr-2" />
            )}
            Off-chain analytics
          </li>
          <li className="flex items-center text-sm">
            {plan.features.hasOnChainAnalytics ? (
              <CheckCircle size={16} className="text-green-500 mr-2" />
            ) : (
              <XCircle size={16} className="text-red-500 mr-2" />
            )}
            On-chain analytics
          </li>
          {plan.features.hasCQIntelligence && (
            <li className="flex items-center text-sm">
              <CheckCircle size={16} className="text-green-500 mr-2" />
              CQ Intelligence
            </li>
          )}
        </ul>
      </div>
      
      <button 
        onClick={() => onSelect(plan)}
        className={`mt-6 w-full py-2 px-4 rounded-md ${
          isActive 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
      >
        {isActive ? 'Selected' : isAddon ? 'Add to Plan' : 'Select Plan'}
      </button>
    </div>
  );
};

// Main BillingSection Component
const BillingSection = () => {
  const { currentUser } = useAuth();
  const { currentTeam } = useTeam();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Fetch subscription plans and current team subscription
  useEffect(() => {
    const fetchPlansAndSubscription = async () => {
      if (!currentTeam?._id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch available plans
        const plansResponse = await axios.get(`${API_URL}/api/subscription/plans`);
        
        if (plansResponse.data.success) {
          // Separate plans and addons
          const allPlans = plansResponse.data.plans;
          setPlans(allPlans.filter(plan => plan.name !== 'CQ-Intelligence-Addon'));
          setAddons(allPlans.filter(plan => plan.name === 'CQ-Intelligence-Addon'));
        }
        
        // Fetch current subscription
        const subscriptionResponse = await axios.get(
          `${API_URL}/api/subscription/team/${currentTeam._id}`,
          { withCredentials: true }
        );
        
        if (subscriptionResponse.data.success && subscriptionResponse.data.hasSubscription) {
          setCurrentSubscription(subscriptionResponse.data.subscription);
          setBillingDetails(subscriptionResponse.data.subscription.billingDetails);
          
          // Set selected plan based on current subscription
          if (subscriptionResponse.data.subscription.plan) {
            setSelectedPlan(subscriptionResponse.data.subscription.plan);
          }
          
          // Set selected addons based on current subscription
          if (subscriptionResponse.data.subscription.addons?.length > 0) {
            setSelectedAddons(subscriptionResponse.data.subscription.addons);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlansAndSubscription();
  }, [currentTeam]);

  const handleSaveBillingDetails = (data) => {
    setBillingDetails(data);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handleToggleAddon = (addon) => {
    // Check if already selected
    const isSelected = selectedAddons.some(a => a._id === addon._id);
    
    if (isSelected) {
      // Remove from selected
      setSelectedAddons(selectedAddons.filter(a => a._id !== addon._id));
    } else {
      // Add to selected
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !currentTeam?._id) return;
    
    if (!billingDetails) {
      setError('Please add billing details before subscribing');
      openModal();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/subscription/create`,
        {
          teamId: currentTeam._id,
          planId: selectedPlan._id,
          addonIds: selectedAddons.map(addon => addon._id),
          billingDetails
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        // Redirect to Coinbase payment page
        window.location.href = response.data.paymentUrl;
      } else {
        setError('Failed to create subscription');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError(err.response?.data?.error || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentTeam?._id) return;
    
    if (window.confirm('Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period.')) {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/subscription/cancel`,
          { teamId: currentTeam._id },
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setSuccessMessage('Your subscription has been canceled and will end at the current billing period');
          
          // Update subscription status
          setCurrentSubscription({
            ...currentSubscription,
            status: 'canceled'
          });
        } else {
          setError('Failed to cancel subscription');
        }
      } catch (err) {
        console.error('Error canceling subscription:', err);
        setError(err.response?.data?.error || 'Failed to cancel subscription');
      } finally {
        setLoading(false);
      }
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0;
    
    if (selectedPlan) {
      total += selectedPlan.price;
    }
    
    if (selectedAddons.length > 0) {
      total += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    }
    
    return total;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="p-6">
      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle className="mr-2 mt-0.5" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-start">
          <CheckCircle className="mr-2 mt-0.5" size={18} />
          <span>{successMessage}</span>
          </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Current Subscription Section */}
          {currentSubscription && currentSubscription.status !== 'canceled' && (
            <div className="mb-10 p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
              
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="font-medium">{currentSubscription.plan?.name || 'Unknown Plan'}</span>
                  {currentSubscription.addons?.length > 0 && (
                    <span className="ml-2 text-gray-600">
                      + {currentSubscription.addons.map(a => a.name).join(', ')}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentSubscription.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentSubscription.status === 'past_due' ? 'bg-red-100 text-red-800' :
                    currentSubscription.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">{formatDate(currentSubscription.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Billing Date</p>
                  <p className="font-medium">{formatDate(currentSubscription.endDate)}</p>
        </div>
      </div>

              <button 
                onClick={handleCancelSubscription}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          )}
          
          {/* Billing Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing details</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            To receive a VAT invoice, you must provide your company's details.
          </p>
          
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm"
            onClick={openModal}
          >
                {billingDetails ? 'Edit company details' : 'Add company details'}
          </button>
          
          {/* Display billing details if available */}
          {billingDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm font-medium">{billingDetails.companyName}</p>
              <p className="text-sm text-gray-600">{billingDetails.address}</p>
              <p className="text-sm text-gray-600">
                {billingDetails.city}, {billingDetails.zipCode}
              </p>
              <p className="text-sm text-gray-600">{billingDetails.country}</p>
            </div>
          )}
        </div>
        
            {/* Payment Summary Section */}
        <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Summary</h2>
              
              {selectedPlan && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name} Plan</span>
                    <span>${selectedPlan.price}/month</span>
                  </div>
                  
                  {selectedAddons.map(addon => (
                    <div key={addon._id} className="flex justify-between">
                      <span>{addon.name}</span>
                      <span>${addon.price}/month</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4 flex justify-between font-bold">
                    <span>Total</span>
                    <span>${calculateTotalPrice()}/month</span>
                  </div>
                  
                  <button
                    onClick={handleSubscribe}
                    disabled={!selectedPlan || loading}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {currentSubscription ? 'Update Subscription' : 'Subscribe Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Available Plans Section */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-6">Choose a Plan</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map(plan => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  isActive={selectedPlan?._id === plan._id}
                  onSelect={handleSelectPlan}
                  isAddon={false}
                />
              ))}
            </div>
          </div>
          
          {/* Add-ons Section */}
          {addons.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-6">Add-ons</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {addons.map(addon => (
                  <PlanCard
                    key={addon._id}
                    plan={addon}
                    isActive={selectedAddons.some(a => a._id === addon._id)}
                    onSelect={handleToggleAddon}
                    isAddon={true}
                  />
                ))}
        </div>
      </div>
          )}
        </>
      )}
      
      {/* Billing Details Modal */}
      <BillingDetailsModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSave={handleSaveBillingDetails} 
        initialData={billingDetails}
      />
    </div>
  );
};

export default BillingSection;