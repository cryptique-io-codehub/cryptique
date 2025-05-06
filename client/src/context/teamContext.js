// src/context/TeamContext.js
import { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  
  // Fetch teams from API
  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/teams");
      if (response.data && response.data.teams) {
        setTeams(response.data.teams);
        console.log("Teams fetched from API:", response.data.teams);
        
        // If no team is currently selected but teams are available, select the first one
        const storedTeam = localStorage.getItem("selectedTeam");
        if ((!storedTeam || storedTeam === "") && response.data.teams.length > 0) {
          const defaultTeam = response.data.teams[0].name;
          setSelectedTeam(defaultTeam);
          localStorage.setItem("selectedTeam", defaultTeam);
          console.log("No team was selected, defaulting to:", defaultTeam);
        }
      }
    } catch (error) {
      console.error("Error fetching teams from API:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    const loadTeam = () => {
      try {
        const storedTeam = localStorage.getItem("selectedTeam");
        console.log("Stored team from localStorage:", storedTeam);
        
        if (storedTeam) {
          // If the stored team is already a string, use it directly
          if (storedTeam.startsWith('"') && storedTeam.endsWith('"')) {
            // It's a JSON string representation of a string
            const parsedString = JSON.parse(storedTeam);
            console.log("Setting selectedTeam as string:", parsedString);
            setSelectedTeam(parsedString);
            return;
          }
          
          try {
            // Try to parse as JSON object
            const parsedTeam = JSON.parse(storedTeam);
            console.log("Parsed team object:", parsedTeam);
            
            if (typeof parsedTeam === 'object' && parsedTeam !== null) {
              // If it has a name property, use that
              if (parsedTeam.name) {
                console.log("Setting selectedTeam from object.name:", parsedTeam.name);
                setSelectedTeam(parsedTeam.name);
              } else {
                // Otherwise use the whole object as string
                console.log("Setting selectedTeam as stringified object:", JSON.stringify(parsedTeam));
                setSelectedTeam(JSON.stringify(parsedTeam));
              }
            } else if (typeof parsedTeam === 'string') {
              // It's a string, use directly
              console.log("Setting selectedTeam as string value:", parsedTeam);
              setSelectedTeam(parsedTeam);
            }
          } catch (error) {
            // If parsing fails, use the raw string
            console.log("JSON parsing failed, using raw string:", storedTeam);
            setSelectedTeam(storedTeam);
          }
        } else {
          console.log("No team found in localStorage");
          // Will fetch from API instead
          fetchTeams();
        }
      } catch (error) {
        console.error("Error loading team:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTeam();
    
    // Fetch teams from API in the background, even if we loaded from localStorage
    // This ensures we have the most current team list
    fetchTeams();
  }, []);
  
  // Save team to localStorage whenever it changes
  useEffect(() => {
    if (selectedTeam) {
      console.log("Saving selectedTeam to localStorage:", selectedTeam);
      localStorage.setItem("selectedTeam", JSON.stringify(selectedTeam));
    }
  }, [selectedTeam]);

  return (
    <TeamContext.Provider value={{ 
      selectedTeam, 
      setSelectedTeam, 
      isLoading, 
      teams, 
      fetchTeams 
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);