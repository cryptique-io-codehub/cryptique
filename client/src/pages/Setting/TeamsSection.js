import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Trash2, LogOut, Info, Edit, UserPlus } from "lucide-react";
import axios from 'axios';
import axiosInstance from '../../axiosInstance';

const TeamsSection = () => {
    const [teams, setTeams] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isEditMembersModalOpen, setIsEditMembersModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [error, setError] = useState('');
    const [result, setResult] = useState();
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam') || '');
    const [teamToManage, setTeamToManage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('editor');
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const token=localStorage.getItem("token");
                const response = await axiosInstance.get('/team/details');
                console.log(response);
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
    }, [selectedTeam]);

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setError('Team name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const token = localStorage.getItem("token");
            const a = localStorage.getItem('selectedTeam')+"@gmail.com";
            const response = await axiosInstance.post('/team/createNewTeam',
                { 
                    teamName: teamName.trim(),
                    email: a,
                    role: 'admin',
                    description: teamDescription.trim()
                }
            );
            
            // Ensure the new team has the same structure as existing teams
            const newTeams = {
                name: response.data.newTeam.name || teamName.trim(),
                description: teamDescription.trim(),
                user: [{ email: a }], // Add the creator as the first user
                role: 'admin',
                createdBy: response.data.newTeam.createdBy
            };

            // Update teams list and select the newly created team
            const updatedTeams = [...teams, newTeams];
            setTeams(updatedTeams);
            setSelectedTeam(newTeams);
            
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

    const handleDeleteTeam = async () => {
        if (!teamToManage) return;

        setIsLoading(true);
        try {
            await axiosInstance.delete(`/team/delete/${teamToManage._id}`);
            
            // Update teams list
            const updatedTeams = teams.filter(team => team._id !== teamToManage._id);
            setTeams(updatedTeams);
            
            // If deleted team was selected, select another team
            if (selectedTeam._id === teamToManage._id) {
                if (updatedTeams.length > 0) {
                    setSelectedTeam(updatedTeams[0]);
                    localStorage.setItem('selectedTeam', updatedTeams[0].name);
                } else {
                    setSelectedTeam(null);
                    localStorage.removeItem('selectedTeam');
                }
            }
            
            setIsDeleteModalOpen(false);
        } catch (err) {
            console.error("Team deletion error:", err);
            setError(err.response?.data?.message || 'Failed to delete team');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveTeam = async () => {
        if (!teamToManage) return;

        setIsLoading(true);
        try {
            // Check if user is the team owner/creator
            const userEmail = localStorage.getItem('userEmail');
            const isCreator = teamToManage.createdBy?.email === userEmail;
            
            if (isCreator || teamToManage.role === 'admin') {
                throw new Error("Cannot leave a team you own. Please delete it instead.");
            }
            
            await axiosInstance.post(`/team/leave/${teamToManage._id}`);
            
            // Update teams list
            const updatedTeams = teams.filter(team => team._id !== teamToManage._id);
            setTeams(updatedTeams);
            
            // If left team was selected, select another team
            if (selectedTeam._id === teamToManage._id) {
                if (updatedTeams.length > 0) {
                    setSelectedTeam(updatedTeams[0]);
                    localStorage.setItem('selectedTeam', updatedTeams[0].name);
                } else {
                    setSelectedTeam(null);
                    localStorage.removeItem('selectedTeam');
                }
            }
            
            setIsLeaveModalOpen(false);
        } catch (err) {
            console.error("Team leave error:", err);
            setError(err.response?.data?.message || err.message || 'Failed to leave team');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTeamDropdown = () => {
        setIsTeamDropdownOpen(!isTeamDropdownOpen);
    };

    const selectTeam = (team) => {
        setSelectedTeam(team);
        setIsTeamDropdownOpen(false);
        localStorage.setItem('selectedTeam', team.name);
    };

    const openDeleteModal = (team) => {
        setTeamToManage(team);
        setIsDeleteModalOpen(true);
    };

    const openLeaveModal = (team) => {
        setTeamToManage(team);
        setError('');
        setIsLeaveModalOpen(true);
    };

    const openEditMembersModal = async (team) => {
        // Only allow team admins to manage members
        if (team.role !== 'admin') {
            setError('Only team administrators can manage members');
            return;
        }
        
        setTeamToManage(team);
        setIsLoading(true);
        setError('');
        
        try {
            // Fetch team members
            const response = await axiosInstance.get(`/team/members/${team._id}`);
            setTeamMembers(response.data || []);
        } catch (err) {
            console.error("Error fetching team members:", err);
            setError(err.response?.data?.message || 'Failed to fetch team members');
        } finally {
            setIsLoading(false);
            setIsEditMembersModalOpen(true);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail || !teamToManage) return;

        setIsLoading(true);
        try {
            await axiosInstance.post('/team/addMember', {
                teamId: teamToManage._id,
                email: newMemberEmail,
                role: newMemberRole
            });
            
            // Refresh members list
            const response = await axiosInstance.get(`/team/members/${teamToManage._id}`);
            setTeamMembers(response.data || []);
            
            // Reset form
            setNewMemberEmail('');
        } catch (err) {
            console.error("Error adding member:", err);
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!teamToManage) return;

        setIsLoading(true);
        try {
            await axiosInstance.post('/team/removeMember', {
                teamId: teamToManage._id,
                memberId: memberId
            });
            
            // Update members list
            setTeamMembers(teamMembers.filter(member => member._id !== memberId));
        } catch (err) {
            console.error("Error removing member:", err);
            setError(err.response?.data?.message || 'Failed to remove member');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeRole = async (memberId, newRole) => {
        if (!teamToManage) return;

        setIsLoading(true);
        try {
            await axiosInstance.post('/team/changeRole', {
                teamId: teamToManage._id,
                memberId: memberId,
                role: newRole
            });
            
            // Update members list with new role
            const updatedMembers = teamMembers.map(member => 
                member._id === memberId ? {...member, role: newRole} : member
            );
            setTeamMembers(updatedMembers);
        } catch (err) {
            console.error("Error changing role:", err);
            setError(err.response?.data?.message || 'Failed to change role');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl relative">
            <h1 className="text-2xl font-bold mb-1">Manage your teams</h1>
            <p className="text-sm text-gray-500 mb-8">Create teams, manage members, and control access rights</p>

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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
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
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50"
                    >
                        <Users size={18} />
                        <span>Create new team</span>
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Create, manage, and join teams to collaborate with your colleagues.</p>

                {error && (
                    <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
                        {error}
                    </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                                <th className="px-6 py-3 text-left font-medium">Team name</th>
                                <th className="px-6 py-3 text-left font-medium">Description</th>
                                <th className="px-6 py-3 text-left font-medium">Members</th>
                                <th className="px-6 py-3 text-left font-medium">Your role</th>
                                <th className="px-6 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {teams.map((team, index) => (
                                <tr key={index} className="bg-white hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{team.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {team.description || <span className="text-gray-400 italic">No description</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{team.user ? team.user.length : 0}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <span className={`px-2 py-1 rounded-full text-xs ${team.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {team.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                            {/* Only show Manage Members button to team admins */}
                                            {team.role === 'admin' && (
                                                <button 
                                                    onClick={() => openEditMembersModal(team)}
                                                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                                    title="Manage Members"
                                                >
                                                    <UserPlus size={16} />
                                                </button>
                                            )}
                                            
                                            {team.role === 'admin' && (
                                                <button 
                                                    onClick={() => openDeleteModal(team)}
                                                    className="p-1 text-red-600 hover:text-red-900 hover:bg-red-100 rounded"
                                                    title="Delete Team"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            
                                            {team.role !== 'admin' && (
                                                <button 
                                                    onClick={() => openLeaveModal(team)}
                                                    className="p-1 text-orange-600 hover:text-orange-900 hover:bg-orange-100 rounded"
                                                    title="Leave Team"
                                                >
                                                    <LogOut size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Team Creator Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Create New Team</h2>
                        
                        <div className="mb-4">
                            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
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
                            <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 mb-2">
                                Team description
                            </label>
                            <textarea 
                                id="teamDescription"
                                value={teamDescription}
                                onChange={(e) => setTeamDescription(e.target.value)}
                                placeholder="What does your team or company do?"
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        
                        <button 
                            onClick={handleCreateTeam}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-md transition-colors ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                            {isLoading ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Team Confirmation Modal */}
            {isDeleteModalOpen && teamToManage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Delete Team</h2>
                        
                        <div className="mb-6">
                            <p className="text-gray-700">
                                Are you sure you want to delete <span className="font-semibold">{teamToManage.name}</span>?
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                This action cannot be undone. All team data, including websites and smart contracts will be permanently deleted.
                            </p>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteTeam}
                                disabled={isLoading}
                                className="flex-1 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                                {isLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Team Confirmation Modal */}
            {isLeaveModalOpen && teamToManage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 relative">
                        <button 
                            onClick={() => setIsLeaveModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold mb-4">Leave Team</h2>
                        
                        <div className="mb-6">
                            <p className="text-gray-700">
                                Are you sure you want to leave <span className="font-semibold">{teamToManage.name}</span>?
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                You will lose access to all team data and will need a new invitation to rejoin.
                            </p>
                            {error && (
                                <p className="text-red-500 text-sm mt-3">{error}</p>
                            )}
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setIsLeaveModalOpen(false)}
                                className="flex-1 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleLeaveTeam}
                                disabled={isLoading}
                                className="flex-1 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
                            >
                                {isLoading ? 'Leaving...' : 'Leave Team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Members Modal - Only accessible to team admins */}
            {isEditMembersModalOpen && teamToManage && teamToManage.role === 'admin' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setIsEditMembersModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-semibold mb-2">Manage Team Members</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Team: <span className="font-medium">{teamToManage.name}</span>
                        </p>
                        
                        {/* Add Member Form - Only available for admins */}
                        <div className="bg-gray-50 p-4 rounded-md mb-6">
                            <h3 className="text-md font-medium mb-3">Add New Member</h3>
                            <div className="flex flex-col sm:flex-row gap-3 mb-2">
                                <input 
                                    type="email" 
                                    placeholder="Email address"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <select
                                    value={newMemberRole}
                                    onChange={(e) => setNewMemberRole(e.target.value)}
                                    className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button
                                    onClick={handleAddMember}
                                    disabled={isLoading || !newMemberEmail}
                                    className={`px-4 py-2 rounded-md text-white ${isLoading || !newMemberEmail ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    Add
                                </button>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center mt-2">
                                <Info size={14} className="mr-1" />
                                <span>
                                    <strong>Admin:</strong> Full control to add/remove websites and smart contracts. 
                                    <strong className="ml-2">Editor:</strong> View-only access.
                                </span>
                            </div>
                        </div>
                        
                        {/* Team Members List */}
                        <div className="border rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Member
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                                Loading members...
                                            </td>
                                        </tr>
                                    ) : teamMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                                No members found
                                            </td>
                                        </tr>
                                    ) : (
                                        teamMembers.map((member, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {member.name || 'Unknown'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {member.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="relative">
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => handleChangeRole(member._id, e.target.value)}
                                                            className="text-sm border border-gray-300 rounded px-2 py-1"
                                                            disabled={isLoading}
                                                        >
                                                            <option value="admin">Admin</option>
                                                            <option value="editor">Editor</option>
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleRemoveMember(member._id)}
                                                        disabled={isLoading}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsEditMembersModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamsSection;