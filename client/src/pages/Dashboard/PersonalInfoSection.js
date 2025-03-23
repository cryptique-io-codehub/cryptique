import React, { useState } from "react";

const PersonalInfoSection = () => {
  const [username, setUsername] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Personal settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage and invite Team Members</p>

      <div className="mb-6">
        <div className="mb-1 flex items-center">
          <span className="text-sm font-medium mr-2">Team:</span>
          <div className="relative">
            <button className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded shadow-sm text-sm">
              <span>Cryptique (Growth)</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          type="text"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-2">
          Just a heads up, your username is not used as a login method but rather as a friendly alias for your account. So go ahead and choose a fun, unique username that represents you!
        </p>
      </div>

      <div className="mb-8">
        <button className="px-6 py-2 bg-indigo-900 text-white font-medium rounded-md">
          Save
        </button>
      </div>

      <div className="text-sm text-gray-600">
        <p>
          If you want to permanently delete your account and all collected data, {" "}
          <button 
            className="text-blue-600 hover:underline"
            onClick={openDeleteModal}
          >
            click here
          </button> to proceed with the deletion procedure.
        </p>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Delete account</h3>
              <button 
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b">
              <p className="text-sm text-gray-800">
                Are you sure you want to delete your account? If you delete your account, you will permanently lose your profile, reports and data.
              </p>
            </div>
            
            <div className="p-4 flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalInfoSection;