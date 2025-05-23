/**
 * Database operations utility with retry logic for individual operations
 */

/**
 * Execute a database operation with retry logic
 * @param {Function} operation - The database operation to perform
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the database operation
 */
const executeWithRetry = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    operation_name = 'Database operation'
  } = options;

  let lastError;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      retryCount++;

      // If we've reached max retries, throw the error
      if (retryCount > maxRetries) {
        console.error(`${operation_name} failed after ${maxRetries} retries. Error:`, error);
        throw error;
      }

      // Calculate delay with exponential backoff if enabled
      const delay = exponentialBackoff
        ? Math.min(retryDelay * Math.pow(2, retryCount - 1), 30000) // Max 30 seconds
        : retryDelay;

      console.warn(`${operation_name} attempt ${retryCount} failed. Retrying in ${delay}ms. Error:`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Find documents with retry logic
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query criteria
 * @param {Object} options - Find options
 * @returns {Promise<Array>} - Found documents
 */
const findWithRetry = async (model, query = {}, options = {}) => {
  return executeWithRetry(
    () => model.find(query, options.projection, options.mongooseOptions),
    { operation_name: `Find ${model.modelName}` }
  );
};

/**
 * Find one document with retry logic
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query criteria
 * @param {Object} options - Find options
 * @returns {Promise<Object>} - Found document
 */
const findOneWithRetry = async (model, query = {}, options = {}) => {
  return executeWithRetry(
    () => model.findOne(query, options.projection, options.mongooseOptions),
    { operation_name: `FindOne ${model.modelName}` }
  );
};

/**
 * Update one document with retry logic
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query criteria
 * @param {Object} update - Update data
 * @param {Object} options - Update options
 * @returns {Promise<Object>} - Update result
 */
const updateOneWithRetry = async (model, query = {}, update = {}, options = {}) => {
  return executeWithRetry(
    () => model.updateOne(query, update, options.mongooseOptions),
    { operation_name: `UpdateOne ${model.modelName}` }
  );
};

/**
 * Save document with retry logic
 * @param {Document} document - Mongoose document to save
 * @returns {Promise<Document>} - Saved document
 */
const saveWithRetry = async (document) => {
  return executeWithRetry(
    () => document.save(),
    { operation_name: `Save ${document.constructor.modelName}` }
  );
};

/**
 * Delete one document with retry logic
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query criteria
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} - Delete result
 */
const deleteOneWithRetry = async (model, query = {}, options = {}) => {
  return executeWithRetry(
    () => model.deleteOne(query, options.mongooseOptions),
    { operation_name: `DeleteOne ${model.modelName}` }
  );
};

/**
 * Aggregate with retry logic
 * @param {Model} model - Mongoose model
 * @param {Array} pipeline - Aggregate pipeline
 * @param {Object} options - Aggregate options
 * @returns {Promise<Array>} - Aggregate results
 */
const aggregateWithRetry = async (model, pipeline = [], options = {}) => {
  return executeWithRetry(
    () => model.aggregate(pipeline).option(options.mongooseOptions || {}),
    { operation_name: `Aggregate ${model.modelName}` }
  );
};

module.exports = {
  executeWithRetry,
  findWithRetry,
  findOneWithRetry,
  updateOneWithRetry,
  saveWithRetry,
  deleteOneWithRetry,
  aggregateWithRetry
}; 