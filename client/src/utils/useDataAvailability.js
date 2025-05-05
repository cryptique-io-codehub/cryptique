import { useState, useEffect } from 'react';

// This hook helps determine if data is available for specific visuals
// It will be expanded as more API integration is added
const useDataAvailability = (selectedContract) => {
  const [dataAvailability, setDataAvailability] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedContract) {
      // If no contract is selected, no data is available
      setDataAvailability({});
      setIsLoading(false);
      return;
    }

    // In a real application, you would check against your API
    // to see which visuals have data for the selected contract
    const checkDataAvailability = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, we'll assume some data is available and some isn't
        // In a real application, this would be determined by API responses
        const availability = {
          // Basic stats
          totalWallets: Math.random() > 0.5,
          activeWallets: Math.random() > 0.5,
          txnTotal: Math.random() > 0.5,
          txnLast7Days: Math.random() > 0.5,
          txnLast30Days: Math.random() > 0.5,
          
          // Medians
          medianWalletAge: Math.random() > 0.5,
          medianWalletWorth: Math.random() > 0.5,
          
          // Transaction values
          txnValueTotal: Math.random() > 0.5,
          txnValueLast7Days: Math.random() > 0.5,
          txnValueLast30Days: Math.random() > 0.5,
          
          // Conversions
          onChainConversion: Math.random() > 0.5,
          onChainConversionChange: Math.random() > 0.5,
          
          // Exchanges
          popularDex: Math.random() > 0.5,
          popularCex: Math.random() > 0.5,
          
          // Charts
          transactionChart: Math.random() > 0.5,
          walletAge: Math.random() > 0.5,
          walletBalance: Math.random() > 0.5,
          transactionCount: Math.random() > 0.5
        };
        
        setDataAvailability(availability);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking data availability:', error);
        setDataAvailability({});
        setIsLoading(false);
      }
    };
    
    checkDataAvailability();
  }, [selectedContract]);

  // Function to check if a specific visual has data
  const hasDataForVisual = (visualId) => {
    if (!selectedContract || isLoading) return false;
    return dataAvailability[visualId] || false;
  };

  return {
    hasDataForVisual,
    isLoading
  };
};

export default useDataAvailability; 