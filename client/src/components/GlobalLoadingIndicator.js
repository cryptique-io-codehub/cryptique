import React, { useState, useEffect } from 'react';

/**
 * A global loading indicator that listens for loading events across the app
 * and displays a loading overlay when needed.
 */
const GlobalLoadingIndicator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState('');

  useEffect(() => {
    // Listen for global loading events
    const handleGlobalLoading = (event) => {
      console.log('Global loading state changed:', event.detail);
      setIsLoading(event.detail.isLoading);
      setLoadingSource(event.detail.source || '');
    };

    // Add event listener for custom loading events
    window.addEventListener('globalDataLoading', handleGlobalLoading);

    // Cleanup
    return () => {
      window.removeEventListener('globalDataLoading', handleGlobalLoading);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20 text-center">
        <div className="mb-4">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
        </div>
        <p className="text-white font-semibold">
          {loadingSource === 'preloadData' ? 'Loading team data...' : 'Loading...'}
        </p>
        <p className="text-gray-300 text-sm mt-1">Please wait</p>
      </div>
    </div>
  );
};

export default GlobalLoadingIndicator; 