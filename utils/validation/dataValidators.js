/**
 * Data Validation Utilities
 * 
 * Common data format validation functions for consistent data validation
 * across all services, including blockchain-specific validations.
 */

const { validateObjectId, validateEthAddress, validateTxHash } = require('./inputValidators');

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with normalized values
 */
const validatePaginationParams = (params, options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
    minLimit = 1
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: {}
  };

  // Validate page
  let page = parseInt(params.page) || defaultPage;
  if (page < 1) {
    page = 1;
    result.errors.push('Page must be at least 1, defaulting to 1');
  }
  result.values.page = page;

  // Validate limit
  let limit = parseInt(params.limit) || defaultLimit;
  if (limit < minLimit) {
    limit = minLimit;
    result.errors.push(`Limit must be at least ${minLimit}, defaulting to ${minLimit}`);
  }
  if (limit > maxLimit) {
    limit = maxLimit;
    result.errors.push(`Limit cannot exceed ${maxLimit}, capping at ${maxLimit}`);
  }
  result.values.limit = limit;

  // Calculate skip/offset
  result.values.skip = (page - 1) * limit;
  result.values.offset = result.values.skip;

  return result;
};

/**
 * Validate sorting parameters
 * @param {Object} params - Sorting parameters
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with normalized values
 */
const validateSortParams = (params, options = {}) => {
  const {
    allowedFields = [],
    defaultSort = 'createdAt',
    defaultOrder = 'desc'
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: {}
  };

  // Validate sort field
  let sortBy = params.sortBy || defaultSort;
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    result.isValid = false;
    result.errors.push(`Invalid sort field '${sortBy}'. Allowed fields: ${allowedFields.join(', ')}`);
    return result;
  }
  result.values.sortBy = sortBy;

  // Validate sort order
  let sortOrder = params.sortOrder || defaultOrder;
  const validOrders = ['asc', 'desc', '1', '-1'];
  if (!validOrders.includes(sortOrder)) {
    result.isValid = false;
    result.errors.push(`Invalid sort order '${sortOrder}'. Must be one of: ${validOrders.join(', ')}`);
    return result;
  }
  result.values.sortOrder = sortOrder;

  // Create MongoDB sort object
  const mongoSort = {};
  mongoSort[sortBy] = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
  result.values.mongoSort = mongoSort;

  return result;
};

/**
 * Validate date range parameters
 * @param {Object} params - Date range parameters
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with normalized values
 */
const validateDateRangeParams = (params, options = {}) => {
  const {
    startDateField = 'startDate',
    endDateField = 'endDate',
    maxRangeDays = 365,
    allowFuture = false
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: {}
  };

  const now = new Date();
  let startDate = null;
  let endDate = null;

  // Validate start date
  if (params[startDateField]) {
    startDate = new Date(params[startDateField]);
    if (isNaN(startDate.getTime())) {
      result.isValid = false;
      result.errors.push(`Invalid ${startDateField} format`);
      return result;
    }

    if (!allowFuture && startDate > now) {
      result.isValid = false;
      result.errors.push(`${startDateField} cannot be in the future`);
      return result;
    }

    result.values[startDateField] = startDate;
  }

  // Validate end date
  if (params[endDateField]) {
    endDate = new Date(params[endDateField]);
    if (isNaN(endDate.getTime())) {
      result.isValid = false;
      result.errors.push(`Invalid ${endDateField} format`);
      return result;
    }

    if (!allowFuture && endDate > now) {
      result.isValid = false;
      result.errors.push(`${endDateField} cannot be in the future`);
      return result;
    }

    result.values[endDateField] = endDate;
  }

  // Validate date range
  if (startDate && endDate) {
    if (startDate >= endDate) {
      result.isValid = false;
      result.errors.push(`${startDateField} must be before ${endDateField}`);
      return result;
    }

    const rangeDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxRangeDays) {
      result.isValid = false;
      result.errors.push(`Date range cannot exceed ${maxRangeDays} days`);
      return result;
    }
  }

  return result;
};

