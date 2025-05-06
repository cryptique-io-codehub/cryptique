// src/context/TeamContext.js
import { createContext, useContext, useState, useEffect } from "react";

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const storedTeam = localStorage.getItem("selectedTeam");
    if (storedTeam) {
      try {
        const parsedTeam = JSON.parse(storedTeam);
        setSelectedTeam(parsedTeam.name || '');
        
        // Ensure we're using the stored team name in the URL
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        
        if (pathSegments.length > 0 && pathSegments[0] !== parsedTeam.name) {
          // Update URL to use the correct team name if needed
          const newPath = currentPath.replace(`/${pathSegments[0]}/`, `/${parsedTeam.name}/`);
          window.history.replaceState(null, '', newPath);
        }
      } catch (error) {
        console.error("Error parsing team data from localStorage:", error);
        // Clear the invalid data
        localStorage.removeItem("selectedTeam");
      }
    } else {
      // If no team is selected, get teams from the server and select the first one
      const fetchDefaultTeam = async () => {
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const response = await fetch('/api/team/details', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.team && data.team.length > 0) {
                const defaultTeam = data.team[0];
                localStorage.setItem('selectedTeam', JSON.stringify(defaultTeam));
                setSelectedTeam(defaultTeam.name);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching default team:", error);
        }
      };
      
      fetchDefaultTeam();
    }
    
    setIsLoading(false);
  }, []);

  return (
    <TeamContext.Provider value={{ selectedTeam, setSelectedTeam, isLoading }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);