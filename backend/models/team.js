const mongoose = require("mongoose");
const User = require("./user");
const Website = require("./website");

const teamsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    
    // Store user roles directly in team with better structure
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer', 'user'],
            default: 'user'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            enum: ['active', 'invited', 'suspended'],
            default: 'active'
        }
    }],
    
    // Website references
    websites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Website"
    }],
    
    // Smart contract references
    smartContracts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "SmartContract"
    }],
    
    subscription: {
        status: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'],
            default: 'incomplete',
            index: true
        },
        plan: {
            type: String,
            enum: ['offchain', 'basic', 'pro', 'enterprise'],
            default: 'offchain',
            index: true
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        },
        hasCQIntelligence: {
            type: Boolean,
            default: false
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: 'monthly'
        },
        // Usage tracking
        usage: {
            websites: { type: Number, default: 0 },
            smartContracts: { type: Number, default: 0 },
            apiCalls: { type: Number, default: 0 },
            lastResetAt: { type: Date, default: Date.now }
        },
        // Plan limits
        limits: {
            websites: { type: Number, default: 1 },
            smartContracts: { type: Number, default: 0 },
            apiCalls: { type: Number, default: 0 },
            teamMembers: { type: Number, default: 1 }
        }
    },
    
    billingAddress: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    
    // Team settings and preferences
    settings: {
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        currency: { type: String, default: 'USD' },
        emailNotifications: { type: Boolean, default: true },
        dataRetentionDays: { type: Number, default: 365 }
    },
    
    // Team status
    status: {
        type: String,
        enum: ['active', 'suspended', 'archived'],
        default: 'active',
        index: true
    }
}, { timestamps: true });

// Compound indexes for efficient querying
teamsSchema.index({ 'members.userId': 1, status: 1 });
teamsSchema.index({ createdBy: 1, status: 1 });
teamsSchema.index({ 'subscription.status': 1, 'subscription.plan': 1 });

// Virtual for member count
teamsSchema.virtual('memberCount').get(function() {
    return this.members ? this.members.filter(m => m.status === 'active').length : 0;
});

// Virtual for active subscription
teamsSchema.virtual('hasActiveSubscription').get(function() {
    return this.subscription && ['active', 'trialing'].includes(this.subscription.status);
});

// Instance method to add member
teamsSchema.methods.addMember = async function(userId, role = 'user', invitedBy = null) {
    // Check if user is already a member
    const existingMember = this.members.find(m => m.userId.equals(userId));
    
    if (existingMember) {
        // Update existing member
        existingMember.role = role;
        existingMember.status = 'active';
        existingMember.invitedBy = invitedBy;
    } else {
        // Add new member
        this.members.push({
            userId,
            role,
            invitedBy,
            status: 'active'
        });
    }
    
    // Update user's team list
    const User = require('./user');
    const user = await User.findById(userId);
    if (user) {
        await user.addToTeam(this._id, role === 'admin');
    }
    
    return this.save();
};

// Instance method to remove member
teamsSchema.methods.removeMember = async function(userId) {
    this.members = this.members.filter(m => !m.userId.equals(userId));
    
    // Update user's team list
    const User = require('./user');
    const user = await User.findById(userId);
    if (user) {
        await user.removeFromTeam(this._id);
    }
    
    return this.save();
};

// Instance method to update member role
teamsSchema.methods.updateMemberRole = async function(userId, newRole) {
    const member = this.members.find(m => m.userId.equals(userId));
    if (member) {
        member.role = newRole;
        return this.save();
    }
    throw new Error('Member not found');
};

// Instance method to check if user is member with specific role
teamsSchema.methods.isMemberWithRole = function(userId, requiredRoles = []) {
    const member = this.members.find(m => 
        m.userId.equals(userId) && m.status === 'active'
    );
    
    if (!member) return false;
    
    if (requiredRoles.length === 0) return true;
    
    return requiredRoles.includes(member.role);
};

// Instance method to update usage
teamsSchema.methods.updateUsage = async function(usageType, increment = 1) {
    if (!this.subscription.usage[usageType]) {
        this.subscription.usage[usageType] = 0;
    }
    
    this.subscription.usage[usageType] += increment;
    
    return this.save();
};

// Instance method to reset monthly usage
teamsSchema.methods.resetMonthlyUsage = async function() {
    this.subscription.usage.apiCalls = 0;
    this.subscription.usage.lastResetAt = new Date();
    return this.save();
};

// Instance method to check usage limits
teamsSchema.methods.checkUsageLimit = function(usageType) {
    const current = this.subscription.usage[usageType] || 0;
    const limit = this.subscription.limits[usageType] || 0;
    
    return {
        current,
        limit,
        remaining: Math.max(0, limit - current),
        exceeded: current >= limit
    };
};

// Static method to find teams by user
teamsSchema.statics.findByUser = async function(userId, options = {}) {
    const {
        activeOnly = true,
        role = null
    } = options;
    
    const query = {
        'members.userId': userId,
        'members.status': 'active'
    };
    
    if (activeOnly) {
        query.status = 'active';
    }
    
    if (role) {
        query['members.role'] = role;
    }
    
    return this.find(query).populate('members.userId', 'name email avatar');
};

// Static method to get team statistics
teamsSchema.statics.getTeamStats = async function() {
    const pipeline = [
        {
            $group: {
                _id: null,
                totalTeams: { $sum: 1 },
                activeTeams: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                teamsWithActiveSubscription: {
                    $sum: {
                        $cond: [
                            { $in: ['$subscription.status', ['active', 'trialing']] },
                            1,
                            0
                        ]
                    }
                },
                totalMembers: { $sum: { $size: '$members' } },
                avgMembersPerTeam: { $avg: { $size: '$members' } }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalTeams: 0,
        activeTeams: 0,
        teamsWithActiveSubscription: 0,
        totalMembers: 0,
        avgMembersPerTeam: 0
    };
};

// Pre-save middleware
teamsSchema.pre('save', function(next) {
    // Update usage counts based on current data
    this.subscription.usage.websites = this.websites.length;
    this.subscription.usage.smartContracts = this.smartContracts.length;
    
    next();
});

const Team = mongoose.model('Team', teamsSchema);

module.exports = Team;