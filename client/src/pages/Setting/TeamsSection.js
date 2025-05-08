import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Trash2, Edit, X, UserPlus, UserMinus, Info } from "lucide-react";
import axios from 'axios';
import axiosInstance from '../../axiosInstance';

const TeamsSection = () => {
    const [teams, setTeams] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [error, setError] = useState('');
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
    const [teamToEdit, setTeamToEdit] = useState(null);
    const [teamToDelete, setTeamToDelete] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('editor');
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    // Helper function to get the current user email from various localStorage keys
    const getCurrentUserEmail = () => {
        const userEmail = localStorage.getItem('userEmail');
        const email = localStorage.getItem('email');
        const userString = localStorage.getItem('User');
        
        // Try to parse user object if it exists
        let userObject = null;
        if (userString) {
            try {
                userObject = JSON.parse(userString);
                console.log("Found user object in localStorage:", userObject);
            } catch (err) {
                console.error("Error parsing User from localStorage:", err);
            }
        }
        
        // Get email from different possible sources
        const emailFromUserObject = userObject?.email || userObject?.userEmail;
        
        // Use the first valid email found
        const finalEmail = userEmail || email || emailFromUserObject || '';
        
        console.log("Determined user email:", finalEmail);
        return finalEmail;
    };

    // Helper function to determine if user is a team owner
    const isTeamOwner = (team) => {
        if (!team) return false;
        
        // If we've already determined ownership and added a flag, use it
        if (team.hasOwnProperty('isOwner')) {
            return team.isOwner;
        }
        
        try {
            // Get current user information
            const userEmail = getCurrentUserEmail();
            const userId = getCurrentUserId();
            
            // In the backend, ownership is determined by:
            // 1. The user is the first member of the team (as mentioned by the user)
            // 2. Or the user's ID matches the team's createdBy field
            
            // Check if user is the creator
            const isCreator = team.createdBy && 
                             ((team.createdBy === userId) || 
                              (team.createdBy._id === userId) ||
                              (team.createdBy.email === userEmail));
            
            // Check if user is the first member of the team
            let isFirstMember = false;
            if (team.user && Array.isArray(team.user) && team.user.length > 0) {
                const firstMember = team.user[0];
                isFirstMember = 
                    (firstMember.userId === userId) || 
                    (firstMember.userId && firstMember.userId._id === userId) || 
                    (firstMember.email === userEmail);
            }
            
            // For frontend display purposes, we also check the role property
            const hasAdminRole = team.role === 'admin';
            
            // Combine all checks to determine final ownership
            // Per user's clarification, the first member is the owner
            // So we prioritize first member check over other checks
            const isOwner = isFirstMember || isCreator || hasAdminRole;
            
            // Cache the result on the object
            team.isOwner = isOwner;
            
            // Log diagnostic information
            console.log(`Team "${team.name}" ownership check:`, {
                userId,
                userEmail,
                isFirstMember,
                isCreator,
                hasAdminRole,
                finalOwnerStatus: isOwner
            });
            
            return isOwner;
        } catch (err) {
            console.error("Error in isTeamOwner:", err);
            return false;
        }
    };

    // Function to manage deleted teams in localStorage
    const markTeamAsDeleted = (teamId, teamName) => {
        try {
            // Get current list of deleted teams from localStorage
            const deletedTeamsString = localStorage.getItem('deletedTeams') || '[]';
            const deletedTeams = JSON.parse(deletedTeamsString);
            
            // Add this team to the deleted teams list
            deletedTeams.push({
                _id: teamId,
                name: teamName,
                deletedAt: new Date().toISOString()
            });
            
            // Save back to localStorage
            localStorage.setItem('deletedTeams', JSON.stringify(deletedTeams));
            console.log(`Marked team "${teamName}" as deleted in localStorage`);
        } catch (err) {
            console.error("Error storing deleted team in localStorage:", err);
        }
    };
    
    // Function to check if a team is marked as deleted
    const isTeamDeleted = (teamId, teamName) => {
        try {
            const deletedTeamsString = localStorage.getItem('deletedTeams') || '[]';
            const deletedTeams = JSON.parse(deletedTeamsString);
            
            return deletedTeams.some(team => 
                team._id === teamId || team.name === teamName
            );
        } catch (err) {
            console.error("Error checking deleted teams in localStorage:", err);
            return false;
        }
    };

    // Function to fetch teams with proper ownership handling
    const fetchTeams = async () => {
        try {
            setIsLoading(true);
            setError('');
            
            // Get user info
            const userEmail = getCurrentUserEmail();
            const userId = getCurrentUserId();
            
            setCurrentUserEmail(userEmail);
            
            console.log("Fetching teams for user:", { email: userEmail, id: userId });
            
            // Fetch teams from API
            const response = await axiosInstance.get('/team/details');
            console.log("Team details raw response:", response.data);
            
            if (response.data && response.data.team) {
                // Filter out teams that were marked as deleted in localStorage
                const filteredTeams = response.data.team.filter(team => 
                    !isTeamDeleted(team._id, team.name)
                );
                
                console.log(`Filtered out ${response.data.team.length - filteredTeams.length} deleted teams`);
                
                // Process each team to ensure proper structure and ownership
                const processedTeams = filteredTeams.map(team => {
                    // Copy to avoid mutation
                    const processedTeam = { ...team };
                    
                    // Ensure these fields exist
                    processedTeam.name = team.name || '';
                    
                    // Add isOwner flag based on first member rule
                    processedTeam.isOwner = false;
                    
                    // Check if user is the first member of the team
                    if (team.user && Array.isArray(team.user) && team.user.length > 0) {
                        const firstMember = team.user[0];
                        const isFirstMember = 
                            (firstMember.userId === userId) || 
                            (firstMember.userId && firstMember.userId._id === userId) || 
                            (firstMember.email === userEmail);
                            
                        if (isFirstMember) {
                            processedTeam.isOwner = true;
                            processedTeam.role = 'admin';
                        }
                    }
                    
                    // Check if user is creator (fallback)
                    const isCreator = team.createdBy && 
                                     ((team.createdBy === userId) || 
                                      (team.createdBy._id === userId) ||
                                      (team.createdBy.email === userEmail));
                                      
                    if (isCreator) {
                        processedTeam.isOwner = true;
                        processedTeam.role = 'admin';
                    }
                    
                    // Handle just-created teams
                    const justCreatedTeamName = localStorage.getItem('justCreatedTeam');
                    if (justCreatedTeamName && processedTeam.name === justCreatedTeamName) {
                        processedTeam.isOwner = true;
                        processedTeam.role = 'admin';
                        if (!processedTeam.createdBy) {
                            processedTeam.createdBy = { _id: userId, email: userEmail };
                        }
                        console.log(`Setting ownership for just created team "${processedTeam.name}"`);
                        localStorage.removeItem('justCreatedTeam');
                    }
                    
                    return processedTeam;
                });
                
                console.log("Processed teams with ownership:", processedTeams);
                setTeams(processedTeams);
                
                // Update selected team if needed
                if (processedTeams.length > 0) {
                    if (!selectedTeam || !selectedTeam.name) {
                        setSelectedTeam(processedTeams[0]);
                        localStorage.setItem('selectedTeam', processedTeams[0].name);
                    } else {
                        // Find and update the selected team if it exists
                        const updatedSelectedTeam = processedTeams.find(t => 
                            t.name === selectedTeam.name || t._id === selectedTeam._id
                        );
                        
                        if (updatedSelectedTeam) {
                            setSelectedTeam(updatedSelectedTeam);
                        } else if (isTeamDeleted(selectedTeam._id, selectedTeam.name)) {
                            // If selected team was deleted, select first available team
                            setSelectedTeam(processedTeams[0]);
                            localStorage.setItem('selectedTeam', processedTeams[0].name);
                        }
                    }
                }
            } else {
                console.error("Invalid team data format:", response.data);
                setTeams([]);
            }
        } catch (error) {
            console.error("Error fetching teams:", error);
            setError("Failed to load teams. Please try again.");
            setTeams([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Initial fetch on component mount and setup refresh listeners
    useEffect(() => {
        // Fetch teams on first load
        fetchTeams();
        
        // Log authentication state
        const token = localStorage.getItem('accessToken');
        const userString = localStorage.getItem('User');
        
        console.log("Authentication state:", {
            hasToken: !!token,
            hasUserData: !!userString,
            tokenPrefix: token ? token.substring(0, 10) + '...' : 'Not found'
        });
        
        // Add page load event listener to ensure data persists across refreshes
        const handlePageLoad = () => {
            console.log("Page refresh detected, reloading team data...");
            fetchTeams();
        };
        
        // Listen for page reloads
        window.addEventListener('load', handlePageLoad);
        
        // Clean up
        return () => {
            window.removeEventListener('load', handlePageLoad);
        };
    }, []);
    
    // Effect to persist selected team to localStorage whenever it changes
    useEffect(() => {
        if (selectedTeam && selectedTeam.name) {
            localStorage.setItem('selectedTeam', selectedTeam.name);
            
            // Also persist team data in a structured format
            try {
                localStorage.setItem('selectedTeamData', JSON.stringify({
                    _id: selectedTeam._id,
                    name: selectedTeam.name,
                    role: selectedTeam.role || 'member',
                    isOwner: isTeamOwner(selectedTeam)
                }));
            } catch (err) {
                console.error("Error saving team data to localStorage:", err);
            }
        }
    }, [selectedTeam]);

    // Function to filter teams owned by the current user
    const getOwnedTeams = () => {
        return teams.filter(team => 
            team.role === 'admin' || team.createdBy?.email === currentUserEmail
        );
    };

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setError('Team name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Get current user email using our helper function
            const userEmail = getCurrentUserEmail();
            const userId = getCurrentUserId();
            
            if (!userEmail) {
                throw new Error("User email not found. Please login again.");
            }
            
            console.log("Creating team with payload:", {
                teamName: teamName.trim(),
                email: userEmail,
                // Note: description is not used in the createNewTeam endpoint
            });
            
            // Use the CORRECT endpoint for team creation
            const response = await axiosInstance.post('/team/createNewTeam',
                { 
                    teamName: teamName.trim(),
                    email: userEmail,
                    // The description will be handled separately or in a follow-up update
                }
            );
            
            console.log("Team creation response:", response.data);
            
            // Mark this team as just created for the fetch logic to handle
            localStorage.setItem('justCreatedTeam', teamName.trim());
            
            // Ensure the new team has the same structure as existing teams
            const newTeam = {
                _id: response.data.newTeam?._id || Date.now().toString(),
                name: response.data.newTeam?.name || teamName.trim(),
                description: teamDescription.trim() || '',
                // Create a user array with the current user as the first member
                user: [{ 
                    userId: userId || 'temp-' + Date.now(),
                    email: userEmail,
                    role: 'admin'
                }],
                // Force owner role regardless of what the API returned
                role: 'admin',
                createdBy: { 
                    _id: userId || 'temp-' + Date.now(),
                    email: userEmail 
                }
            };

            // Update teams list and select the newly created team
            const updatedTeams = [...teams, newTeam];
            setTeams(updatedTeams);
            setSelectedTeam(newTeam);
            localStorage.setItem('selectedTeam', newTeam.name);
            
            // Store ownership data for this team
            try {
                localStorage.setItem('selectedTeamData', JSON.stringify({
                    _id: newTeam._id,
                    name: newTeam.name,
                    role: 'admin',
                    isOwner: true,
                    isCreator: true
                }));
            } catch (err) {
                console.error("Error saving team data to localStorage:", err);
            }
            
            // Close modal and reset
            setIsCreateModalOpen(false);
            setTeamName('');
            setTeamDescription('');
            
            // Alert success message
            alert(`Team "${newTeam.name}" created successfully!`);
            
            // Refresh teams list
            fetchTeams();
        } catch (err) {
            console.error("Team creation error:", err);
            let errorMsg = "";
            
            if (err.response?.status === 404 && err.response?.data?.message === "User not found") {
                errorMsg = "User not found. Please ensure you are logged in correctly.";
            } else if (err.response?.status === 400 && err.response?.data?.message === "Team already exist") {
                errorMsg = "A team with this name already exists. Please choose a different name.";
            } else {
                errorMsg = err.response?.data?.message || 'Failed to create team. Please try again.';
            }
            
            setError(errorMsg);
            alert(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditTeam = async () => {
        if (!teamToEdit || !teamName.trim()) {
            setError('Team name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log("Updating team with payload:", {
                teamId: teamToEdit._id,
                name: teamName.trim(),
                description: teamDescription.trim()
            });
            
            // Use the correct endpoint for team update
            const response = await axiosInstance.post(`/team/update`, {
                teamId: teamToEdit._id,
                name: teamName.trim(),
                description: teamDescription.trim()
            });

            console.log("Team update response:", response.data);

            // Update the team in the teams array
            const updatedTeams = teams.map(team => 
                team._id === teamToEdit._id 
                    ? {...team, name: teamName.trim(), description: teamDescription.trim()} 
                    : team
            );
            
            setTeams(updatedTeams);
            
            // If the edited team is the selected team, update selectedTeam
            if (selectedTeam._id === teamToEdit._id) {
                const updatedSelectedTeam = {...selectedTeam, name: teamName, description: teamDescription};
                setSelectedTeam(updatedSelectedTeam);
                localStorage.setItem('selectedTeam', teamName);
            }
            
            // Close modal and reset
            setIsEditModalOpen(false);
            setTeamName('');
            setTeamDescription('');
            setTeamToEdit(null);
            
            // Show success message
            alert(`Team "${teamName.trim()}" updated successfully!`);
        } catch (err) {
            console.error("Team update error:", err);
            const errorMsg = err.response?.data?.message || 'Failed to update team. Please try again.';
            setError(errorMsg);
            alert(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;

        setIsLoading(true);
        setError('');

        try {
            console.log("Deleting team:", teamToDelete._id);
            
            // Use the correct API endpoint that we just added to the backend
            const response = await axiosInstance.post('/team/delete', { 
                teamId: teamToDelete._id 
            });
            
            console.log("Team deletion response:", response?.data);
            
            // Remove the deleted team from the teams array in state
            const updatedTeams = teams.filter(team => team._id !== teamToDelete._id);
            setTeams(updatedTeams);
            
            // If the deleted team is the selected team, select another team
            if (selectedTeam._id === teamToDelete._id && updatedTeams.length > 0) {
                setSelectedTeam(updatedTeams[0]);
                localStorage.setItem('selectedTeam', updatedTeams[0].name);
            } else if (updatedTeams.length === 0) {
                setSelectedTeam(null);
                localStorage.removeItem('selectedTeam');
            }
            
            // Close modal and reset
            setIsDeleteModalOpen(false);
            setTeamToDelete(null);
            
            // Show success message
            alert(`Team "${teamToDelete.name}" deleted successfully!`);
            
            // Also remove from localStorage deleted teams list if it exists there
            try {
                const deletedTeamsString = localStorage.getItem('deletedTeams') || '[]';
                const deletedTeams = JSON.parse(deletedTeamsString);
                const filteredTeams = deletedTeams.filter(team => 
                    team._id !== teamToDelete._id && team.name !== teamToDelete.name
                );
                localStorage.setItem('deletedTeams', JSON.stringify(filteredTeams));
            } catch (err) {
                console.error("Error updating localStorage:", err);
            }
            
        } catch (err) {
            console.error("Team deletion error:", err);
            
            let errorMsg = "Failed to delete team. ";
            
            if (err.response?.status === 404) {
                errorMsg += "Team not found.";
            } else if (err.response?.status === 403) {
                errorMsg += "You don't have permission to delete this team.";
            } else {
                errorMsg += err.response?.data?.message || "Please try again.";
            }
            
            setError(errorMsg);
            alert(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (team) => {
        setTeamToEdit(team);
        setTeamName(team.name);
        setTeamDescription(team.description || '');
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (team) => {
        setTeamToDelete(team);
        setIsDeleteModalOpen(true);
    };

    const openMembersModal = async (team) => {
        try {
            setIsLoading(true);
            setError('');
            // Store the team we're working with
            const teamToManage = team;
            setSelectedTeam(teamToManage);
            
            console.log("Opening members modal for team:", teamToManage.name);
            
            // Fetch team members
            const response = await axiosInstance.post('/team/members', { teams: teamToManage.name });
            console.log("Team members response:", response.data);
            setTeamMembers(response.data || []);
            setIsMembersModalOpen(true);
        } catch (err) {
            console.error("Error fetching team members:", err);
            setError("Failed to load team members. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const inviteMember = async () => {
        if (!newMemberEmail.trim()) {
            setError("Email is required");
            return;
        }
        
        if (!selectedTeam || !selectedTeam.name) {
            setError("No team selected");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log("Inviting member:", {
                email: newMemberEmail.trim(),
                role: newMemberRole,
                teamss: selectedTeam.name
            });
            
            const response = await axiosInstance.post('/team/create', {
                email: newMemberEmail.trim(),
                role: newMemberRole,
                teamss: selectedTeam.name
            });

            console.log("Invite response:", response.data);
            
            // Add new member to the list (optimistic update)
            const newMember = { 
                email: newMemberEmail.trim(), 
                role: newMemberRole,
                name: newMemberEmail.trim().split('@')[0] // Temporary name until user completes signup
            };
            
            setTeamMembers([...teamMembers, newMember]);
            setNewMemberEmail('');
            setError('');
            
            // Show success message
            alert(`Successfully invited ${newMemberEmail.trim()} to the team.`);
        } catch (err) {
            console.error("Error inviting member:", err);
            const errorMessage = err.response?.data?.message || "Failed to invite member. Please try again.";
            setError(errorMessage);
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const removeMember = async (memberEmail) => {
        if (!memberEmail || !selectedTeam) return;
        
        // Confirmation before removing
        if (!window.confirm(`Remove ${memberEmail} from team ${selectedTeam.name}?`)) {
            return;
        }

        setIsLoading(true);
        setError('');
        
        try {
            console.log("Removing member:", memberEmail, "from team:", selectedTeam.name);
            
            const response = await axiosInstance.post('/team/remove-member', {
                email: memberEmail,
                teamName: selectedTeam.name
            });
            
            console.log("Remove member response:", response.data);

            // Remove member from the list
            setTeamMembers(teamMembers.filter(member => member.email !== memberEmail));
            
            // Show success message
            alert(`Successfully removed ${memberEmail} from the team.`);
        } catch (err) {
            console.error("Error removing member:", err);
            setError(err.response?.data?.message || "Failed to remove team member. Please try again.");
            alert("Failed to remove team member. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTeamDropdown = () => {
        setIsTeamDropdownOpen(!isTeamDropdownOpen);
    };

    const selectTeam = (team) => {
        setSelectedTeam(team);
        localStorage.setItem('selectedTeam', team.name);
        setIsTeamDropdownOpen(false);
    };

    // Function to filter and show only teams in the table
    const getDisplayTeams = () => {
        // If no teams, return empty array
        if (!teams || teams.length === 0) {
            return [];
        }
        // Return all teams for display
        return teams;
    };

    // Function to initialize teams from localStorage if available
    useEffect(() => {
        try {
            // Check if we have cached team data
            const cachedTeamData = localStorage.getItem('selectedTeamData');
            if (cachedTeamData) {
                const teamData = JSON.parse(cachedTeamData);
                console.log("Found cached team data:", teamData);
                
                // Use cached data until API response comes back
                if (!selectedTeam || !selectedTeam.name) {
                    setSelectedTeam({
                        _id: teamData._id,
                        name: teamData.name,
                        role: teamData.role,
                        createdBy: { _id: getCurrentUserId() }
                    });
                }
            }
        } catch (err) {
            console.error("Error loading cached team data:", err);
        }
    }, []);
    
    // Helper function to get user ID
    const getCurrentUserId = () => {
        const userString = localStorage.getItem('User');
        if (!userString) return '';
        
        try {
            const userObj = JSON.parse(userString);
            return userObj._id || '';
        } catch (err) {
            console.error("Error getting user ID:", err);
            return '';
        }
    };

    return (
        <div className="max-w-5xl relative">
            <h1 className="text-2xl font-bold mb-1">Manage your teams</h1>
            <p className="text-sm text-gray-500 mb-8">Create teams, add members, and manage team settings</p>

            {/* Team Selector Dropdown */}
            <div className="relative mb-6">
                <button 
                    onClick={toggleTeamDropdown}
                    className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                >
                    <span className="truncate">{selectedTeam ? selectedTeam.name : 'Select a Team'}</span>
                    <ChevronDown size={18} />
                </button>
                
                {isTeamDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {teams.map((team, index) => (
                            <div 
                                key={index} 
                                onClick={() => selectTeam(team)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-ellipsis whitespace-nowrap"
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
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-900 text-white border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-800"
                    >
                        <Users size={18} />
                        <span>Create new team</span>
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Create and manage teams you own to collaborate with your colleagues.</p>

                {isLoading && <div className="text-center py-4">Loading teams...</div>}
                {error && <div className="text-red-500 mb-4">{error}</div>}

                {!isLoading && teams.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <p className="text-gray-500">You don't have any teams yet. Create your first team to get started!</p>
                    </div>
                ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                                <th className="px-6 py-3 text-left font-medium">Team name</th>
                                    <th className="px-6 py-3 text-left font-medium">Description</th>
                                    <th className="px-6 py-3 text-left font-medium">Members</th>
                                <th className="px-6 py-3 text-left font-medium">Your role</th>
                                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                                {getDisplayTeams().map((team, index) => {
                                    const isOwner = team.isOwner || isTeamOwner(team);
                                    return (
                                    <tr key={index} className={`bg-white hover:bg-gray-50 ${isOwner ? 'border-l-4 border-green-500' : ''}`}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {team.name}
                                            {isOwner && (
                                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold border border-green-300">
                                                    Owner
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {team.description || "No description"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {team.user ? team.user.length : 0} 
                                            <button 
                                                onClick={() => openMembersModal(team)}
                                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                                            >
                                                View
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <span className={`capitalize ${isOwner ? 'font-bold text-green-700' : ''}`}>
                                                {team.role || "Member"}
                                            </span>
                                            {isOwner && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Full control
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 flex justify-center space-x-3">
                                            {isOwner && (
                                                <>
                                                    <button 
                                                        onClick={() => openEditModal(team)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Edit team"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(team)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete team"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                </tr>
                                )})}
                        </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* Team Creator Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full relative">
                        <button 
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setTeamName('');
                                setTeamDescription('');
                                setError('');
                            }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Create a new team</h2>
                        
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
                            <p className="text-gray-500 text-xs mt-1">Team name must be unique</p>
                        </div>

                        <div className="mb-4">
                            <label 
                                htmlFor="teamDescription" 
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Team description
                            </label>
                            <textarea 
                                id="teamDescription"
                                value={teamDescription}
                                onChange={(e) => setTeamDescription(e.target.value)}
                                placeholder="Describe the purpose of this team"
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        {error && (
                            <p className="text-red-500 text-sm mb-4">{error}</p>
                        )}
                        
                        <button 
                            onClick={handleCreateTeam}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-md transition-colors ${isLoading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-900 text-white hover:bg-indigo-800'}`}
                        >
                            {isLoading ? 'Creating...' : 'Create team'}
                        </button>
                    </div>
                </div>
            )}

            {/* Team Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full relative">
                        <button 
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setTeamName('');
                                setTeamDescription('');
                                setTeamToEdit(null);
                                setError('');
                            }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Edit team</h2>
                        
                        <div className="mb-4">
                            <label 
                                htmlFor="editTeamName" 
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Team name*
                            </label>
                            <input 
                                type="text" 
                                id="editTeamName"
                                value={teamName}
                                onChange={(e) => {
                                    setTeamName(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter team name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="mb-4">
                            <label 
                                htmlFor="editTeamDescription" 
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Team description
                            </label>
                            <textarea 
                                id="editTeamDescription"
                                value={teamDescription}
                                onChange={(e) => setTeamDescription(e.target.value)}
                                placeholder="Describe the purpose of this team"
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        {error && (
                            <p className="text-red-500 text-sm mb-4">{error}</p>
                        )}
                        
                        <button 
                            onClick={handleEditTeam}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-md transition-colors ${isLoading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-900 text-white hover:bg-indigo-800'}`}
                        >
                            {isLoading ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* Team Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full relative">
                        <button 
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setTeamToDelete(null);
                            }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Delete team</h2>
                        
                        <div className="mb-6">
                            <p className="text-gray-700 mb-2">
                                Are you sure you want to delete the team "{teamToDelete?.name}"?
                            </p>
                            <p className="text-red-600 text-sm">
                                This action cannot be undone. All team data and settings will be permanently removed.
                            </p>
                        </div>
                        
                        {error && (
                            <p className="text-red-500 text-sm mb-4">{error}</p>
                        )}
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteTeam}
                                disabled={isLoading}
                                className={`px-4 py-2 rounded-md text-white ${isLoading ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isLoading ? 'Deleting...' : 'Delete team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Members Modal */}
            {isMembersModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative max-h-[80vh] flex flex-col">
                        <button 
                            onClick={() => {
                                setIsMembersModalOpen(false);
                                setTeamMembers([]);
                                setNewMemberEmail('');
                                setNewMemberRole('editor');
                                setError('');
                            }}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-semibold mb-2">Team members</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Manage members for {selectedTeam?.name}
                        </p>
                        
                        {/* Always show this section for debugging/development */}
                        <div className="mb-2 text-xs text-gray-500">
                            Team Owner: {isTeamOwner(selectedTeam) ? 'Yes' : 'No'} | 
                            Role: {selectedTeam?.role} | 
                            Creator Email: {selectedTeam?.createdBy?.email || 'Unknown'} | 
                            Your Email: {currentUserEmail || 'Unknown'}
                        </div>
                        
                        {isTeamOwner(selectedTeam) && (
                            <div className="mb-6 bg-gray-50 p-4 rounded-md">
                                <h3 className="text-md font-medium mb-3">Invite new member</h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    <select
                                        value={newMemberRole}
                                        onChange={(e) => setNewMemberRole(e.target.value)}
                                        className="sm:w-32 px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                    <button 
                                        onClick={inviteMember}
                                        disabled={isLoading || !newMemberEmail.trim()}
                                        className={`px-4 py-2 rounded-md text-white flex items-center justify-center ${
                                            isLoading || !newMemberEmail.trim() 
                                                ? 'bg-indigo-300 cursor-not-allowed' 
                                                : 'bg-indigo-900 hover:bg-indigo-800'
                                        }`}
                                    >
                                        <UserPlus size={16} className="mr-2" />
                                        Invite
                                    </button>
                                </div>
                                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                            </div>
                        )}
                        
                        <div className="overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="text-center py-4">Loading members...</div>
                            ) : teamMembers.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">No members found</div>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200">
                                    <ul className="divide-y divide-gray-200">
                                        {teamMembers.map((member, index) => (
                                            <li key={index} className="px-4 py-3 flex justify-between items-center">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-medium text-sm mr-3">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{member.name || 'Unnamed User'}</p>
                                                        <p className="text-xs text-gray-500">{member.email}</p>
                                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {isTeamOwner(selectedTeam) && member.email !== currentUserEmail && (
                                                    <button 
                                                        onClick={() => removeMember(member.email)}
                                                        disabled={isLoading}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Remove member"
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsSection;