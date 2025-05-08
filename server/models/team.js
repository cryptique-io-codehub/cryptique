const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: String, // User ID of the team owner
    required: true
  },
  members: [{
    userId: String,
    email: String,
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  billing: {
    companyName: String,
    address: String,
    city: String,
    zipCode: String,
    country: String,
    isRegisteredCompany: Boolean,
    taxId: String,
    invoiceEmail: String,
    zohoContactId: String
  },
  websites: [{
    url: String,
    name: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  contracts: [{
    address: String,
    name: String,
    network: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  features: {
    hasCQIntelligence: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp when the document is modified
teamSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if a user is a member of the team
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.userId === userId && member.status === 'active'
  );
};

// Method to check if a user is an admin of the team
teamSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.userId === userId && 
    (member.role === 'admin' || member.role === 'owner') &&
    member.status === 'active'
  );
};

// Method to add a member to the team
teamSchema.methods.addMember = function(userId, email, role = 'member') {
  // Check if the user is already a member
  const existingMember = this.members.find(member => member.userId === userId);
  
  if (existingMember) {
    existingMember.status = 'active';
    existingMember.role = role;
  } else {
    this.members.push({
      userId,
      email,
      role,
      status: 'active',
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team; 