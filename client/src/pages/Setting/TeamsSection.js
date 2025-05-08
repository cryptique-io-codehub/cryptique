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

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                setIsLoading(true);
                const response = await axiosInstance.get('/team/details');
                console.log(response);
                setTeams(response.data.team);
                
                // Get current user email
                const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('selectedTeam') + "@gmail.com";
                setCurrentUserEmail(userEmail);
                
                // Automatically select the first team if available
                if (response.data.team.length > 0 && !selectedTeam) {
                    setSelectedTeam(response.data.team[0]);
                    localStorage.setItem('selectedTeam', response.data.team[0].name);
                }
            } catch (error) {
                console.error("Error fetching teams:", error);
                setError("Failed to load teams. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
    
        fetchTeams();
    }, []);

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
            const userEmail = currentUserEmail;
            const response = await axiosInstance.post('/team/createNewTeam',
                { 
                    teamName: teamName.trim(),
                    teamDescription: teamDescription.trim() || '',
                    email: userEmail,
                    role: 'admin'
                }
            );
            
            // Ensure the new team has the same structure as existing teams
            const newTeam = {
                name: response.data.newTeam.name || teamName.trim(),
                description: teamDescription.trim() || '',
                user: [{ email: userEmail }],
                role: 'admin',
                createdBy: response.data.newTeam.createdBy
            };

            // Update teams list and select the newly created team
            const updatedTeams = [...teams, newTeam];
            setTeams(updatedTeams);
            setSelectedTeam(newTeam);
            localStorage.setItem('selectedTeam', newTeam.name);
            
            // Close modal and reset
            setIsCreateModalOpen(false);
            setTeamName('');
            setTeamDescription('');
        } catch (err) {
            console.error("Team creation error:", err);
            setError(err.response?.data?.message || 'Failed to create team');
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
            const response = await axiosInstance.put(`/team/update/${teamToEdit._id}`, {
                name: teamName.trim(),
                description: teamDescription.trim()
            });

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
        } catch (err) {
            console.error("Team update error:", err);
            setError(err.response?.data?.message || 'Failed to update team');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;

        setIsLoading(true);
        setError('');

        try {
            await axiosInstance.delete(`/team/delete/${teamToDelete._id}`);
            
            // Remove the deleted team from the teams array
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
        } catch (err) {
            console.error("Team deletion error:", err);
            setError(err.response?.data?.message || 'Failed to delete team');
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
            const response = await axiosInstance.post('/team/members', { teams: team.name });
            setTeamMembers(response.data || []);
            setSelectedTeam(team);
            setIsMembersModalOpen(true);
        } catch (err) {
            console.error("Error fetching team members:", err);
            setError("Failed to load team members");
        } finally {
            setIsLoading(false);
        }
    };

    const inviteMember = async () => {
        if (!newMemberEmail.trim()) {
            setError("Email is required");
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await axiosInstance.post('/team/create', {
                email: newMemberEmail.trim(),
                role: newMemberRole,
                teamss: selectedTeam.name
            });

            // Add new member to the list (optimistic update)
            const newMember = { 
                email: newMemberEmail.trim(), 
                role: newMemberRole,
                name: newMemberEmail.trim().split('@')[0] // Temporary name until user completes signup
            };
            
            setTeamMembers([...teamMembers, newMember]);
            setNewMemberEmail('');
            setError('');
        } catch (err) {
            console.error("Error inviting member:", err);
            setError(err.response?.data?.message || "Failed to invite member");
        } finally {
            setIsLoading(false);
        }
    };

    const removeMember = async (memberEmail) => {
        if (!memberEmail || !selectedTeam) return;

        setIsLoading(true);
        try {
            await axiosInstance.post('/team/remove-member', {
                email: memberEmail,
                teamName: selectedTeam.name
            });

            // Remove member from the list
            setTeamMembers(teamMembers.filter(member => member.email !== memberEmail));
        } catch (err) {
            console.error("Error removing member:", err);
            setError("Failed to remove team member");
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

    const isTeamOwner = (team) => {
        return team.role === 'admin' || team.createdBy?.email === currentUserEmail;
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
                                {teams.map((team, index) => (
                                    <tr key={index} className="bg-white hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {team.name}
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
                                        <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                                            {team.role}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 flex justify-center space-x-3">
                                            {isTeamOwner(team) && (
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
                                ))}
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