/**
 * Validate transaction data
 * @param {Object} transaction - Transaction object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateTransactionData = (transaction, options = {}) => {
  const {
    requiredFields = ['tx_hash', 'from_address', 'contract_address'],
    validateAddresses = true,
    validateHash = true
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: { ...transaction }
  };

  // Check required fields
  for (const field of requiredFields) {
    if (!transaction[field] || transaction[field].toString().trim() === '') {
      result.isValid = false;
      result.errors.push(`${field} is required`);
    }
  }

  if (!result.isValid) {
    return result;
  }

  // Validate transaction hash
  if (validateHash && transaction.tx_hash) {
    const hashValidation = validateTxHash(transaction.tx_hash);
    if (!hashValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Invalid transaction hash: ${hashValidation.error}`);
    } else {
      result.values.tx_hash = hashValidation.value;
    }
  }

  // Validate addresses
  if (validateAddresses) {
    const addressFields = ['from_address', 'to_address', 'contract_address'];
    
    for (const field of addressFields) {
      if (transaction[field]) {
        const addressValidation = validateEthAddress(transaction[field], { required: false });
        if (!addressValidation.isValid) {
          result.isValid = false;
          result.errors.push(`Invalid ${field}: ${addressValidation.error}`);
        } else if (addressValidation.value) {
          result.values[field] = addressValidation.value;
        }
      }
    }
  }

  // Validate value fields
  const valueFields = ['value_eth', 'value_usd', 'gas_price', 'gas_used'];
  for (const field of valueFields) {
    if (transaction[field] !== undefined && transaction[field] !== null) {
      const numValue = parseFloat(transaction[field]);
      if (isNaN(numValue) || numValue < 0) {
        result.isValid = false;
        result.errors.push(`${field} must be a non-negative number`);
      } else {
        result.values[field] = numValue;
      }
    }
  }

  // Validate block_time
  if (transaction.block_time) {
    const blockTime = new Date(transaction.block_time);
    if (isNaN(blockTime.getTime())) {
      result.isValid = false;
      result.errors.push('Invalid block_time format');
    } else {
      result.values.block_time = blockTime;
    }
  }

  // Validate chain
  if (transaction.chain) {
    const validChains = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'];
    if (!validChains.includes(transaction.chain.toLowerCase())) {
      result.errors.push(`Unsupported chain '${transaction.chain}'. Supported chains: ${validChains.join(', ')}`);
    } else {
      result.values.chain = transaction.chain.toLowerCase();
    }
  }

  return result;
};

/**
 * Validate analytics event data
 * @param {Object} event - Analytics event object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateAnalyticsEvent = (event, options = {}) => {
  const {
    requiredFields = ['siteId', 'event'],
    maxEventNameLength = 100,
    maxPropertyValueLength = 1000
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: { ...event }
  };

  // Check required fields
  for (const field of requiredFields) {
    if (!event[field] || event[field].toString().trim() === '') {
      result.isValid = false;
      result.errors.push(`${field} is required`);
    }
  }

  if (!result.isValid) {
    return result;
  }

  // Validate siteId
  if (event.siteId) {
    const siteIdValidation = validateObjectId(event.siteId, { fieldName: 'siteId' });
    if (!siteIdValidation.isValid) {
      result.isValid = false;
      result.errors.push(siteIdValidation.error);
    } else {
      result.values.siteId = siteIdValidation.value;
    }
  }

  // Validate event name
  if (event.event) {
    if (typeof event.event !== 'string') {
      result.isValid = false;
      result.errors.push('Event name must be a string');
    } else if (event.event.length > maxEventNameLength) {
      result.isValid = false;
      result.errors.push(`Event name cannot exceed ${maxEventNameLength} characters`);
    } else {
      result.values.event = event.event.trim();
    }
  }

  // Validate timestamp
  if (event.timestamp) {
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      result.isValid = false;
      result.errors.push('Invalid timestamp format');
    } else {
      result.values.timestamp = timestamp;
    }
  } else {
    result.values.timestamp = new Date();
  }

  // Validate properties
  if (event.properties) {
    if (typeof event.properties !== 'object' || Array.isArray(event.properties)) {
      result.isValid = false;
      result.errors.push('Properties must be an object');
    } else {
      const validatedProperties = {};
      
      for (const [key, value] of Object.entries(event.properties)) {
        if (typeof key !== 'string' || key.trim() === '') {
          result.errors.push('Property keys must be non-empty strings');
          continue;
        }

        if (value !== null && value !== undefined) {
          const stringValue = value.toString();
          if (stringValue.length > maxPropertyValueLength) {
            result.errors.push(`Property '${key}' value exceeds ${maxPropertyValueLength} characters`);
            continue;
          }
          validatedProperties[key.trim()] = value;
        }
      }
      
      result.values.properties = validatedProperties;
    }
  }

  // Validate user session data
  if (event.userId && typeof event.userId === 'string') {
    result.values.userId = event.userId.trim();
  }

  if (event.sessionId && typeof event.sessionId === 'string') {
    result.values.sessionId = event.sessionId.trim();
  }

  // Validate page data
  if (event.page) {
    if (typeof event.page !== 'object') {
      result.errors.push('Page data must be an object');
    } else {
      const validatedPage = {};
      
      if (event.page.url && typeof event.page.url === 'string') {
        validatedPage.url = event.page.url.trim();
      }
      
      if (event.page.title && typeof event.page.title === 'string') {
        validatedPage.title = event.page.title.trim();
      }
      
      if (event.page.referrer && typeof event.page.referrer === 'string') {
        validatedPage.referrer = event.page.referrer.trim();
      }
      
      result.values.page = validatedPage;
    }
  }

  return result;
};

/**
 * Validate smart contract data
 * @param {Object} contract - Smart contract object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateSmartContractData = (contract, options = {}) => {
  const {
    requiredFields = ['address', 'chain', 'teamId'],
    validateAddress = true
  } = options;

  const result = {
    isValid: true,
    errors: [],
    values: { ...contract }
  };

  // Check required fields
  for (const field of requiredFields) {
    if (!contract[field] || contract[field].toString().trim() === '') {
      result.isValid = false;
      result.errors.push(`${field} is required`);
    }
  }

  if (!result.isValid) {
    return result;
  }

  // Validate contract address
  if (validateAddress && contract.address) {
    const addressValidation = validateEthAddress(contract.address);
    if (!addressValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Invalid contract address: ${addressValidation.error}`);
    } else {
      result.values.address = addressValidation.value;
    }
  }

  // Validate team ID
  if (contract.teamId) {
    const teamIdValidation = validateObjectId(contract.teamId, { fieldName: 'teamId' });
    if (!teamIdValidation.isValid) {
      result.isValid = false;
      result.errors.push(teamIdValidation.error);
    } else {
      result.values.teamId = teamIdValidation.value;
    }
  }

  // Validate chain
  if (contract.chain) {
    const validChains = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'];
    const normalizedChain = contract.chain.toLowerCase();
    if (!validChains.includes(normalizedChain)) {
      result.isValid = false;
      result.errors.push(`Unsupported chain '${contract.chain}'. Supported chains: ${validChains.join(', ')}`);
    } else {
      result.values.chain = normalizedChain;
    }
  }

  // Validate optional fields
  if (contract.name && typeof contract.name === 'string') {
    result.values.name = contract.name.trim();
  }

  if (contract.symbol && typeof contract.symbol === 'string') {
    result.values.symbol = contract.symbol.trim().toUpperCase();
  }

  if (contract.decimals !== undefined) {
    const decimals = parseInt(contract.decimals);
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      result.isValid = false;
      result.errors.push('Decimals must be a number between 0 and 18');
    } else {
      result.values.decimals = decimals;
    }
  }

  return result;
};

/**
 * Validate bulk operation data
 * @param {Array} items - Array of items to validate
 * @param {Function} itemValidator - Validator function for individual items
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateBulkData = (items, itemValidator, options = {}) => {
  const {
    maxItems = 1000,
    stopOnFirstError = false
  } = options;

  const result = {
    isValid: true,
    errors: [],
    validItems: [],
    invalidItems: []
  };

  if (!Array.isArray(items)) {
    result.isValid = false;
    result.errors.push('Items must be an array');
    return result;
  }

  if (items.length === 0) {
    result.isValid = false;
    result.errors.push('At least one item is required');
    return result;
  }

  if (items.length > maxItems) {
    result.isValid = false;
    result.errors.push(`Cannot process more than ${maxItems} items at once`);
    return result;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemResult = itemValidator(item, { index: i });

    if (itemResult.isValid) {
      result.validItems.push({
        index: i,
        data: itemResult.values || item
      });
    } else {
      result.invalidItems.push({
        index: i,
        data: item,
        errors: itemResult.errors || [itemResult.error]
      });

      result.errors.push(`Item ${i}: ${itemResult.errors ? itemResult.errors.join(', ') : itemResult.error}`);

      if (stopOnFirstError) {
        result.isValid = false;
        return result;
      }
    }
  }

  // Consider the bulk operation valid if at least some items are valid
  result.isValid = result.validItems.length > 0;

  return result;
};

module.exports = {
  validatePaginationParams,
  validateSortParams,
  validateDateRangeParams,
  validateTransactionData,
  validateAnalyticsEvent,
  validateSmartContractData,
  validateBulkData
};