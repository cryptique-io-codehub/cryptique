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
    team:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Team"
    }]
});


const User = mongoose.model('User', userSchema);

module.exports = User;