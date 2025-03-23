import React from "react";
import { Users } from "lucide-react";

const TeamsSection = () => {
  
  // Sample team data based on your mockup
  const teams = [
    { 
      name: "abcd1@cookie3.co", 
      users: "", 
      role: "", 
      owner: "" 
    },
    { 
      name: "abcd2@cryptique.io", 
      users: "1", 
      role: "", 
      owner: "" 
    },
    { 
      name: "abcd33@gmail.com", 
      users: "", 
      role: "", 
      owner: "" 
    }
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Manage your teams</h1>
      <p className="text-sm text-gray-500 mb-8">Manage and invite Team Members</p>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Your teams</h2>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium">
            <Users size={18} />
            <span onclick-handlefunction>Create new team</span>
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
                  <td className="px-6 py-4 text-sm text-gray-500">{team.users}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{team.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{team.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamsSection;