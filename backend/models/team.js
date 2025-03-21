const mongoose=require("mongoose");
const User=require("./user");

const teamsSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
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
    }]
})

const Team=mongoose.model('Team',teamsSchema);

module.exports=Team;