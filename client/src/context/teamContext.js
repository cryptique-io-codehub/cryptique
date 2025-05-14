// src/context/TeamContext.js
import { createContext, useContext, useState, useEffect } from "react";

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeamData = () => {
      try {
        const teamData = localStorage.getItem('selectedTeamData');
        if (teamData) {
          const parsedTeam = JSON.parse(teamData);
          console.log('Loaded team data from localStorage:', parsedTeam);
          console.log('Team subscription data:', parsedTeam.subscription);
          setSelectedTeam(parsedTeam);
        }
      } catch (error) {
        console.error('Error loading team data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();

    // Listen for changes to selectedTeamData in localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'selectedTeamData') {
        console.log('Team data changed in localStorage');
        loadTeamData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateSelectedTeam = (team) => {
    console.log('Updating selected team:', team);
    setSelectedTeam(team);
    if (team) {
      localStorage.setItem('selectedTeamData', JSON.stringify(team));
    } else {
      localStorage.removeItem('selectedTeamData');
    }
  };

  return (
    <TeamContext.Provider value={{ selectedTeam, setSelectedTeam: updateSelectedTeam, isLoading }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};