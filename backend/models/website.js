const mongoose=require("mongoose");
const Team=require("./team");

const websiteSchema=new mongoose.Schema({
    siteId:{
        type:String,
        unique:true
    },
    Domain:{
        type:String,
        required:true,
        unique:true
    },
    Name:{
        type:String
    },
    team:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Team"
    },
    isVerified:{
        type:Boolean
    }
})


const Website=mongoose.model('Website',websiteSchema);

module.exports=Website;