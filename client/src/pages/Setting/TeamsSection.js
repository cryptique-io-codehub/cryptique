import React, { useState, useEffect } from 'react';
import { Users, ChevronDown } from "lucide-react";
import axios from 'axios';

const TeamsSection = () => {
    const [teams, setTeams] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [error, setError] = useState('');
    const [result, setResult] = useState();
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:3002/api/team/details", {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type':'application/json'
                    }
                });
                setTeams(response.data.team);
                // Automatically select the first team if available
                if (response.data.team.length > 0) {
                    setSelectedTeam(response.data.team[0]);
                }
            } catch (error) {
                console.error("Error fetching teams:", error);
            }
        };
    
        fetchTeams();
    }, []);

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setError('Team name is required');
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const a = localStorage.getItem('selectedTeam')+"@gmail.com";
            const response = await axios.post("http://localhost:3002/api/team/createNewTeam", 
                { 
                    teamName: teamName.trim(),
                    email: a,
                    role: 'admin'
                }, 
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type':'application/json'
                    }
                }
            );
            setResult(response.data);
            
            // Update teams list and select the newly created team
            const updatedTeams = [...teams, response.data.team];
            setTeams(updatedTeams);
            setSelectedTeam(response.data.team);
            
            // Close modal and reset
            setIsModalOpen(false);
            setTeamName('');
            setError('');
        } catch (err) {
            console.error("Team creation error:", err);
            setError(err.response?.data?.message || 'Failed to create team');
        }
    };

    const toggleTeamDropdown = () => {
        setIsTeamDropdownOpen(!isTeamDropdownOpen);
    };

    const selectTeam = (team) => {
        setSelectedTeam(team);
        setIsTeamDropdownOpen(false);
    };

    return (
        <div className="max-w-5xl relative">
            <h1 className="text-2xl font-bold mb-1">Manage your teams</h1>
            <p className="text-sm text-gray-500 mb-8">Manage and invite Team Members</p>

            {/* Team Selector Dropdown */}
            <div className="relative mb-6">
                <button 
                    onClick={toggleTeamDropdown}
                    className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                >
                    <span>{selectedTeam ? selectedTeam.name : 'Select a Team'}</span>
                    <ChevronDown size={18} />
                </button>
                
                {isTeamDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {teams.map((team, index) => (
                            <div 
                                key={index} 
                                onClick={() => selectTeam(team)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                                {team.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Your teams</h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium"
                    >
                        <Users size={18} />
                        <span>Create new team</span>
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Create, manage, and join teams to collaborate with your colleagues.</p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                                <th className="px-6 py-3 text-left font-medium">Team name</th>
                                <th className="px-6 py-3 text-left font-medium">Users</th>
                                <th className="px-6 py-3 text-left font-medium">Your role</th>
                                <th className="px-6 py-3 text-left font-medium">Owner</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {teams.map((team, index) => (
                                <tr key={index} className="bg-white hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{team.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{team.user.length}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{team.role}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{team.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Team Creator Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Team Creator</h2>
                        
                        <div className="mb-4">
                            <label 
                                htmlFor="teamName" 
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Team name*
                            </label>
                            <input 
                                type="text" 
                                id="teamName"
                                value={teamName}
                                onChange={(e) => {
                                    setTeamName(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter team name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {error && (
                                <p className="text-red-500 text-sm mt-1">{error}</p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">Team name must be unique</p>
                        </div>
                        
                        <button 
                            onClick={handleCreateTeam}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsSection;