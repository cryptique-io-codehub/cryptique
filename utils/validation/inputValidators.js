/**
 * Input Validation Utilities
 * 
 * Common input validation functions extracted from controllers and routes
 * to provide consistent validation across all services.
 */

const { BadRequestError } = require('../api/errorHandlers');

/**
 * Email validation regex
 * Validates standard email format
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation regex
 * Requires at least:
 * - 8 characters
 * - One uppercase letter
 * - One lowercase letter
 * - One number
 * - One special character (@$!%*?&)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * URL validation regex
 * Validates HTTP and HTTPS URLs
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * MongoDB ObjectId validation regex
 */
const OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Ethereum address validation regex
 */
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Transaction hash validation regex
 */
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateEmail = (email, options = {}) => {
  const { required = true, allowEmpty = false } = options;

  if (!email || email.trim() === '') {
    if (!required || allowEmpty) {
      return { isValid: true, value: email };
    }
    return {
      isValid: false,
      error: 'Email is required',
      code: 'EMAIL_REQUIRED'
    };
  }

  if (typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a string',
      code: 'EMAIL_INVALID_TYPE'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      code: 'EMAIL_INVALID_FORMAT'
    };
  }

  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      error: 'Email is too long (maximum 254 characters)',
      code: 'EMAIL_TOO_LONG'
    };
  }

  return {
    isValid: true,
    value: trimmedEmail
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validatePassword = (password, options = {}) => {
  const { 
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    userData = {}
  } = options;

  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
      code: 'PASSWORD_REQUIRED'
    };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`,
      code: 'PASSWORD_TOO_SHORT'
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password is too long (maximum 128 characters)',
      code: 'PASSWORD_TOO_LONG'
    };
  }

  // Check character requirements
  const checks = [];
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    checks.push('one uppercase letter');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    checks.push('one lowercase letter');
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    checks.push('one number');
  }
  
  if (requireSpecialChars && !/[@$!%*?&]/.test(password)) {
    checks.push('one special character (@$!%*?&)');
  }

  if (checks.length > 0) {
    return {
      isValid: false,
      error: `Password must include at least ${checks.join(', ')}`,
      code: 'PASSWORD_WEAK'
    };
  }

  // Check for common patterns
  const commonCheck = checkCommonPasswordPatterns(password, userData);
  if (!commonCheck.isValid) {
    return commonCheck;
  }

  return {
    isValid: true,
    value: password
  };
};

/**
 * Check for common password patterns
 * @param {string} password - Password to check
 * @param {Object} userData - User data to check against
 * @returns {Object} - Validation result
 */
const checkCommonPasswordPatterns = (password, userData = {}) => {
  const lowerPassword = password.toLowerCase();

  // Common passwords list (subset)
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];

  if (commonPasswords.some(common => lowerPassword === common)) {
    return {
      isValid: false,
      error: 'This password is too common and easily guessable',
      code: 'PASSWORD_COMMON'
    };
  }

  // Check for personal information
  const userInfoPieces = [
    userData.name,
    userData.email?.split('@')[0],
    userData.username
  ].filter(Boolean);

  for (const piece of userInfoPieces) {
    if (piece && piece.length > 3 && lowerPassword.includes(piece.toLowerCase())) {
      return {
        isValid: false,
        error: 'Password should not contain personal information',
        code: 'PASSWORD_PERSONAL_INFO'
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateUrl = (url, options = {}) => {
  const { required = true, allowEmpty = false, protocols = ['http', 'https'] } = options;

  if (!url || url.trim() === '') {
    if (!required || allowEmpty) {
      return { isValid: true, value: url };
    }
    return {
      isValid: false,
      error: 'URL is required',
      code: 'URL_REQUIRED'
    };
  }

  if (typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a string',
      code: 'URL_INVALID_TYPE'
    };
  }

  const trimmedUrl = url.trim();

  try {
    const urlObj = new URL(trimmedUrl);
    
    if (!protocols.includes(urlObj.protocol.slice(0, -1))) {
      return {
        isValid: false,
        error: `URL must use one of these protocols: ${protocols.join(', ')}`,
        code: 'URL_INVALID_PROTOCOL'
      };
    }

    return {
      isValid: true,
      value: trimmedUrl
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
      code: 'URL_INVALID_FORMAT'
    };
  }
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateObjectId = (id, options = {}) => {
  const { required = true, fieldName = 'ID' } = options;

  if (!id || id.toString().trim() === '') {
    if (!required) {
      return { isValid: true, value: id };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
      code: 'OBJECTID_REQUIRED'
    };
  }

  const idString = id.toString().trim();

  if (!OBJECTID_REGEX.test(idString)) {
    return {
      isValid: false,
      error: `Invalid ${fieldName} format`,
      code: 'OBJECTID_INVALID_FORMAT'
    };
  }

  return {
    isValid: true,
    value: idString
  };
};

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateEthAddress = (address, options = {}) => {
  const { required = true, allowEmpty = false } = options;

  if (!address || address.trim() === '') {
    if (!required || allowEmpty) {
      return { isValid: true, value: address };
    }
    return {
      isValid: false,
      error: 'Ethereum address is required',
      code: 'ETH_ADDRESS_REQUIRED'
    };
  }

  if (typeof address !== 'string') {
    return {
      isValid: false,
      error: 'Ethereum address must be a string',
      code: 'ETH_ADDRESS_INVALID_TYPE'
    };
  }

  const trimmedAddress = address.trim();

  if (!ETH_ADDRESS_REGEX.test(trimmedAddress)) {
    return {
      isValid: false,
      error: 'Invalid Ethereum address format',
      code: 'ETH_ADDRESS_INVALID_FORMAT'
    };
  }

  return {
    isValid: true,
    value: trimmedAddress
  };
};

/**
 * Validate transaction hash
 * @param {string} hash - Transaction hash to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateTxHash = (hash, options = {}) => {
  const { required = true, allowEmpty = false } = options;

  if (!hash || hash.trim() === '') {
    if (!required || allowEmpty) {
      return { isValid: true, value: hash };
    }
    return {
      isValid: false,
      error: 'Transaction hash is required',
      code: 'TX_HASH_REQUIRED'
    };
  }

  if (typeof hash !== 'string') {
    return {
      isValid: false,
      error: 'Transaction hash must be a string',
      code: 'TX_HASH_INVALID_TYPE'
    };
  }

  const trimmedHash = hash.trim();

  if (!TX_HASH_REGEX.test(trimmedHash)) {
    return {
      isValid: false,
      error: 'Invalid transaction hash format',
      code: 'TX_HASH_INVALID_FORMAT'
    };
  }

  return {
    isValid: true,
    value: trimmedHash
  };
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateStringLength = (value, options = {}) => {
  const { 
    minLength = 0, 
    maxLength = Infinity, 
    required = true, 
    fieldName = 'Field',
    trim = true
  } = options;

  if (!value || value === '') {
    if (!required) {
      return { isValid: true, value };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
      code: 'STRING_REQUIRED'
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
      code: 'STRING_INVALID_TYPE'
    };
  }

  const processedValue = trim ? value.trim() : value;

  if (processedValue.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
      code: 'STRING_TOO_SHORT'
    };
  }

  if (processedValue.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${maxLength} characters long`,
      code: 'STRING_TOO_LONG'
    };
  }

  return {
    isValid: true,
    value: processedValue
  };
};

