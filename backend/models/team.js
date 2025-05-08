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
        default: ""
    },
    createdBy:{type:mongoose.Schema.Types.ObjectId},
    user:[{
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        role:{
            type:String,
            enum:['admin','editor','viewer']
        }
    }],
    websites:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Website"
    }]
})

const Team=mongoose.model('Team',teamsSchema);

module.exports=Team;