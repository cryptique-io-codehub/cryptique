const mongoose=require("mongoose");


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
    status:{
        type:Boolean
    }
})


const Website=mongoose.model('Website',websiteSchema);

module.exports=Website;