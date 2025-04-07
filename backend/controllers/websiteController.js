
const axios = require("axios");
const cheerio = require("cheerio");
const Website=require("../models/website");
const Team=require("../models/team");
const { v4: uuidv4 } = require('uuid');

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

        res.status(500).json({ message: 'Error creating user', error: e.message });

   }

}

exports.deleteWebsite=async (req,res)=>{
    try{

        const {teamName,webId}=req.body;
        console.log(teamName);
        console.log(webId);
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

<<<<<<< HEAD


exports.verify = async (req, res) => {
    try {
        const { Domain, siteId } = req.body;
        console.log('a');
        console.log(req.body);
        console.log('first');
        if (!Domain || !siteId) return res.status(400).json({ message: "Required fields are missing" });
        console.log('second');
        const scriptSrc = "http://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js";
        console.log('third');
        const browser = await puppeteer.launch({ headless: "new" });
        console.log('fourth')
        const page = await browser.newPage();
        console.log('fifth')

        await page.goto(`http://${Domain}`, { waitUntil: "networkidle2" });
        console.log('sixth');

        // Evaluate if script with matching siteId exists
        const scriptExists = await page.evaluate((scriptSrc, siteId) => {
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script => script.src === scriptSrc && script.getAttribute('site-id') === siteId);
        }, scriptSrc, siteId);
        console.log('seventh');
        await browser.close();
        console.log('eight');

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

=======
>>>>>>> 0dda56f8503c6aaa2d9f06f5a7e5f38626484c4f
exports.getWebsitesOfTeam = async (req, res) => {
    try {
        const { teamName } = req.body;
        console.log(req.body);
        if (!teamName) return res.status(400).json({ message: "Required fields are missing" });

        const team = await Team.findOne({ name: teamName }).populate('websites');
        if (!team) return res.status(404).json({ message: "Team not found" });

        return res.status(200).json({ message: "Websites fetched successfully", websites: team.websites });
    } catch (e) {
        console.error("Error while fetching websites", e);
        res.status(500).json({ message: 'Error while fetching websites', error: e.message });
    }
}

exports.verify = async (req, res) => {
    try {
        const { Domain, siteId } = req.body;
        console.log(Domain, siteId);
        if (!Domain || !siteId) {
            return res.status(400).json({ message: "Domain and siteId are required" });
        }

        const targetScriptSrc = "https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js";
        
        
        let data;
        try {
            data = await axios.get(`https://${Domain}`, { timeout: 5000 });
        } catch (httpsError) {
            try {
                data = await axios.get(`http://${Domain}`, { timeout: 5000 });
            } catch (httpError) {
                return res.status(404).json({ message: "Could not access the website" });
            }
        }

        const $ = cheerio.load(data.data);
        let foundScript = false;
        let foundSiteId = false;

        
        $('script').each((i, element) => {
            const script = $(element);
            
            
            if (script.attr('src') === targetScriptSrc) {
                foundScript = true;
                if (script.attr('site-id') === siteId) {
                    foundSiteId = true;
                }
                return false; 
            }
            
            
            const scriptContent = script.html() || '';
            if (scriptContent.includes(targetScriptSrc)) {
                foundScript = true;
                
                const siteIdMatch = scriptContent.match(/script\.setAttribute\('site-id',\s*'([^']+)'/);
                if (siteIdMatch && siteIdMatch[1] === siteId) {
                    foundSiteId = true;
                }
                return false; 
            }
        });

        if (!foundScript) {
            return res.status(404).json({ message: "Cryptique analytics script not found on the page" });
        }

        if (!foundSiteId) {
            return res.status(403).json({ message: "site-id does not match or is missing" });
        }

        
        await Website.findOneAndUpdate(
            { Domain },
            { $set: { isVerified: true } },
            { new: true }
        );

        return res.status(200).json({ message: "Verification successful" });

    } catch (e) {
        console.error('Verification error:', e);
        return res.status(500).json({ message: 'Verification failed', error: e.message});
    }
};
