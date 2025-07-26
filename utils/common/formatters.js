/**
 * Data Formatting Utilities
 * 
 * Common functions for formatting data consistently across the application.
 */

/**
 * Format date to ISO string with timezone
 * @param {Date|string|number} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    return dateObj.toISOString();
  } catch (error) {
    console.warn('Date formatting error:', error.message);
    return null;
  }
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} - Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting error:', error.message);
    return `${amount.toFixed(2)} ${currency}`;
  }
};

/**
 * Format number with thousands separator
 * @param {number} number - Number to format
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} - Formatted number string
 */
const formatNumber = (number, locale = 'en-US') => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }
  
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (error) {
    console.warn('Number formatting error:', error.message);
    return number.toString();
  }
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted percentage string
 */
const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }
  
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted size string
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (typeof bytes !== 'number' || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} - Truncated text
 */
const truncateText = (text, maxLength, suffix = '...') => {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} - Capitalized text
 */
const capitalizeWords = (text) => {
  if (typeof text !== 'string') return '';
  
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Convert camelCase to kebab-case
 * @param {string} text - Text to convert
 * @returns {string} - Kebab-case text
 */
const camelToKebab = (text) => {
  if (typeof text !== 'string') return '';
  
  return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * Convert kebab-case to camelCase
 * @param {string} text - Text to convert
 * @returns {string} - CamelCase text
 */
const kebabToCamel = (text) => {
  if (typeof text !== 'string') return '';
  
  return text.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

module.exports = {
  formatDate,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  truncateText,
  capitalizeWords,
  camelToKebab,
  kebabToCamel
};