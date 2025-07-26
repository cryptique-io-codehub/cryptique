/**
 * Model-Specific Database Operations
 * Common database operations for specific models used across services
 */

const { 
  findByIdWithValidation, 
  findOneWithErrorHandling, 
  createWithValidation,
  updateByIdWithValidation,
  deleteByIdWithValidation,
  findWithPagination,
  bulkWriteWithErrorHandling,
  validateObjectId,
  createNotFoundError,
  createPermissionError
} = require('./index');

/**
 * User operations
 */
const userOperations = {
  /**
   * Find user by email with error handling
   * @param {mongoose.Model} User - User model
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User document or null
   */
  findByEmail: async (User, email) => {
    return await findOneWithErrorHandling(User, { email });
  },

  /**
   * Create user with team assignment
   * @param {mongoose.Model} User - User model
   * @param {mongoose.Model} Team - Team model
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user and team
   */
  createWithTeam: async (User, Team, userData) => {
    const { withTransaction } = require('./transactionHelpers');
    
    return await withTransaction(async (session) => {
      // Create user
      const [user] = await User.create([userData], { session });
      
      // Create team
      const teamName = userData.email.split('@')[0];
      const existingTeam = await Team.findOne({ name: teamName }).session(session);
      
      let team;
      if (!existingTeam) {
        [team] = await Team.create([{
          name: teamName,
          createdBy: user._id,
          user: [{ userId: user._id, role: 'admin' }]
        }], { session });
        
        // Update user with team reference
        user.team = [team._id];
        await user.save({ session });
      } else {
        team = existingTeam;
      }
      
      return { user, team };
    });
  },

  /**
   * Update user password with validation
   * @param {mongoose.Model} User - User model
   * @param {string} userId - User ID
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<Object>} Updated user
   */
  updatePassword: async (User, userId, hashedPassword) => {
    validateObjectId(userId, 'userId');
    
    return await updateByIdWithValidation(User, userId, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      updatedAt: new Date()
    });
  },

  /**
   * Verify user and clear OTP
   * @param {mongoose.Model} User - User model
   * @param {string} email - User email
   * @param {number} otp - OTP to verify
   * @returns {Promise<Object>} Verified user
   */
  verifyOtp: async (User, email, otp) => {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw createNotFoundError('User', email);
    }
    
    if (user.otp !== parseInt(otp) || !user.otpExpiry || user.otpExpiry < Date.now()) {
      throw new Error('Invalid or expired OTP');
    }
    
    return await updateByIdWithValidation(User, user._id, {
      isVerified: true,
      otp: undefined,
      otpExpiry: undefined,
      updatedAt: new Date()
    });
  }
};

/**
 * Transaction operations
 */
const transactionOperations = {
  /**
   * Get transactions for contract with pagination
   * @param {mongoose.Model} Transaction - Transaction model
   * @param {string} contractId - Contract ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated transactions
   */
  getByContract: async (Transaction, contractId, options = {}) => {
    const { limit = 100000, before, after, page = 1 } = options;
    
    const query = { contractId };
    
    if (before) {
      query.block_time = { ...query.block_time, $lt: new Date(before) };
    }
    if (after) {
      query.block_time = { ...query.block_time, $gt: new Date(after) };
    }
    
    const result = await findWithPagination(Transaction, query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { block_number: -1 }
    });
    
    // Get latest block number
    const latestBlockNumber = result.data.length > 0 
      ? Math.max(...result.data.map(tx => tx.block_number))
      : 0;
    
    return {
      transactions: result.data,
      metadata: {
        ...result.pagination,
        latestBlockNumber
      }
    };
  },

  /**
   * Bulk save transactions with duplicate handling
   * @param {mongoose.Model} Transaction - Transaction model
   * @param {string} contractId - Contract ID
   * @param {Array} transactions - Transactions to save
   * @param {Object} contractObjectId - Contract ObjectId
   * @returns {Promise<Object>} Save results
   */
  bulkSave: async (Transaction, contractId, transactions, contractObjectId) => {
    const BATCH_SIZE = 7500;
    let totalInserted = 0;
    let errors = [];
    
    // Process in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      try {
        const batch = transactions.slice(i, i + BATCH_SIZE);
        
        const validTransactions = batch.filter(tx => 
          tx && typeof tx.tx_hash === 'string' && tx.tx_hash.length > 0
        );
        
        if (validTransactions.length === 0) continue;
        
        const preparedTransactions = validTransactions.map(tx => ({
          ...tx,
          contract: contractObjectId,
          contractId,
          createdAt: new Date()
        }));
        
        const bulkOps = preparedTransactions.map(tx => ({
          updateOne: {
            filter: { contractId: tx.contractId, tx_hash: tx.tx_hash },
            update: { $setOnInsert: tx },
            upsert: true
          }
        }));
        
        const result = await bulkWriteWithErrorHandling(Transaction, bulkOps);
        totalInserted += result.insertedCount;
        
      } catch (batchError) {
        errors.push(batchError.message);
      }
    }
    
    return {
      inserted: totalInserted,
      total: transactions.length,
      duplicatesSkipped: transactions.length - totalInserted,
      errors
    };
  },

  /**
   * Get latest block number for contract
   * @param {mongoose.Model} Transaction - Transaction model
   * @param {string} contractId - Contract ID
   * @returns {Promise<Object>} Latest block info
   */
  getLatestBlock: async (Transaction, contractId) => {
    const latestTx = await findOneWithErrorHandling(Transaction, 
      { contractId }, 
      { sort: { block_number: -1 } }
    );
    
    return {
      contractId,
      latestBlockNumber: latestTx ? latestTx.block_number : 0,
      hasTransactions: !!latestTx
    };
  },

  /**
   * Delete all transactions for contract
   * @param {mongoose.Model} Transaction - Transaction model
   * @param {string} contractId - Contract ID
   * @returns {Promise<Object>} Delete results
   */
  deleteByContract: async (Transaction, contractId) => {
    const result = await Transaction.deleteMany({ contractId });
    
    return {
      deletedCount: result.deletedCount,
      contractId
    };
  }
};

