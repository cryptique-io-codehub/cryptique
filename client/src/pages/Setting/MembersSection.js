import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Users } from "lucide-react";
import axiosInstance from "../../axiosInstance";

const MembersSection = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [activeTab, setActiveTab] = useState("members");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);

  // Fetch members when component mounts or when active tab changes
  useEffect(() => {
    if (activeTab === "members") {
      fetchMembers();
    }
  }, [activeTab]);

  const fetchMembers = async () => {
    try {
      const selectedTeam = localStorage.getItem("selectedTeam");
      
      if (!selectedTeam) {
        throw new Error("No team selected");
      }

      setLoading(true);
      const response = await axiosInstance.post('/team/members', { teams: selectedTeam });
      
      // Assuming the response contains an array of members
      setMembers(response.data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
      const errorMsg = err.response?.data?.message || "Failed to fetch members";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
  };

  const handleRoleChange = (value) => {
    setRole(value);
  };

  const sendInvite = async () => {
    try {
      // Basic validation
      if (!email.trim()) {
        setError("Email is required");
        return;
      }

      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      // Log the exact request payload for debugging
      const teamss = localStorage.getItem("selectedTeam");
      const requestPayload = { email, role, teamss };
      console.log("Sending request payload:", requestPayload);
      const response = await axiosInstance.post('/team/create', requestPayload);

      console.log(response);
      alert("Invite sent successfully!");
      setEmail(""); // Reset form
      
      // Refresh members list after sending invite
      fetchMembers();
    } catch (err) {
      console.error("Full error object:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      console.error("Error sending invite:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Members</h1>
      <p className="text-sm text-gray-500 mb-6">Manage and Invite Team Members</p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Add members to your team</h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter the email address of the person you want to invite to your team.
        </p>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
            />
            <div className="relative w-40">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md appearance-none"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex justify-end">
          <button
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={sendInvite}
            disabled={loading}
          >
            {loading ? "Sending..." : 
              <>
                <Plus size={16} className="mr-2" />
                Send invite
              </>
            }
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === "members"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("members")}
        >
          Members ({members.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === "invitations"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("invitations")}
        >
          Invitation (0)
        </button>
      </div>

      {activeTab === "members" && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading members...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : members.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No members found</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {members.map((member, index) => (
                <li 
                  key={index} 
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Users className="w-6 h-6 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 capitalize">{member.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "invitations" && (
        <div className="bg-white rounded-lg shadow">
          {/* Pending invitations would go here */}
        </div>
      )}
    </div>
  );
};

export default MembersSection;