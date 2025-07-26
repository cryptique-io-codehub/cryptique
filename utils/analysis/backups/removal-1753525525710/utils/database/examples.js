/**
 * Database Utilities Usage Examples
 * Demonstrates how to refactor existing code to use centralized database utilities
 */

// Import the database utilities
const { 
  userOperations, 
  transactionOperations, 
  teamOperations,
  subscriptionOperations,
  findWithPagination,
  createWithValidation,
  updateByIdWithValidation,
  handleDatabaseError,
  createNotFoundError,
  withTransaction
} = require('./index');

/**
 * Example 1: User Authentication Controller Refactoring
 * Before: Direct mongoose operations with manual error handling
 * After: Using centralized user operations
 */

// BEFORE - Original userAuthController.js patterns
const beforeUserAuth = {
  async createUser(req, res) {
    try {
      const { name, email, password } = req.body.formData;
      
      // Manual duplicate check
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Manual user creation
      const newUser = new User({ name, email, password });
      await newUser.save();
      
      // Manual team creation
      const teamName = email.split('@')[0];
      const teams = await Team.findOne({ name: teamName });
      
      if (!teams) {
        const newTeam = new Team({
          name: teamName,
          createdBy: newUser._id,
          user: [{ userId: newUser._id, role: 'admin' }]
        });
        await newTeam.save();
        newUser.team = [newTeam._id];
        await newUser.save();
      }
      
      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error: error.message });
    }
  },

  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(400).json({ message: "Invalid email" });
      }
      
      if (user.otp !== parseInt(otp) || !user.otpExpiry || user.otpExpiry < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      
      res.status(200).json({ message: 'OTP verification successful', user });
    } catch (error) {
      res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
  }
};

// AFTER - Using centralized database utilities
const afterUserAuth = {
  async createUser(req, res) {
    try {
      const { name, email, password } = req.body.formData;
      
      // Check if user exists using utility
      const existingUser = await userOperations.findByEmail(User, email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create user with team using atomic operation
      const { user, team } = await userOperations.createWithTeam(User, Team, {
        name,
        email,
        password
      });
      
      res.status(201).json({ 
        message: 'User created successfully', 
        user,
        team 
      });
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'create user');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  },

  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;
      
      // Use centralized OTP verification
      const user = await userOperations.verifyOtp(User, email, otp);
      
      res.status(200).json({ 
        message: 'OTP verification successful', 
        user 
      });
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'verify OTP');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
};

/**
 * Example 2: Transaction Controller Refactoring
 */

// BEFORE - Original transactionController.js patterns
const beforeTransactionController = {
  async getContractTransactions(req, res) {
    try {
      const { contractId } = req.params;
      const { limit = 100000, page = 1 } = req.query;
      
      // Manual contract validation
      const contract = await SmartContract.findOne({ contractId });
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Manual team access check
      const team = await Team.findOne({ 
        _id: contract.team,
        $or: [
          { createdBy: req.userId },
          { "user.userId": req.userId }
        ]
      });
      
      if (!team) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Manual pagination
      const limitNum = parseInt(limit);
      const pageNum = parseInt(page);
      const skip = (pageNum - 1) * limitNum;
      
      const total = await Transaction.countDocuments({ contractId });
      const transactions = await Transaction.find({ contractId })
        .sort({ block_number: -1 })
        .skip(skip)
        .limit(limitNum);
      
      res.status(200).json({ 
        transactions,
        metadata: { total, page: pageNum, limit: limitNum }
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions", error: error.message });
    }
  }
};

// AFTER - Using centralized database utilities
const afterTransactionController = {
  async getContractTransactions(req, res) {
    try {
      const { contractId } = req.params;
      const { limit = 100000, page = 1, before, after } = req.query;
      
      // Validate contract and user access using utility
      const contract = await SmartContract.findOne({ contractId });
      if (!contract) {
        const error = createNotFoundError('Contract', contractId);
        return res.status(error.statusCode).json(error);
      }
      
      const team = await teamOperations.checkUserAccess(Team, contract.team, req.userId);
      if (!team) {
        const error = createPermissionError('access', 'contract transactions');
        return res.status(error.statusCode).json(error);
      }
      
      // Use centralized transaction operations
      const result = await transactionOperations.getByContract(Transaction, contractId, {
        limit,
        page,
        before,
        after
      });
      
      res.status(200).json(result);
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'get contract transactions');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  },

  async saveTransactions(req, res) {
    try {
      const { contractId } = req.params;
      const { transactions } = req.body;
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: "No transactions provided" });
      }
      
      const contract = await SmartContract.findOne({ contractId });
      if (!contract) {
        const error = createNotFoundError('Contract', contractId);
        return res.status(error.statusCode).json(error);
      }
      
      // Use centralized bulk save operation
      const result = await transactionOperations.bulkSave(
        Transaction, 
        contractId, 
        transactions, 
        contract._id
      );
      
      res.status(200).json({
        message: "Transaction processing complete",
        ...result
      });
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'save transactions');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
};

/**
 * Example 3: Stripe Service Refactoring
 */

// BEFORE - Original stripeService.js patterns
const beforeStripeService = {
  async handleSubscriptionUpdated(subscription) {
    try {
      const { id, status, current_period_start, current_period_end } = subscription;
      
      // Manual subscription update
      const updated = await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: id },
        {
          status,
          currentPeriodStart: new Date(current_period_start * 1000),
          currentPeriodEnd: new Date(current_period_end * 1000),
        },
        { new: true }
      );
      
      if (!updated) {
        console.log('Subscription not found');
        return null;
      }
      
      // Manual team update
      await Team.findByIdAndUpdate(updated.teamId, {
        'subscription.status': status === 'active' ? 'active' : 'inactive',
        'subscription.startDate': new Date(current_period_start * 1000),
        'subscription.endDate': new Date(current_period_end * 1000),
      });
      
      return updated;
    } catch (error) {
      console.error('Error in handleSubscriptionUpdated:', error);
      throw error;
    }
  }
};

// AFTER - Using centralized database utilities
const afterStripeService = {
  async handleSubscriptionUpdated(subscription) {
    try {
      // Use centralized subscription operations
      const updated = await subscriptionOperations.updateFromStripe(Subscription, subscription);
      
      // Use centralized team operations
      await teamOperations.updateSubscription(Team, updated.teamId, {
        status: subscription.status === 'active' ? 'active' : 'inactive',
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000)
      });
      
      return updated;
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'update subscription from Stripe');
      throw errorResponse;
    }
  }
};

/**
 * Example 4: Generic Query Patterns
 */

// BEFORE - Manual pagination and error handling
const beforeGenericQueries = {
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (page - 1) * limit;
      
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .populate('team')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// AFTER - Using centralized pagination utility
const afterGenericQueries = {
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      
      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      // Use centralized pagination utility
      const result = await findWithPagination(User, query, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: 'team'
      });
      
      res.json({
        users: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      const errorResponse = handleDatabaseError(error, 'get users');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
};

module.exports = {
  beforeUserAuth,
  afterUserAuth,
  beforeTransactionController,
  afterTransactionController,
  beforeStripeService,
  afterStripeService,
  beforeGenericQueries,
  afterGenericQueries
};