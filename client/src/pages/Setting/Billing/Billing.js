import React, { useState, useEffect } from "react";
import { X, AlertCircle, Check, ExternalLink, ArrowUp } from "lucide-react";
import {
  getSubscriptionPlans,
  createCheckoutSession,
  getActiveSubscription,
  getSubscriptionHistory,
  updateBillingDetails
} from "../../../axiosInstance";
import PlanDisplay from "./PlanDisplay";
import { useParams, useLocation } from "react-router-dom";

// Billing Details Modal Component
const BillingDetailsModal = ({ isOpen, onClose, onSave, initialData = {} }) => {
  const [formData, setFormData] = useState({
    companyName: initialData.companyName || "",
    address: initialData.address || "",
    city: initialData.city || "",
    zipCode: initialData.zipCode || "",
    country: initialData.country || "",
    isRegisteredCompany: initialData.isRegisteredCompany || false,
    taxId: initialData.taxId || "",
    invoiceEmail: initialData.invoiceEmail || ""
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
      isRegisteredCompany: false,
      taxId: "",
      invoiceEmail: ""
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium">Provide Billing Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company name*
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
              Address*
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
              Country*
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
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID / VAT Number
            </label>
            <input
              type="text"
              id="taxId"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="invoiceEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Email
            </label>
            <input
              type="email"
              id="invoiceEmail"
              name="invoiceEmail"
              value={formData.invoiceEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Email for receiving invoices"
            />
            <p className="mt-1 text-xs text-gray-500">If left empty, invoices will be sent to the team owner's email.</p>
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

// Alert component for notifications
const Alert = ({ type, message, icon, onClose }) => {
  const colors = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200"
  };

  const icons = {
    success: <Check size={18} className="text-green-500" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <AlertCircle size={18} className="text-blue-500" />,
    warning: <AlertCircle size={18} className="text-yellow-500" />
  };

  return (
    <div className={`flex items-center justify-between p-4 mb-4 border rounded-md ${colors[type]}`}>
      <div className="flex items-center">
        {icons[type]}
        <span className="ml-2">{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={18} />
        </button>
      )}
    </div>
  );
};

// Main BillingSection Component
const Billing = () => {
  const { team } = useParams();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState(null);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hasCQIntelligence, setHasCQIntelligence] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState(null);

  // Parse URL parameters for upgrade info
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldUpgrade = searchParams.get('upgrade') === 'true';
    const feature = searchParams.get('feature');
    
    if (shouldUpgrade && feature) {
      setUpgradeInfo({
        feature,
        featureLabel: getFeatureLabel(feature)
      });
      
      // Clear URL parameters while preserving the route
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  // Helper function to get feature labels
  const getFeatureLabel = (feature) => {
    const labels = {
      websites: 'Website Limit',
      contracts: 'Smart Contract Limit',
      teamMembers: 'Team Members Limit',
      apiCalls: 'API Calls Limit',
      cqIntelligence: 'CQ Intelligence'
    };
    return labels[feature] || feature;
  };

  // Fetch subscription plans and active subscription on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch subscription plans
        const plans = await getSubscriptionPlans();
        setSubscriptionPlans(plans);

        // Fetch active subscription if team ID is available
        if (team) {
          const subscription = await getActiveSubscription(team);
          setActiveSubscription(subscription);
          if (subscription) {
            setSelectedPlan(subscription.plan);
            setHasCQIntelligence(subscription.features.hasCQIntelligence);
          }
        }
      } catch (error) {
        console.error('Error fetching billing data:', error);
        setAlert({
          type: 'error',
          message: 'Failed to load subscription data. Please try again later.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [team]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSaveBillingDetails = async (data) => {
    try {
      if (!team) {
        setAlert({
          type: 'error',
          message: 'Team ID is required to update billing details.'
        });
        return;
      }

      // Update billing details in the backend
      const result = await updateBillingDetails(team, data);
      
      // Update local state
      setBillingDetails(data);
      
      setAlert({
        type: 'success',
        message: 'Billing details updated successfully.'
      });
    } catch (error) {
      console.error('Error updating billing details:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update billing details. Please try again.'
      });
    }
  };

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
  };

  const handleToggleCQIntelligence = () => {
    setHasCQIntelligence(prev => !prev);
  };

  const handleSubscribe = async () => {
    try {
      if (!team || !selectedPlan) {
        setAlert({
          type: 'error',
          message: 'Please select a plan to subscribe.'
        });
        return;
      }

      // If billing details are not set, prompt to set them first
      if (!billingDetails) {
        setAlert({
          type: 'warning',
          message: 'Please add your billing details before subscribing.'
        });
        openModal();
        return;
      }

      setIsLoading(true);
      
      // Create checkout session
      const checkout = await createCheckoutSession(team, selectedPlan, hasCQIntelligence);
      
      // Redirect to Coinbase checkout
      if (checkout?.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      setAlert({
        type: 'error',
        message: 'Failed to create subscription. Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for success or cancelled payment in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const cancelled = urlParams.get('cancelled');

    if (success === 'true') {
      setAlert({
        type: 'success',
        message: 'Payment successful! Your subscription is now active.'
      });
    } else if (cancelled === 'true') {
      setAlert({
        type: 'info',
        message: 'Payment was cancelled. You can try again when you\'re ready.'
      });
    }

    // Clear URL parameters
    if (success || cancelled) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Recommend a plan based on the feature needed
  const getRecommendedPlan = (feature, currentPlan) => {
    // If user needs CQ Intelligence, they can add it to any plan
    if (feature === 'cqIntelligence') {
      setHasCQIntelligence(true);
      return currentPlan || 'basic';
    }
    
    // Otherwise recommend moving up a tier
    if (currentPlan === 'offchain') return 'basic';
    if (currentPlan === 'basic') return 'pro';
    if (currentPlan === 'pro') return 'enterprise';
    
    // Default to basic if no current plan
    return 'basic';
  };

  // Set recommended plan for upgrade if upgrade info exists
  useEffect(() => {
    if (upgradeInfo && activeSubscription) {
      const recommendedPlan = getRecommendedPlan(upgradeInfo.feature, activeSubscription.plan);
      setSelectedPlan(recommendedPlan);
      
      setAlert({
        type: 'info',
        message: `Upgrade your plan to access more ${upgradeInfo.featureLabel.toLowerCase()}.`,
        icon: <ArrowUp size={18} className="text-blue-500" />
      });
      
      // Scroll to plans section
      const plansSection = document.getElementById('plans-section');
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [upgradeInfo, activeSubscription]);

  return (
    <div className="p-6">
      {/* Alerts */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          icon={alert.icon}
          onClose={() => setAlert(null)}
        />
      )}
      
      {/* Current Plan Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
        
        {isLoading ? (
          <div className="bg-white p-4 rounded-md shadow flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : activeSubscription ? (
          <div className="bg-white p-6 rounded-md shadow">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h3 className="text-lg font-medium capitalize">
                  {activeSubscription.plan} Plan
                  {activeSubscription.features.hasCQIntelligence && " + CQ Intelligence"}
                </h3>
                <p className="text-gray-600 mt-1">
                  Active until {new Date(activeSubscription.endDate).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Plan Features:</h4>
                  <ul className="mt-2 space-y-1">
                    <li className="text-sm text-gray-600">• Max websites: {activeSubscription.features.maxWebsites}</li>
                    <li className="text-sm text-gray-600">• Max contracts: {activeSubscription.features.maxContracts}</li>
                    <li className="text-sm text-gray-600">• Max API calls: {activeSubscription.features.maxApiCalls}</li>
                    <li className="text-sm text-gray-600">• Team members: {activeSubscription.features.maxTeamMembers}</li>
                    {activeSubscription.features.hasCQIntelligence && (
                      <li className="text-sm text-gray-600">• CQ Intelligence enabled</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="mt-4 md:mt-0 md:text-right">
                <p className="text-2xl font-bold">${activeSubscription.price.amount} <span className="text-sm font-normal text-gray-600">/month</span></p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-md shadow">
            <p className="text-gray-600">You don't have an active subscription. Choose a plan below to get started.</p>
          </div>
        )}
      </div>
      
      {/* Subscription Plans */}
      <div id="plans-section" className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <PlanDisplay
          plans={subscriptionPlans || {}}
          activePlan={selectedPlan}
          onSelectPlan={handleSelectPlan}
          hasCQIntelligence={hasCQIntelligence}
          onToggleCQIntelligence={handleToggleCQIntelligence}
        />
        
        {selectedPlan && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  Subscribe <ExternalLink size={16} className="ml-2" />
                </span>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Billing Details Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Billing Details</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-4">
            To receive a VAT invoice, you must provide your company's details.
          </p>
          
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            onClick={openModal}
          >
            {billingDetails ? "Update billing details" : "Add company details"}
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
              {billingDetails.taxId && (
                <p className="text-sm text-gray-600 mt-1">VAT/Tax ID: {billingDetails.taxId}</p>
              )}
              {billingDetails.invoiceEmail && (
                <p className="text-sm text-gray-600 mt-1">Invoice email: {billingDetails.invoiceEmail}</p>
              )}
            </div>
          )}
        </div>
      </div>
      
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

export default Billing;