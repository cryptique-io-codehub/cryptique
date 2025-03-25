import React, { useState, useEffect } from 'react';
import { Users } from "lucide-react";
import axios from 'axios';
const TeamsSection = () => {
    const [teams,setteams]=useState([]);
    useEffect(()=>{
      const fetchTeams = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get("http://localhost:3002/api/team/details", {
            headers: { Authorization: `Bearer ${token}`,
            'Content-Type':'application/json'
          }
          });
          setteams(response.data.team);
          console.log(response.data.team);
        } catch (error) {
          console.error("Error fetching teams:", error);
        }
      };
    
      fetchTeams();

    },[]);




  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Manage your teams</h1>
      <p className="text-sm text-gray-500 mb-8">Manage and invite Team Members</p>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Your teams</h2>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium">
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
    </div>
  );
};

export default TeamsSection;