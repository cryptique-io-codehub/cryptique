const axios = require("axios");
const cheerio = require("cheerio");
const Website=require("../models/website");
const Team=require("../models/team");
const { v4: uuidv4 } = require('uuid');


exports.addWebsite=async (req,res)=>{
   try{

        const {teamName,Domain,Name}=req.body;

        if(!teamName && !Domain) return res.status(400).json({message:"Required field is missing"});

        const checkTeam=await Team.findOne({name:teamName});

        if(!checkTeam) return res.status(404).json({message:"Team not found"});

        const siteId = uuidv4(); 

        const newWebsite=new Website({
            siteId,
            Domain,
            Name:Name || '',
            team:checkTeam._id,
        })

        await newWebsite.save();

        
        await Team.findOneAndUpdate(
            { name: teamName }, 
            { $push: { websites: newWebsite._id } },
            { new: true } 
        );

        return res.status(200).json({message:"Website added successfully",website:newWebsite});

   }catch(e){

        console.error("Error while adding website",e);

        res.status(500).json({ message: 'Error creating user', error: error.message });

   }

}

exports.deleteWebsite=async (req,res)=>{
    try{

        const {teamName,webId}=req.body;

        if(!webId && !teamName) return res.status(400).json({message:"Required fields are missing"});

        const checkTeam=await Team.findOne({name:teamName});

        if(!checkTeam) return res.status(404).json({message:"Team not found"});

        const website=await Website.deleteOne({_id:webId});

        if(website.deletedCount===0) {

            return res.status(404).json({message:"Website not found"});

        }else {

            const team = await Team.findOneAndUpdate(
                { name: teamName }, 
                { $pull: { websites: webId } }, 
                { new: true } 
            );

            return res.status(200).json({message:"website deleted successfully",website});
        }

    }catch(e){

        console.error("Error while deleting website",e);

        res.status(500).json({ message: 'Error while deleting the website', error: e.message });

    }
}

exports.verify=async (req,res)=>{
    try{

        const {Domain,siteId}=req.body;

        if(!Domain && !siteId) return res.status(400).json({message:"Required fields are missing"});

        const {data}=await axios.get(`https://${Domain}`);

        const $=cheerio.load(data);

        //put our script source link here
        const scriptSrc="";
        
        const scriptTag=$(`script[src="${scriptSrc}"][site-id="${siteId}"]`);

        if(scriptTag.length>0) {

            await Website.findOneAndUpdate(
                { Domain }, 
                { $set: { isVerified: true } }, 
                { new: true } 
            );

            return res.status(200).json({message:"Script found"});

        }else {

            return res.status(404).json({message:"Script not found"});

        }


    }catch(e){

        console.error('Error while fetching the website',e);

        res.status(500).json({ message: 'Error while web scrapping', e: e.message });
    }
}