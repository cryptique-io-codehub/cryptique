/**
 * Database Query Helper Utilities
 * Common database query patterns and operations
 */

const mongoose = require('mongoose');

/**
 * Generic find with pagination and sorting
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} query - Query conditions
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Paginated results
 */
const findWithPagination = async (Model, query = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate = null,
      select = null
    } = options;

    const skip = (page - 1) * limit;
    
    // Build the query
    let queryBuilder = Model.find(query);
    
    if (select) {
      queryBuilder = queryBuilder.select(select);
    }
    
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => {
          queryBuilder = queryBuilder.populate(pop);
        });
      } else {
        queryBuilder = queryBuilder.populate(populate);
      }
    }
    
    // Execute query with pagination
    const [results, total] = await Promise.all([
      queryBuilder
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Model.countDocuments(query)
    ]);
    
    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw new Error(`Pagination query failed: ${error.message}`);
  }
};

/**
 * Find one document with error handling
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} query - Query conditions
 * @param {Object} options - Query options
 * @returns {Promise<Object|null>} Document or null
 */
const findOneWithErrorHandling = async (Model, query, options = {}) => {
  try {
    const { populate = null, select = null } = options;
    
    let queryBuilder = Model.findOne(query);
    
    if (select) {
      queryBuilder = queryBuilder.select(select);
    }
    
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => {
          queryBuilder = queryBuilder.populate(pop);
        });
      } else {
        queryBuilder = queryBuilder.populate(populate);
      }
    }
    
    return await queryBuilder.lean();
  } catch (error) {
    throw new Error(`FindOne query failed: ${error.message}`);
  }
};

/**
 * Find by ID with validation
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Document
 */
const findByIdWithValidation = async (Model, id, options = {}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    const document = await findOneWithErrorHandling(Model, { _id: id }, options);
    
    if (!document) {
      throw new Error(`${Model.modelName} not found with ID: ${id}`);
    }
    
    return document;
  } catch (error) {
    throw new Error(`FindById failed: ${error.message}`);
  }
};

/**
 * Create document with validation
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} data - Document data
 * @returns {Promise<Object>} Created document
 */
const createWithValidation = async (Model, data) => {
  try {
    const document = new Model(data);
    const savedDocument = await document.save();
    return savedDocument.toObject();
  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new Error(`Duplicate value for field: ${field}`);
    }
    throw new Error(`Create operation failed: ${error.message}`);
  }
};

/**
 * Update document with validation
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} updateData - Update data
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated document
 */
const updateByIdWithValidation = async (Model, id, updateData, options = {}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    const defaultOptions = {
      new: true,
      runValidators: true,
      ...options
    };
    
    const updatedDocument = await Model.findByIdAndUpdate(id, updateData, defaultOptions);
    
    if (!updatedDocument) {
      throw new Error(`${Model.modelName} not found with ID: ${id}`);
    }
    
    return updatedDocument.toObject();
  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new Error(`Duplicate value for field: ${field}`);
    }
    throw new Error(`Update operation failed: ${error.message}`);
  }
};

/**
 * Delete document with validation
 * @param {mongoose.Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @returns {Promise<Object>} Deleted document
 */
const deleteByIdWithValidation = async (Model, id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid ObjectId format');
    }
    
    const deletedDocument = await Model.findByIdAndDelete(id);
    
    if (!deletedDocument) {
      throw new Error(`${Model.modelName} not found with ID: ${id}`);
    }
    
    return deletedDocument.toObject();
  } catch (error) {
    throw new Error(`Delete operation failed: ${error.message}`);
  }
};

/**
 * Bulk operations with error handling
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Array} operations - Bulk operations array
 * @param {Object} options - Bulk options
 * @returns {Promise<Object>} Bulk operation result
 */
const bulkWriteWithErrorHandling = async (Model, operations, options = {}) => {
  try {
    const defaultOptions = {
      ordered: false,
      ...options
    };
    
    const result = await Model.bulkWrite(operations, defaultOptions);
    
    return {
      success: true,
      insertedCount: result.insertedCount || 0,
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      deletedCount: result.deletedCount || 0,
      upsertedCount: result.upsertedCount || 0,
      errors: result.writeErrors || []
    };
  } catch (error) {
    throw new Error(`Bulk operation failed: ${error.message}`);
  }
};

/**
 * Aggregation with error handling
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} options - Aggregation options
 * @returns {Promise<Array>} Aggregation results
 */
const aggregateWithErrorHandling = async (Model, pipeline, options = {}) => {
  try {
    const result = await Model.aggregate(pipeline, options);
    return result;
  } catch (error) {
    throw new Error(`Aggregation failed: ${error.message}`);
  }
};

/**
 * Count documents with query
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} query - Query conditions
 * @returns {Promise<number>} Document count
 */
const countDocuments = async (Model, query = {}) => {
  try {
    return await Model.countDocuments(query);
  } catch (error) {
    throw new Error(`Count operation failed: ${error.message}`);
  }
};

/**
 * Check if document exists
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Object} query - Query conditions
 * @returns {Promise<boolean>} Existence status
 */
const documentExists = async (Model, query) => {
  try {
    const count = await Model.countDocuments(query).limit(1);
    return count > 0;
  } catch (error) {
    throw new Error(`Existence check failed: ${error.message}`);
  }
};

module.exports = {
  findWithPagination,
  findOneWithErrorHandling,
  findByIdWithValidation,
  createWithValidation,
  updateByIdWithValidation,
  deleteByIdWithValidation,
  bulkWriteWithErrorHandling,
  aggregateWithErrorHandling,
  countDocuments,
  documentExists
};