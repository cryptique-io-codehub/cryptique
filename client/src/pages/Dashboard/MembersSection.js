import React, { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";

const MembersSection = () => {
  const [invites, setInvites] = useState([
    { email: "", role: "Admin" }
  ]);
  const [activeTab, setActiveTab] = useState("members");

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "Admin" }]);
  };

  const removeInvite = (index) => {
    const newInvites = [...invites];
    newInvites.splice(index, 1);
    setInvites(newInvites);
  };

  const handleEmailChange = (index, value) => {
    const newInvites = [...invites];
    newInvites[index].email = value;
    setInvites(newInvites);
  };

  const handleRoleChange = (index, value) => {
    const newInvites = [...invites];
    newInvites[index].role = value;
    setInvites(newInvites);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Members</h1>
      <p className="text-sm text-gray-500 mb-6">Manage and Invite Team Members</p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Add members to your team</h2>
        <p className="text-sm text-gray-500 mb-4">Enter the email addresses of the people you want to invite to your team.</p>

        <div className="space-y-3 mb-4">
          {invites.map((invite, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                value={invite.email}
                onChange={(e) => handleEmailChange(index, e.target.value)}
              />
              <div className="relative w-40">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md appearance-none"
                  value={invite.role}
                  onChange={(e) => handleRoleChange(index, e.target.value)}
                >
                  <option>Admin</option>
                  <option>Editor</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <button 
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                onClick={() => removeInvite(index)}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            onClick={addInvite}
          >
            <Users size={16} className="mr-2" />
            Add another
          </button>

          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus size={16} className="mr-2" />
            Send invite
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
          Members (3)
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
          {/* Member list would go here */}
          {/* This is a placeholder - you'd typically fetch and display team members here */}
        </div>
      )}

      {activeTab === "invitations" && (
        <div className="bg-white rounded-lg shadow">
          {/* Pending invitations would go here */}
          {/* This is a placeholder - you'd typically fetch and display pending invitations here */}
        </div>
      )}
    </div>
  );
};

export default MembersSection;