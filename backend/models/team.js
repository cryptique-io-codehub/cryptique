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
            enum: ['offchain', 'basic', 'pro', 'enterprise'],
            default: 'offchain'
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
        limits: {
            websites: {
                type: Number,
                default: 1
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
            }
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
            default: 1 // Start with 1 for the creator
        },
        lastResetDate: {
            type: Date,
            default: Date.now // For tracking monthly reset of API calls
        }
    },
    billingAddress: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { timestamps: true });

const Team=mongoose.model('Team',teamsSchema);

module.exports=Team;