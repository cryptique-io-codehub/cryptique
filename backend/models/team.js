const mongoose=require("mongoose");
const User=require("./user");
const Website=require("./website");

const teamsSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        default:''
    },
    createdBy:{type:mongoose.Schema.Types.ObjectId},
    user:[{
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        role:{
            type:String,
            enum:['admin','editor','viewer','user']
        }
    }],
    websites:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Website"
    }],
    subscription: {
        status: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'],
            default: 'incomplete'
        },
        plan: {
            type: String,
            enum: ['free', 'offchain', 'basic', 'pro', 'enterprise'],
            default: 'free'
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
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
        customLimits: {
            type: Map,
            of: Number,
            default: {}
        }
    },
    usage: {
        websites: {
            type: Number,
            default: 0
        },
        smartContracts: {
            type: Number,
            default: 0
        },
        apiCalls: {
            type: Number,
            default: 0
        },
        teamMembers: {
            type: Number,
            default: 1
        },
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    billingAddress: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { timestamps: true });

teamsSchema.pre('save', function(next) {
    if (!this.usage) {
        this.usage = {
            websites: this.websites ? this.websites.length : 0,
            smartContracts: 0,
            apiCalls: 0,
            teamMembers: this.user ? this.user.length : 1,
            lastResetDate: new Date()
        };
    }
    
    if (!this.subscription) {
        this.subscription = {
            status: 'active',
            plan: 'free',
            billingCycle: 'monthly'
        };
    }
    
    next();
});

const Team=mongoose.model('Team',teamsSchema);

module.exports=Team;