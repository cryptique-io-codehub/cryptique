// src/context/ContractContext.js
import { createContext, useContext, useState, useEffect } from "react";

const ContractContext = createContext();

export const ContractProvider = ({ children }) => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDemoData, setShowDemoData] = useState(true);
  const [contractData, setContractData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Effect to handle the demo data logic
  useEffect(() => {
    // If a contract is selected, don't show demo data
    if (selectedContract) {
      setShowDemoData(false);
      
      // Here you would fetch real data for the selected contract
      setIsLoading(true);
      
      // Simulate fetching data (replace with actual API call)
      setTimeout(() => {
        // This is just a placeholder - you'll replace this with actual API data
        setContractData({
          // Your contract data structure here
          contractId: selectedContract.id,
          // ... other data
        });
        setIsLoading(false);
      }, 1000);
    } else {
      // If no contract is selected, show demo data
      setShowDemoData(true);
      setContractData(null);
    }
  }, [selectedContract]);

  return (
    <ContractContext.Provider 
      value={{ 
        selectedContract, 
        setSelectedContract, 
        showDemoData,
        contractData,
        isLoading 
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => useContext(ContractContext); 