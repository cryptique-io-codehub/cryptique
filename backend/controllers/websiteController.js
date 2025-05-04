const axios = require("axios");
const cheerio = require("cheerio");
const Website=require("../models/website");
const Team=require("../models/team");
const { v4: uuidv4 } = require('uuid');

exports.addWebsite=async (req,res)=>{
   try{

        const {teamName,Domain,Name}=req.body;
        // console.log(teamName);
        // console.log(Domain);
        // console.log(Name);

        if(!teamName && !Domain) return res.status(400).json({message:"Required field is missing"});

        const checkTeam=await Team.findOne({name:teamName});

        if(!checkTeam) return res.status(404).json({message:"Team not found"});

        const siteId = uuidv4(); 
        // console.log(siteId);
        const newWebsite=new Website({
            siteId,
            Domain,
            Name:Name || '',
            team:checkTeam._id,
        })
        // console.log('c');
        await newWebsite.save();
        // console.log('b');
        
        await Team.findOneAndUpdate(
            { name: teamName }, 
            { $push: { websites: newWebsite._id } },
            { new: true } 
        );
        // console.log('ritik');
        return res.status(200).json({message:"Website added successfully",website:newWebsite});

   }catch(e){

        console.error("Error while adding website",e);

        res.status(500).json({ message: 'Error creating user', error: e.message });
        res.status(500).json({ message: 'Error creating user', error: e.message });

   }

}

