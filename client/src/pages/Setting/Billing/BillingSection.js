import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../../../api/coinbase/subscriptions";
import { CoinbasePaymentAPI } from "../../../api/coinbase/payments";
import axios from "axios";

// Billing Details Modal Component
const BillingDetailsModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
    isRegisteredCompany: false
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

// Subscription Plan Modal Component
const SubscriptionPlanModal = ({ isOpen, onClose, onSubscribe, currentPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [includesCQIntelligence, setIncludesCQIntelligence] = useState(false);
  
  const plans = Object.values(SUBSCRIPTION_PLANS).filter(plan => 
    plan.id !== 'cq_intelligence' && plan.id !== 'enterprise'
  );
  
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };
  
  const handleSubscribe = () => {
    if (selectedPlan) {
      onSubscribe(selectedPlan.id, includesCQIntelligence);
      onClose();
    }
  };
  
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    
    let total = selectedPlan.amount;
    if (includesCQIntelligence) {
      total += SUBSCRIPTION_PLANS.CQ_INTELLIGENCE_ADDON.amount;
    }
    
    return total;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-4xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">Choose a Subscription Plan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPlan?.id === plan.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => handlePlanSelect(plan)}
            >
              <h3 className="font-medium text-lg mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold mb-3">${plan.amount}<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              
              <div className="text-sm space-y-2">
                <div className="flex items-baseline">
                  <span className="font-medium mr-2">Websites:</span>
                  <span>{plan.features.websiteCount}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-medium mr-2">Smart Contracts:</span>
                  <span>{plan.features.contractCount}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-medium mr-2">Team Members:</span>
                  <span>{plan.features.teamMemberCount}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-medium mr-2">API Calls:</span>
                  <span>{plan.features.apiCallLimit.toLocaleString()}/mo</span>
                </div>
              </div>
              
              {currentPlan === plan.id && (
                <div className="mt-3 text-sm text-blue-600 font-medium">
                  Current Plan
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4 mb-4">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includesCQIntelligence"
              checked={includesCQIntelligence}
              onChange={(e) => setIncludesCQIntelligence(e.target.checked)}
              className="mr-3"
            />
            <div>
              <label htmlFor="includesCQIntelligence" className="font-medium">
                Add CQ Intelligence
              </label>
              <p className="text-sm text-gray-600">
                Add CQ Intelligence feature for ${SUBSCRIPTION_PLANS.CQ_INTELLIGENCE_ADDON.amount}/month
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Monthly Total:</span>
            <span className="text-xl font-bold">${calculateTotal()}</span>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubscribe}
              disabled={!selectedPlan}
              className={`px-4 py-2 rounded text-white ${
                selectedPlan ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enterprise Plan Request Modal
const EnterprisePlanModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    requirements: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-medium">Request Enterprise Plan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="Please describe your requirements (number of websites, smart contracts, team members, etc.)"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Payment Modal for Coinbase Commerce
const PaymentModal = ({ isOpen, onClose, checkoutUrl }) => {
  if (!isOpen || !checkoutUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-medium">Complete Your Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 h-[600px]">
          <iframe 
            title="Coinbase Commerce Checkout"
            src={checkoutUrl}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};

// Main BillingSection Component
const BillingSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [billingDetails, setBillingDetails] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState({
    status: "active",
    planName: "Basic",
    endDate: "2025-05-23",
    includesCQIntelligence: false
  });
  const [paymentUrl, setPaymentUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current subscription data from the API
    const fetchSubscriptionData = async () => {
      try {
        // In a real implementation, you would get the team ID from your app state/context
        const teamId = "team123"; // Replace with actual team ID
        
        const response = await axios.get(`/api/subscriptions/current?teamId=${teamId}`);
        const data = response.data;
        
        setSubscriptionData({
          status: data.status,
          planName: data.planName,
          endDate: data.endDate,
          includesCQIntelligence: data.includesCQIntelligence
        });
        
        setCurrentPlan(data.planId);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
        // Fallback to default values if API call fails
      }
    };
    
    fetchSubscriptionData();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  const openPlanModal = () => setIsPlanModalOpen(true);
  const closePlanModal = () => setIsPlanModalOpen(false);
  
  const openEnterpriseModal = () => setIsEnterpriseModalOpen(true);
  const closeEnterpriseModal = () => setIsEnterpriseModalOpen(false);
  
  const openPaymentModal = () => setIsPaymentModalOpen(true);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  const handleSaveBillingDetails = (data) => {
    setBillingDetails(data);
    // Any additional logic when saving billing details
  };
  
  const handleSubscribe = async (planId, includesCQIntelligence) => {
    setLoading(true);
    try {
      // In a real implementation, you would get these from your auth context
      const customerData = {
        customerId: "user123", // Replace with actual customer ID from your app
        email: "user@example.com", // Replace with actual user email
        teamId: "team123", // Replace with actual team ID
      };
      
      // Create a charge for the subscription
      const response = await CoinbasePaymentAPI.createCharge({
        name: `${SUBSCRIPTION_PLANS[planId].name} Subscription${includesCQIntelligence ? ' with CQ Intelligence' : ''}`,
        description: SUBSCRIPTION_PLANS[planId].description,
        amount: includesCQIntelligence 
          ? SUBSCRIPTION_PLANS[planId].amount + SUBSCRIPTION_PLANS.CQ_INTELLIGENCE_ADDON.amount
          : SUBSCRIPTION_PLANS[planId].amount,
        currency: 'USD',
        metadata: {
          customer_id: customerData.customerId,
          customer_email: customerData.email,
          plan_id: planId,
          includes_cq_intelligence: includesCQIntelligence,
          team_id: customerData.teamId,
          subscription_type: 'monthly'
        }
      });
      
      // Get the hosted checkout URL from the charge response
      const hostedUrl = response.hosted_url;
      setPaymentUrl(hostedUrl);
      
      // Open the payment modal
      openPaymentModal();
    } catch (error) {
      console.error('Failed to create subscription charge:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEnterpriseRequest = async (formData) => {
    try {
      // Send the enterprise request to your API
      await axios.post('/api/enterprise-request', formData);
      
      alert('Your enterprise request has been submitted! Our team will contact you shortly.');
    } catch (error) {
      console.error('Failed to submit enterprise request:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  return (
    <div className="p-6">
      {/* Plan management section */}
      <div className="mt-6 mb-10">
        <div className="text-lg font-semibold flex flex-wrap items-center gap-4 md:gap-6 px-4">
          <span className="whitespace-nowrap">Plan management</span>
          <div className="bg-indigo-900 text-white p-4 rounded-md w-full sm:w-auto flex justify-center items-center text-center break-words">
            <p className="text-sm md:text-base break-words">
              {subscriptionData.planName} {subscriptionData.includesCQIntelligence && '+ CQ Intelligence'} - {subscriptionData.status}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing details</h2>
          
          <p className="text-sm text-gray-600 mb-4">
            To receive a VAT invoice, you must provide your company's details.
          </p>
          
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm mb-4"
            onClick={openModal}
          >
            Add company details
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
          
          {/* Enterprise Plan Request */}
          <div className="mt-8 pt-4 border-t">
            <h3 className="text-md font-medium mb-2">Need a custom enterprise plan?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Contact us for a tailored solution that meets your specific requirements.
            </p>
            <button 
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
              onClick={openEnterpriseModal}
            >
              Request Enterprise Plan
            </button>
          </div>
        </div>
        
        {/* Right card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Billing & Payment</h2>
          
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">Subscription plan</span>
            <span className="text-sm font-medium">{subscriptionData.planName}</span>
          </div>
          
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">CQ Intelligence</span>
            <span className="text-sm">{subscriptionData.includesCQIntelligence ? 'Active' : 'Not active'}</span>
          </div>
          
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">Status</span>
            <span className="text-sm">{subscriptionData.status}</span>
          </div>
          
          <div className="flex justify-between border-b pb-2 mb-2">
            <span className="text-sm text-gray-600">Subscription end date</span>
            <span className="text-sm">{subscriptionData.endDate}</span>
          </div>
          
          <div className="mt-6">
            <button 
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              onClick={openPlanModal}
              disabled={loading}
            >
              {loading ? 'Processing...' : currentPlan ? 'Change Subscription Plan' : 'Choose Subscription Plan'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Billing Details Modal */}
      <BillingDetailsModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onSave={handleSaveBillingDetails} 
      />
      
      {/* Subscription Plan Modal */}
      <SubscriptionPlanModal
        isOpen={isPlanModalOpen}
        onClose={closePlanModal}
        onSubscribe={handleSubscribe}
        currentPlan={currentPlan}
      />
      
      {/* Enterprise Plan Modal */}
      <EnterprisePlanModal
        isOpen={isEnterpriseModalOpen}
        onClose={closeEnterpriseModal}
        onSubmit={handleEnterpriseRequest}
      />
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        checkoutUrl={paymentUrl}
      />
    </div>
  );
};

export default BillingSection;