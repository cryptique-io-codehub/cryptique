const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    avatar: {
        type: String,
        default: '',
    },
    otp: {
        type: Number,
    },
    otpExpiry: {
        type: Date,
    },
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    password: {
        type: String,
        default:'',
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Simplified team relationships - store only IDs
    teamIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team"
    }],
    
    // Primary team for default operations
    primaryTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team"
    },
    
    // User preferences and metadata
    preferences: {
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        emailNotifications: { type: Boolean, default: true },
        dashboardLayout: { type: String, default: 'default' }
    },
    
    // Last activity tracking
    lastLoginAt: {
        type: Date,
        index: true
    },
    
    lastActiveAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Account status
    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'pending_verification'],
        default: 'pending_verification',
        index: true
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Compound indexes for efficient querying
userSchema.index({ email: 1, isVerified: 1 });
userSchema.index({ primaryTeamId: 1, accountStatus: 1 });

// Virtual to get team count
userSchema.virtual('teamCount').get(function() {
    return this.teamIds ? this.teamIds.length : 0;
});

// Instance method to add team
userSchema.methods.addToTeam = async function(teamId, isPrimary = false) {
    if (!this.teamIds.includes(teamId)) {
        this.teamIds.push(teamId);
    }
    
    if (isPrimary || !this.primaryTeamId) {
        this.primaryTeamId = teamId;
    }
    
    return this.save();
};

// Instance method to remove from team
userSchema.methods.removeFromTeam = async function(teamId) {
    this.teamIds = this.teamIds.filter(id => !id.equals(teamId));
    
    // If removing primary team, set new primary
    if (this.primaryTeamId && this.primaryTeamId.equals(teamId)) {
        this.primaryTeamId = this.teamIds.length > 0 ? this.teamIds[0] : null;
    }
    
    return this.save();
};

// Instance method to update last activity
userSchema.methods.updateActivity = async function() {
    this.lastActiveAt = new Date();
    return this.save({ validateBeforeSave: false });
};

// Static method to find users by team
userSchema.statics.findByTeam = async function(teamId, options = {}) {
    const {
        activeOnly = true,
        limit = 100,
        skip = 0
    } = options;
    
    const query = { teamIds: teamId };
    
    if (activeOnly) {
        query.accountStatus = 'active';
    }
    
    return this.find(query)
        .select('-password -otp -passwordResetToken')
        .limit(limit)
        .skip(skip)
        .sort({ lastActiveAt: -1 });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function(teamId = null) {
    const matchStage = teamId ? { teamIds: new mongoose.Types.ObjectId(teamId) } : {};
    
    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: { $cond: [{ $eq: ['$accountStatus', 'active'] }, 1, 0] }
                },
                verifiedUsers: {
                    $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                },
                recentlyActive: {
                    $sum: {
                        $cond: [
                            {
                                $gte: [
                                    '$lastActiveAt',
                                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        recentlyActive: 0
    };
};

// Pre-save middleware
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Set primary team if none exists but user has teams
    if (!this.primaryTeamId && this.teamIds && this.teamIds.length > 0) {
        this.primaryTeamId = this.teamIds[0];
    }
    
    next();
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.otp;
    delete user.passwordResetToken;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;