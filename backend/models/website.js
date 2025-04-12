const mongoose=require("mongoose");
const Team=require("./team");
const Analytics=require("./analytics")

const websiteSchema=new mongoose.Schema({
    siteId:{
        type:String,
        unique:true
    },
    Domain:{
        type:String,
        required:true,
    },
    Name:{
        type:String
    },
    team:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Team"
    },
    analytics:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Analytics"
    },
    isVerified:{
        type:Boolean,
        default:false
    }
})


const Website=mongoose.model('Website',websiteSchema);

module.exports=Website;