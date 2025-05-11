const mongoose = require('mongoose');

const eventDefinitionSchema = new mongoose.Schema({
  // Basic event info
  name: {
    type: String, 
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'custom',
    enum: ['custom', 'ecommerce', 'form', 'video', 'click', 'funnel', 'ab_test', 'conversion']
  },
  type: {
    type: String,
    required: true,
    default: 'custom'
  },
  description: {
    type: String,
    trim: true
  },
  
  // Selector for automatic binding
  selector: {
    type: String,
    default: ''
  },
  trigger: {
    type: String,
    default: 'click',
    enum: ['click', 'submit', 'play', 'pause', 'ended', 'hover', 'focus', 'blur', 'load', 'custom']
  },
  
  // Metadata configuration
  metadata: [{
    key: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: 'custom'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  
  // Value tracking for monetary values
  valueTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    currencyCode: {
      type: String,
      default: 'USD'
    },
    source: {
      type: String
    },
    defaultValue: {
      type: Number,
      default: 0
    }
  },
  
  // Funnel steps configuration
  funnelSteps: [{
    position: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  
  // A/B testing configuration
  abTesting: {
    enabled: {
      type: Boolean,
      default: false
    },
    variants: [{
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      weight: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
      }
    }]
  },
  
  // Foreign keys
  siteId: {
    type: String,
    required: true,
    index: true
  },
  teamId: {
    type: String,
    required: true,
    index: true
  },
  
  // Metadata
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
eventDefinitionSchema.index({ teamId: 1, siteId: 1, active: 1 });
eventDefinitionSchema.index({ name: 1, siteId: 1 }, { unique: true });

module.exports = mongoose.model('EventDefinition', eventDefinitionSchema); 