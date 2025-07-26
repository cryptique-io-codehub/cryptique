/**
 * Database Transaction Helper Utilities
 * MongoDB transaction management and atomic operations
 */

const mongoose = require('mongoose');
const { handleTransactionError } = require('./errorHandlers');

/**
 * Execute operations within a MongoDB transaction
 * @param {Function} operations - Async function containing operations
 * @param {Object} options - Transaction options
 * @returns {Promise<*>} Transaction result
 */
const withTransaction = async (operations, options = {}) => {
  const session = await mongoose.startSession();
  
  const transactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' },
    ...options
  };
  
  try {
    const result = await session.withTransaction(async () => {
      return await operations(session);
    }, transactionOptions);
    
    return result;
  } catch (error) {
    throw handleTransactionError(error, 'transaction execution');
  } finally {
    await session.endSession();
  }
};

/**
 * Execute multiple operations atomically
 * @param {Array} operations - Array of operation objects
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} Results array
 */
const executeAtomicOperations = async (operations, options = {}) => {
  return await withTransaction(async (session) => {
    const results = [];
    
    for (const operation of operations) {
      const { type, model, data, query, updateData } = operation;
      
      let result;
      switch (type) {
        case 'create':
          result = await model.create([data], { session });
          results.push(result[0]);
          break;
          
        case 'update':
          result = await model.findOneAndUpdate(query, updateData, { 
            session, 
            new: true,
            runValidators: true 
          });
          results.push(result);
          break;
          
        case 'delete':
          result = await model.findOneAndDelete(query, { session });
          results.push(result);
          break;
          
        case 'find':
          result = await model.find(query).session(session);
          results.push(result);
          break;
          
        default:
          throw new Error(`Unsupported operation type: ${type}`);
      }
    }
    
    return results;
  }, options);
};

/**
 * Create document with related documents atomically
 * @param {Object} mainDoc - Main document data
 * @param {mongoose.Model} MainModel - Main document model
 * @param {Array} relatedDocs - Related documents array
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} Created documents
 */
const createWithRelated = async (mainDoc, MainModel, relatedDocs = [], options = {}) => {
  return await withTransaction(async (session) => {
    // Create main document
    const [createdMain] = await MainModel.create([mainDoc], { session });
    
    // Create related documents
    const createdRelated = [];
    for (const relatedDoc of relatedDocs) {
      const { model: RelatedModel, data } = relatedDoc;
      
      // Add reference to main document if needed
      if (data.mainDocRef) {
        data[data.mainDocRef] = createdMain._id;
      }
      
      const [created] = await RelatedModel.create([data], { session });
      createdRelated.push(created);
    }
    
    return {
      main: createdMain,
      related: createdRelated
    };
  }, options);
};

/**
 * Update document and related documents atomically
 * @param {string} mainDocId - Main document ID
 * @param {mongoose.Model} MainModel - Main document model
 * @param {Object} mainUpdateData - Main document update data
 * @param {Array} relatedUpdates - Related document updates
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} Updated documents
 */
const updateWithRelated = async (mainDocId, MainModel, mainUpdateData, relatedUpdates = [], options = {}) => {
  return await withTransaction(async (session) => {
    // Update main document
    const updatedMain = await MainModel.findByIdAndUpdate(
      mainDocId, 
      mainUpdateData, 
      { session, new: true, runValidators: true }
    );
    
    if (!updatedMain) {
      throw new Error(`${MainModel.modelName} not found with ID: ${mainDocId}`);
    }
    
    // Update related documents
    const updatedRelated = [];
    for (const update of relatedUpdates) {
      const { model: RelatedModel, query, data } = update;
      
      const updated = await RelatedModel.findOneAndUpdate(
        query, 
        data, 
        { session, new: true, runValidators: true }
      );
      
      updatedRelated.push(updated);
    }
    
    return {
      main: updatedMain,
      related: updatedRelated
    };
  }, options);
};

/**
 * Delete document and related documents atomically
 * @param {string} mainDocId - Main document ID
 * @param {mongoose.Model} MainModel - Main document model
 * @param {Array} relatedDeletes - Related document delete queries
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} Deleted documents
 */
const deleteWithRelated = async (mainDocId, MainModel, relatedDeletes = [], options = {}) => {
  return await withTransaction(async (session) => {
    // Delete main document
    const deletedMain = await MainModel.findByIdAndDelete(mainDocId, { session });
    
    if (!deletedMain) {
      throw new Error(`${MainModel.modelName} not found with ID: ${mainDocId}`);
    }
    
    // Delete related documents
    const deletedRelated = [];
    for (const deleteOp of relatedDeletes) {
      const { model: RelatedModel, query } = deleteOp;
      
      const deleted = await RelatedModel.deleteMany(query, { session });
      deletedRelated.push({
        model: RelatedModel.modelName,
        deletedCount: deleted.deletedCount
      });
    }
    
    return {
      main: deletedMain,
      related: deletedRelated
    };
  }, options);
};

/**
 * Transfer ownership atomically
 * @param {string} resourceId - Resource ID
 * @param {mongoose.Model} ResourceModel - Resource model
 * @param {string} fromUserId - Current owner ID
 * @param {string} toUserId - New owner ID
 * @param {Array} additionalUpdates - Additional updates to perform
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} Transfer result
 */
const transferOwnership = async (resourceId, ResourceModel, fromUserId, toUserId, additionalUpdates = [], options = {}) => {
  return await withTransaction(async (session) => {
    // Verify current ownership
    const resource = await ResourceModel.findOne({ 
      _id: resourceId, 
      owner: fromUserId 
    }).session(session);
    
    if (!resource) {
      throw new Error('Resource not found or user is not the owner');
    }
    
    // Update ownership
    const updatedResource = await ResourceModel.findByIdAndUpdate(
      resourceId,
      { 
        owner: toUserId,
        updatedAt: new Date()
      },
      { session, new: true }
    );
    
    // Perform additional updates
    const additionalResults = [];
    for (const update of additionalUpdates) {
      const { model: Model, query, data } = update;
      
      const result = await Model.updateMany(
        query,
        data,
        { session }
      );
      
      additionalResults.push({
        model: Model.modelName,
        modifiedCount: result.modifiedCount
      });
    }
    
    return {
      resource: updatedResource,
      additionalUpdates: additionalResults,
      transferredAt: new Date()
    };
  }, options);
};

/**
 * Batch upsert operations with transaction
 * @param {mongoose.Model} Model - Mongoose model
 * @param {Array} documents - Documents to upsert
 * @param {string} uniqueField - Field to use for matching
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} Upsert results
 */
const batchUpsert = async (Model, documents, uniqueField = '_id', options = {}) => {
  return await withTransaction(async (session) => {
    const bulkOps = documents.map(doc => ({
      updateOne: {
        filter: { [uniqueField]: doc[uniqueField] },
        update: { $set: doc },
        upsert: true
      }
    }));
    
    const result = await Model.bulkWrite(bulkOps, { 
      session,
      ordered: false 
    });
    
    return {
      insertedCount: result.upsertedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      matchedCount: result.matchedCount || 0,
      errors: result.writeErrors || []
    };
  }, options);
};

module.exports = {
  withTransaction,
  executeAtomicOperations,
  createWithRelated,
  updateWithRelated,
  deleteWithRelated,
  transferOwnership,
  batchUpsert
};