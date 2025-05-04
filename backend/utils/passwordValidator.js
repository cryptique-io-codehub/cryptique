/**
 * Password validation utilities for Cryptique
 */

// Password validation regex
// Requires at least:
// - 8 characters
// - One uppercase letter
// - One lowercase letter 
// - One number
// - One special character (@$!%*?&)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {Object} - Contains validation result and message
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  if (!PASSWORD_REGEX.test(password)) {
    return {
      isValid: false,
      message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    };
  }

  return {
    isValid: true,
    message: 'Password meets requirements'
  };
};

/**
 * Checks for common passwords or patterns
 * @param {string} password - The password to check
 * @param {Object} userData - User data to check for inclusion in password
 * @returns {Object} - Contains validation result and message
 */
const checkCommonPatterns = (password, userData = {}) => {
  // List of most common passwords
  const commonPasswords = [
    'password', 'admin', '123456', 'qwerty', 'welcome', 'letmein',
    'football', 'iloveyou', 'monkey', 'password1', 'abc123'
  ];

  // Check if password is in common list (case insensitive)
  const lowerPassword = password.toLowerCase();
  if (commonPasswords.some(common => lowerPassword === common)) {
    return {
      isValid: false,
      message: 'This password is too common and easily guessable'
    };
  }

  // Check if password contains user's personal information
  const userInfoPieces = [
    userData.name, 
    userData.email?.split('@')[0]
  ].filter(Boolean);

  for (const piece of userInfoPieces) {
    if (piece && piece.length > 3 && lowerPassword.includes(piece.toLowerCase())) {
      return {
        isValid: false,
        message: 'Password should not contain personal information'
      };
    }
  }

  return {
    isValid: true,
    message: 'Password passes common pattern checks'
  };
};

module.exports = {
  validatePassword,
  checkCommonPatterns,
  PASSWORD_REGEX
}; 