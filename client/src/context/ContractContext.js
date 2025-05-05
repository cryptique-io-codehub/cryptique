import { createContext, useContext, useState, useEffect } from "react";
import useDataAvailability from "../utils/useDataAvailability";

const ContractContext = createContext();

export const ContractProvider = ({ children }) => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [hasLiveData, setHasLiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use our data availability hook
  const { hasDataForVisual, isLoading: dataCheckLoading } = useDataAvailability(selectedContract);

  // Load selected contract from localStorage on initialization
  useEffect(() => {
    const storedContract = localStorage.getItem("selectedContract");
    if (storedContract) {
      try {
        const parsedContract = JSON.parse(storedContract);
        setSelectedContract(parsedContract);
      } catch (error) {
        console.error("Error parsing stored contract:", error);
      }
    }
    setIsLoading(false);
  }, []);

  // Save selected contract to localStorage when it changes
  useEffect(() => {
    if (selectedContract) {
      localStorage.setItem("selectedContract", JSON.stringify(selectedContract));
    } else {
      localStorage.removeItem("selectedContract");
    }
  }, [selectedContract]);

  // Function to determine if demo data should be shown for a specific visual
  const shouldShowDemoData = (visualId) => {
    // If no contract is selected, show demo data
    if (!selectedContract) return true;
    
    // If data is still loading, show demo data
    if (dataCheckLoading) return true;
    
    // If the specific visual doesn't have data, show demo data
    if (!hasDataForVisual(visualId)) return true;
    
    // Otherwise, use real data
    return false;
  };

  return (
    <ContractContext.Provider 
      value={{ 
        selectedContract, 
        setSelectedContract,
        hasLiveData,
        setHasLiveData,
        isLoading: isLoading || dataCheckLoading,
        shouldShowDemoData,
        hasDataForVisual
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => useContext(ContractContext); 