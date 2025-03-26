// src/context/TeamContext.js
import { createContext, useContext, useState, useEffect } from "react";

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const storedTeam = localStorage.getItem("selectedTeam");
    if (storedTeam) {
      const parsedTeam = JSON.parse(storedTeam);
      setSelectedTeam(parsedTeam.name);
    }
    setIsLoading(false);
    console.log(selectedTeam); 
  }, []);

  return (
    <TeamContext.Provider value={{ selectedTeam, setSelectedTeam,isLoading }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);