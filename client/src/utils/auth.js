/**
 * Get authentication token from localStorage
 * @returns {string|null} The auth token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Set authentication token in localStorage
 * @param {string} token - The auth token to store
 */
export const setToken = (token) => {
  localStorage.setItem('authToken', token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('authToken');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  return !!getToken();
}; 