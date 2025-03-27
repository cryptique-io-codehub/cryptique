const mongoose = require('mongoose');
const Team=require("./team")

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    avatar: {
        type: String,
        default: '',
    },
    otp: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    password: {
        type: String,
        default:'',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    myTeams:[{//Teams whose owner is the user or teams made by the user
        type:mongoose.Types.ObjectId,
        ref:"Team"
    }],
    team:[{//Teams in which User is a member
        type:mongoose.Schema.Types.ObjectId,
        ref:"Team"
    }]
});


const User = mongoose.model('User', userSchema);

module.exports = User;