exports.deleteWebsite=async (req,res)=>{
    try{

        const {teamName,webId}=req.body;
        // console.log(teamName);
        // console.log(webId);
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

exports.getWebsitesOfTeam = async (req, res) => {
    try {
        const { teamName } = req.body;
        // console.log(req.body);
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
        console.log('Verifying website:', Domain, 'with siteId:', siteId);
        
        if (!Domain || !siteId) {
            return res.status(400).json({ message: "Domain and siteId are required" });
        }

        const targetScriptSrc = "https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js";
        
        // Try to access the website with HTTPS first, then fallback to HTTP
        let data;
        try {
            data = await axios.get(`https://${Domain}`, { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
        } catch (httpsError) {
            try {
                data = await axios.get(`http://${Domain}`, { 
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
            } catch (httpError) {
                console.error('Error accessing website:', httpError.message);
                return res.status(404).json({ message: "Could not access the website. Make sure it's publicly accessible." });
            }
        }

        const $ = cheerio.load(data.data);
        let foundScript = false;
        let foundSiteId = false;

        // Check for script tags with src attribute
        $('script').each((i, element) => {
            const script = $(element);
            
            // Check direct script inclusion
            if (script.attr('src') === targetScriptSrc) {
                foundScript = true;
                if (script.attr('site-id') === siteId) {
                    foundSiteId = true;
                }
                return false; // Exit the loop
            }
            
            // Check script content for dynamically created scripts
            const scriptContent = script.html() || '';
            
            // Check various patterns of dynamic script injection
            const patterns = [
                // Pattern 1: Direct script.src assignment
                new RegExp(`script\\.src\\s*=\\s*['"]${escapeRegExp(targetScriptSrc)}['"]`),
                
                // Pattern 2: setAttribute style
                new RegExp(`script\\.setAttribute\\(['"]src['"]\\s*,\\s*['"]${escapeRegExp(targetScriptSrc)}['"]\\)`),
                
                // Pattern 3: createElement style with multiple lines
                new RegExp(`createElement\\(['"](script|script)['"]\\)[\\s\\S]*?${escapeRegExp(targetScriptSrc)}`),
                
                // Pattern 4: URL as variable then assigned
                new RegExp(`${escapeRegExp(targetScriptSrc)}`),
                
                // Pattern 5: GTM variable reference
                new RegExp(`\\{\\{[^\\}]*CryptiqID[^\\}]*\\}\\}`),
                
                // Pattern 6: GTM variable with different naming
                new RegExp(`\\{\\{[^\\}]*SiteID[^\\}]*\\}\\}`),
                
                // Pattern 7: GTM direct value
                new RegExp(`dataLayer\\.push\\(\\s*\\{[^\\}]*${escapeRegExp(siteId)}[^\\}]*\\}\\s*\\)`)
            ];
            
            // Check if any pattern matches
            for (const pattern of patterns) {
                if (pattern.test(scriptContent)) {
                    foundScript = true;
                    
                    // Now check for site-id
                    const siteIdPatterns = [
                        // Pattern 1: Direct attribute assignment
                        new RegExp(`site-id['":]\\s*['"]${escapeRegExp(siteId)}['"]`),
                        
                        // Pattern 2: setAttribute style
                        new RegExp(`setAttribute\\(['"]site-id['"]\\s*,\\s*['"]${escapeRegExp(siteId)}['"]\\)`),
                        
                        // Pattern 3: As variable
                        new RegExp(`["']${escapeRegExp(siteId)}["']`),
                        
                        // Pattern 4: GTM variable reference
                        new RegExp(`\\{\\{[^\\}]*\\}\\}`)
                    ];
                    
                    for (const siteIdPattern of siteIdPatterns) {
                        if (siteIdPattern.test(scriptContent)) {
                            foundSiteId = true;
                            return false; // Exit the loop
                        }
                    }
                }
            }
        });

        // Additional checks for GTM implementations
        const checkForGTM = () => {
            // Check for Google Tag Manager script
            const hasGTM = $('script').filter((i, el) => {
                const src = $(el).attr('src') || '';
                return src.includes('googletagmanager.com/gtm.js') || 
                       src.includes('googletagmanager.com/gtag/js');
            }).length > 0;
            
            // If GTM is found, we'll be more lenient with verification
            if (hasGTM) {
                console.log('GTM script found on the page');
                // If we found the script but not the site ID, and GTM is present,
                // we'll assume the site ID might be set via GTM variables
                if (foundScript && !foundSiteId) {
                    console.log('GTM detected, assuming site-id is set via GTM variable');
                    foundSiteId = true;
                }
                
                // If we haven't found the script, but GTM is present,
                // we'll check for potential custom variable patterns
                if (!foundScript) {
                    // Look for potential dataLayer pushes
                    const dataLayerPushes = $('script').filter((i, el) => {
                        const content = $(el).html() || '';
                        return content.includes('dataLayer.push') || 
                               content.includes('cryptique') ||
                               content.includes(siteId);
                    }).length > 0;
                    
                    if (dataLayerPushes) {
                        console.log('GTM dataLayer pushes found, assuming script is loaded via GTM');
                        foundScript = true;
                        foundSiteId = true;
                    }
                }
            }
        };
        
        // Additional check for scripts that might be injected by frameworks like Next.js/React
        const htmlContent = $.html();
        if (!foundScript) {
            const scriptPatterns = [
                new RegExp(`["']${escapeRegExp(targetScriptSrc)}["']`),
                new RegExp(`src=["']${escapeRegExp(targetScriptSrc)}["']`)
            ];
            
            for (const pattern of scriptPatterns) {
                if (pattern.test(htmlContent)) {
                    foundScript = true;
                    break;
                }
            }
        }
        
        // If script is found but site-id wasn't found yet, do another pass for site-id in the full HTML
        if (foundScript && !foundSiteId) {
            const siteIdInHtml = new RegExp(`site-id=["']${escapeRegExp(siteId)}["']`).test(htmlContent) ||
                                 new RegExp(`["']site-id["']\\s*,\\s*["']${escapeRegExp(siteId)}["']`).test(htmlContent);
            if (siteIdInHtml) {
                foundSiteId = true;
            }
        }
        
        // Check for GTM implementation if we haven't confirmed both script and site-id
        if (!foundScript || !foundSiteId) {
            checkForGTM();
        }

        if (!foundScript) {
            console.log('Script not found on the page');
            return res.status(404).json({ message: "Cryptique analytics script not found on the page" });
        }

        if (!foundSiteId) {
            console.log('Site ID not found or does not match');
            return res.status(403).json({ message: "site-id does not match or is missing" });
        }

        // Update website as verified
        const updatedWebsite = await Website.findOneAndUpdate(
            { Domain },
            { $set: { isVerified: true } },
            { new: true }
        );
        console.log("Verification successful");
        return res.status(200).json({ 
            message: "Verification successful", 
            website: updatedWebsite 
        });

    } catch (e) {
        console.error('Verification error:', e);
        return res.status(500).json({ message: 'Verification failed', error: e.message});
    }
};

// Helper function to escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}