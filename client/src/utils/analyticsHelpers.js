/**
 * Utility functions for analytics calculations
 */

/**
 * Determines if a session belongs to a Web3 user
 * @param {Object} session - Session data object
 * @returns {boolean} - True if the session is from a Web3 user
 */
export const isWeb3User = (session) => {
  if (!session) return false;
  
  // Direct hasWeb3 or walletConnected flags
  if (session.hasWeb3 === true || session.walletConnected === true) {
    return true;
  }
  
  // Check wallet information
  if (session.wallet) {
    // Has wallet type that's not "No Wallet Detected"
    if (session.wallet.walletType && session.wallet.walletType !== 'No Wallet Detected') {
      return true;
    }
    
    // Has chain name that's not "No Wallet Detected"
    if (session.wallet.chainName && session.wallet.chainName !== 'No Wallet Detected') {
      return true;
    }
    
    // Has a non-empty wallet address
    if (session.wallet.walletAddress && 
        session.wallet.walletAddress.trim() !== '' && 
        session.wallet.walletAddress !== 'No Wallet Detected') {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculates the average session duration from an array of sessions
 * @param {Array} sessions - Array of session objects
 * @returns {number} - Average duration in seconds
 */
export const calculateAverageDuration = (sessions) => {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  
  // Filter out any sessions with invalid or missing duration
  const validSessions = sessions.filter(session => 
    typeof session?.duration === 'number' && 
    !isNaN(session.duration) && 
    session.duration >= 0
  );
  
  if (validSessions.length === 0) return 0;
  
  const totalDuration = validSessions.reduce((sum, session) => sum + session.duration, 0);
  return totalDuration / validSessions.length;
};

/**
 * Formats duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds.toFixed(0)} sec`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(1)} min`;
  } else if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)} hr`;
  } else if (seconds < 31536000) {
    return `${(seconds / 86400).toFixed(1)} days`;
  } else {
    return `${(seconds / 31536000).toFixed(1)} years`;
  }
};

/**
 * Calculates Web3 user statistics from sessions
 * @param {Array} sessions - Array of session objects
 * @returns {Object} - Object containing Web3 user counts and percentages
 */
export const calculateWeb3Stats = (sessions, uniqueVisitors) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      web3Users: 0,
      web3Percentage: "0.00",
      walletsConnected: 0,
      walletsPercentage: "0.00"
    };
  }
  
  // Count unique Web3 users
  const web3UserIds = new Set();
  const walletUserIds = new Set();
  
  sessions.forEach(session => {
    if (!session.userId) return;
    
    // Add to Web3 users if criteria met
    if (isWeb3User(session)) {
      web3UserIds.add(session.userId);
    }
    
    // Add to wallets connected if has wallet address
    if (session.wallet && 
        session.wallet.walletAddress && 
        session.wallet.walletAddress.trim() !== '' && 
        session.wallet.walletAddress !== 'No Wallet Detected') {
      walletUserIds.add(session.userId);
    }
  });
  
  const web3Users = web3UserIds.size;
  const walletsConnected = walletUserIds.size;
  
  // Calculate percentages
  const web3Percentage = uniqueVisitors > 0 
    ? ((web3Users / uniqueVisitors) * 100).toFixed(2)
    : "0.00";
    
  const walletsPercentage = uniqueVisitors > 0
    ? ((walletsConnected / uniqueVisitors) * 100).toFixed(2)
    : "0.00";
  
  return {
    web3Users,
    web3Percentage,
    walletsConnected,
    walletsPercentage
  };
}; 