/**
 * Team operations
 */
const teamOperations = {
  /**
   * Check if user has access to team
   * @param {mongoose.Model} Team - Team model
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Team if user has access
   */
  checkUserAccess: async (Team, teamId, userId) => {
    validateObjectId(teamId, 'teamId');
    validateObjectId(userId, 'userId');
    
    return await findOneWithErrorHandling(Team, {
      _id: teamId,
      $or: [
        { createdBy: userId },
        { "user.userId": userId }
      ]
    });
  },

  /**
   * Get team subscription status with grace period
   * @param {mongoose.Model} Team - Team model
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Subscription status
   */
  getSubscriptionStatus: async (Team, teamId) => {
    const team = await findByIdWithValidation(Team, teamId);
    
    if (team.subscription.plan === 'free') {
      return {
        status: 'active',
        plan: 'free',
        inGracePeriod: false
      };
    }
    
    const gracePeriodDays = 30;
    const isInGracePeriod = checkGracePeriod(team, gracePeriodDays);
    
    return {
      status: team.subscription.status,
      plan: team.subscription.plan,
      inGracePeriod: isInGracePeriod,
      gracePeriod: isInGracePeriod ? {
        endDate: getGracePeriodEndDate(team, gracePeriodDays),
        daysLeft: getDaysLeftInGracePeriod(team, gracePeriodDays)
      } : null
    };
  },

  /**
   * Update team subscription
   * @param {mongoose.Model} Team - Team model
   * @param {string} teamId - Team ID
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} Updated team
   */
  updateSubscription: async (Team, teamId, subscriptionData) => {
    return await updateByIdWithValidation(Team, teamId, {
      'subscription.status': subscriptionData.status,
      'subscription.plan': subscriptionData.plan,
      'subscription.startDate': subscriptionData.startDate,
      'subscription.endDate': subscriptionData.endDate,
      updatedAt: new Date()
    });
  }
};

/**
 * Subscription operations
 */
const subscriptionOperations = {
  /**
   * Find subscription by Stripe ID
   * @param {mongoose.Model} Subscription - Subscription model
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<Object|null>} Subscription document
   */
  findByStripeId: async (Subscription, stripeSubscriptionId) => {
    return await findOneWithErrorHandling(Subscription, { stripeSubscriptionId });
  },

  /**
   * Update subscription from Stripe webhook
   * @param {mongoose.Model} Subscription - Subscription model
   * @param {Object} stripeSubscription - Stripe subscription data
   * @returns {Promise<Object>} Updated subscription
   */
  updateFromStripe: async (Subscription, stripeSubscription) => {
    const { id, status, current_period_start, current_period_end, cancel_at_period_end } = stripeSubscription;
    
    const subscription = await findOneWithErrorHandling(Subscription, { stripeSubscriptionId: id });
    
    if (!subscription) {
      throw createNotFoundError('Subscription', id);
    }
    
    return await updateByIdWithValidation(Subscription, subscription._id, {
      status,
      currentPeriodStart: new Date(current_period_start * 1000),
      currentPeriodEnd: new Date(current_period_end * 1000),
      cancelAtPeriodEnd: cancel_at_period_end,
      updatedAt: new Date()
    });
  },

  /**
   * Add addon to subscription
   * @param {mongoose.Model} Subscription - Subscription model
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} addonData - Addon data
   * @returns {Promise<Object>} Updated subscription
   */
  addAddon: async (Subscription, subscriptionId, addonData) => {
    const subscription = await findOneWithErrorHandling(Subscription, { stripeSubscriptionId: subscriptionId });
    
    if (!subscription) {
      throw createNotFoundError('Subscription', subscriptionId);
    }
    
    return await updateByIdWithValidation(Subscription, subscription._id, {
      $push: {
        addons: {
          ...addonData,
          addedAt: new Date(),
          active: true
        }
      }
    });
  }
};

// Helper functions for team operations
function checkGracePeriod(team, gracePeriodDays) {
  if (!team.subscription.endDate) return false;
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  return new Date() <= gracePeriodEndDate;
}

function getGracePeriodEndDate(team, gracePeriodDays) {
  if (!team.subscription.endDate) return null;
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  return gracePeriodEndDate;
}

function getDaysLeftInGracePeriod(team, gracePeriodDays) {
  if (!team.subscription.endDate) return 0;
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  const today = new Date();
  const daysLeft = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysLeft);
}

module.exports = {
  userOperations,
  transactionOperations,
  teamOperations,
  subscriptionOperations
};