/**
 * Validate numeric value
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateNumber = (value, options = {}) => {
  const { 
    min = -Infinity, 
    max = Infinity, 
    integer = false, 
    required = true, 
    fieldName = 'Number'
  } = options;

  if (value === null || value === undefined || value === '') {
    if (!required) {
      return { isValid: true, value };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
      code: 'NUMBER_REQUIRED'
    };
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
      code: 'NUMBER_INVALID'
    };
  }

  if (integer && !Number.isInteger(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be an integer`,
      code: 'NUMBER_NOT_INTEGER'
    };
  }

  if (numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
      code: 'NUMBER_TOO_SMALL'
    };
  }

  if (numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${max}`,
      code: 'NUMBER_TOO_LARGE'
    };
  }

  return {
    isValid: true,
    value: numValue
  };
};

/**
 * Validate array
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateArray = (value, options = {}) => {
  const { 
    minLength = 0, 
    maxLength = Infinity, 
    required = true, 
    fieldName = 'Array',
    itemValidator = null
  } = options;

  if (!value || (Array.isArray(value) && value.length === 0)) {
    if (!required) {
      return { isValid: true, value: value || [] };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
      code: 'ARRAY_REQUIRED'
    };
  }

  if (!Array.isArray(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be an array`,
      code: 'ARRAY_INVALID_TYPE'
    };
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least ${minLength} items`,
      code: 'ARRAY_TOO_SHORT'
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must contain at most ${maxLength} items`,
      code: 'ARRAY_TOO_LONG'
    };
  }

  // Validate individual items if validator is provided
  if (itemValidator && typeof itemValidator === 'function') {
    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i], i);
      if (!itemResult.isValid) {
        return {
          isValid: false,
          error: `${fieldName} item at index ${i}: ${itemResult.error}`,
          code: 'ARRAY_ITEM_INVALID'
        };
      }
    }
  }

  return {
    isValid: true,
    value
  };
};

/**
 * Validate date
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateDate = (value, options = {}) => {
  const { 
    required = true, 
    fieldName = 'Date',
    minDate = null,
    maxDate = null,
    futureOnly = false,
    pastOnly = false
  } = options;

  if (!value) {
    if (!required) {
      return { isValid: true, value };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
      code: 'DATE_REQUIRED'
    };
  }

  let dateValue;
  
  if (value instanceof Date) {
    dateValue = value;
  } else {
    dateValue = new Date(value);
  }

  if (isNaN(dateValue.getTime())) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid date`,
      code: 'DATE_INVALID'
    };
  }

  const now = new Date();

  if (futureOnly && dateValue <= now) {
    return {
      isValid: false,
      error: `${fieldName} must be in the future`,
      code: 'DATE_NOT_FUTURE'
    };
  }

  if (pastOnly && dateValue >= now) {
    return {
      isValid: false,
      error: `${fieldName} must be in the past`,
      code: 'DATE_NOT_PAST'
    };
  }

  if (minDate && dateValue < new Date(minDate)) {
    return {
      isValid: false,
      error: `${fieldName} must be after ${new Date(minDate).toISOString()}`,
      code: 'DATE_TOO_EARLY'
    };
  }

  if (maxDate && dateValue > new Date(maxDate)) {
    return {
      isValid: false,
      error: `${fieldName} must be before ${new Date(maxDate).toISOString()}`,
      code: 'DATE_TOO_LATE'
    };
  }

  return {
    isValid: true,
    value: dateValue
  };
};

module.exports = {
  // Validation functions
  validateEmail,
  validatePassword,
  validateUrl,
  validateObjectId,
  validateEthAddress,
  validateTxHash,
  validateStringLength,
  validateNumber,
  validateArray,
  validateDate,
  
  // Helper functions
  checkCommonPasswordPatterns,
  
  // Regex patterns (for external use)
  EMAIL_REGEX,
  PASSWORD_REGEX,
  URL_REGEX,
  OBJECTID_REGEX,
  ETH_ADDRESS_REGEX,
  TX_HASH_REGEX
};