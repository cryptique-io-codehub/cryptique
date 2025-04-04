const axios = require("axios");
const cheerio = require("cheerio");
const Website=require("../models/website");
const Team=require("../models/team");
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');

exports.addWebsite=async (req,res)=>{
   try{

        const {teamName,Domain,Name}=req.body;
        console.log(teamName);
        console.log(Domain);
        console.log(Name);

        if(!teamName && !Domain) return res.status(400).json({message:"Required field is missing"});

        const checkTeam=await Team.findOne({name:teamName});

        if(!checkTeam) return res.status(404).json({message:"Team not found"});

        const siteId = uuidv4(); 
        console.log(siteId);
        const newWebsite=new Website({
            siteId,
            Domain,
            Name:Name || '',
            team:checkTeam._id,
        })
        console.log('c');
        await newWebsite.save();
        console.log('b');
        
        await Team.findOneAndUpdate(
            { name: teamName }, 
            { $push: { websites: newWebsite._id } },
            { new: true } 
        );
        console.log('ritik');
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



exports.verify = async (req, res) => {
    try {
        const { Domain, siteId } = req.body;
        console.log('a');
        console.log(req.body);
        console.log(Domain);
        console.log(siteId);
        console.log('b');
        if (!Domain || !siteId) return res.status(400).json({ message: "Required fields are missing" });

        const scriptSrc = "https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js";

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.goto(`https://${Domain}`, { waitUntil: "networkidle2" });

        // Evaluate if script with matching siteId exists
        const scriptExists = await page.evaluate((scriptSrc, siteId) => {
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script => script.src === scriptSrc && script.getAttribute('site-id') === siteId);
        }, scriptSrc, siteId);

        await browser.close();

        if (scriptExists) {
            console.log('rrrrr');
            await Website.findOneAndUpdate(
                { Domain },
                { $set: { isVerified: true } },
                { new: true }
            );
            return res.status(200).json({ message: "Script found" });
        } else {
            return res.status(404).json({ message: "Script not found" });
        }

    } catch (e) {
        console.error('Error while fetching the website', e);
        res.status(500).json({ message: 'Error while web scraping', error: e.message });
    }
};

exports.getWebsitesOfTeam = async (req, res) => {
    try {
        const { teamName } = req.body;
        if (!teamName) return res.status(400).json({ message: "Required fields are missing" });

        const team = await Team.findOne({ name: teamName }).populate('websites');
        if (!team) return res.status(404).json({ message: "Team not found" });
        console.log(typeof(team.websites));
        return res.status(200).json({ message: "Websites fetched successfully", websites: team.websites });
    } catch (e) {
        console.error("Error while fetching websites", e);
        res.status(500).json({ message: 'Error while fetching websites', error: e.message });
    }
}