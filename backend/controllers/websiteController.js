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

        // The limit checking is now handled by the middleware
        // No need to check limits here

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

        res.status(500).json({ message: 'Error adding website', error: e.message });

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
        const teamName = req.params.teamName;
        console.log("Getting websites for team:", teamName);
        
        if (!teamName) return res.status(400).json({ message: "Team name is required" });

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
                
                // Even if we can't access the website directly, check if we have analytics data
                // which would confirm the script is working
                const Analytics = require('../models/analytics');
                const analyticsData = await Analytics.findOne({ siteId: siteId });
                
                if (analyticsData && analyticsData.totalVisitors > 0) {
                    console.log('Website not accessible, but analytics data found, verifying...');
                    // Update website as verified since we have analytics data
                    const updatedWebsite = await Website.findOneAndUpdate(
                        { siteId: siteId },
                        { 
                            $set: { 
                                isVerified: true,
                                analytics: analyticsData._id 
                            } 
                        },
                        { new: true }
                    );
                    
                    if (!updatedWebsite) {
                        console.log('Website not found with siteId:', siteId);
                        return res.status(404).json({ message: "Website not found with the provided siteId" });
                    }
                    
                    console.log("Verification successful via analytics data");
                    return res.status(200).json({ 
                        message: "Verification successful via analytics data", 
                        website: updatedWebsite 
                    });
                } else {
                    return res.status(404).json({ message: "Could not access the website. Make sure it's publicly accessible." });
                }
            }
        }

        const $ = cheerio.load(data.data);
        let foundScript = false;
        let foundSiteId = false;
        
        // First, check if this is a GTM implementation
        // Check for Google Tag Manager script
        const gtmScripts = $('script:contains("googletagmanager")');
        const hasGTM = gtmScripts.length > 0 || 
                       data.data.includes('dataLayer') || 
                       data.data.includes('GTM-');
        
        // Store the full HTML for pattern matching (especially important for GTM)
        const htmlContent = data.data;
        
        // Function to check for GTM implementation specifically
        const checkForGTM = () => {
            // Look for GTM patterns in the HTML content
            const gtmPatterns = [
                /googletagmanager\.com\/gtm\.js/i,
                /googletagmanager\.com\/gtag\/js/i,
                /new Date\(\)\.getTime\(\),event:'gtm\./i,
                /dataLayer\.push\(/i,
                /GTM-[A-Z0-9]{5,7}/i
            ];
            
            // If GTM is found, look for Cryptique patterns in the HTML
            if (gtmPatterns.some(pattern => pattern.test(htmlContent))) {
                console.log('GTM implementation detected, checking for Cryptique script in GTM');
                
                // Look for script patterns that might indicate our script is loaded through GTM
                const cryptiquePatterns = [
                    /cryptique\.io/i,
                    /cryptique.*script/i,
                    /CryptiqueSDK/i,
                    new RegExp(`site-id=['"\\s]*${escapeRegExp(siteId)}['"\\s]*`, 'i'),
                    new RegExp(`${escapeRegExp(siteId)}`, 'i')
                ];
                
                // If any Cryptique pattern is found, consider the script present
                if (cryptiquePatterns.some(pattern => pattern.test(htmlContent))) {
                    console.log('Cryptique script markers found in GTM implementation');
                    foundScript = true;
                    
                    // Check for site ID specifically
                    const siteIdPatterns = [
                        new RegExp(`site-id=['"\\s]*${escapeRegExp(siteId)}['"\\s]*`, 'i'),
                        new RegExp(`["']${escapeRegExp(siteId)}["']`, 'i')
                    ];
                    
                    if (siteIdPatterns.some(pattern => pattern.test(htmlContent))) {
                        console.log('Site ID found in GTM implementation');
                        foundSiteId = true;
                    }
                }
            }
        };
        
        // Check for direct script implementation first
        $('script').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && src.includes("cryptique")) {
                foundScript = true;
                console.log('Found Cryptique script:', src);
                
                // Check if the script has the correct site ID
                const scriptContent = $(elem).toString();
                if (scriptContent.includes(`site-id="${siteId}"`) || 
                    scriptContent.includes(`site-id='${siteId}'`)) {
                    foundSiteId = true;
                    console.log('Found correct site ID in script tag');
                }
            }
        });
        
        // For inline scripts that might load our script
        $('script:not([src])').each((i, elem) => {
            const scriptContent = $(elem).html();
            if (scriptContent && 
                (scriptContent.includes("cryptique") || 
                 scriptContent.includes("CryptiqueSDK"))) {
                foundScript = true;
                console.log('Found Cryptique reference in inline script');
                
                // Check for site ID in the inline script
                if (scriptContent.includes(siteId)) {
                    foundSiteId = true;
                    console.log('Found site ID in inline script');
                }
            }
        });
        
        // If script is found but site-id wasn't found yet, do another pass for site-id in the full HTML
        if (foundScript && !foundSiteId) {
            const siteIdInHtml = new RegExp(`site-id=["']${escapeRegExp(siteId)}["']`).test(htmlContent) ||
                                 new RegExp(`["']site-id["']\\s*,\\s*["']${escapeRegExp(siteId)}["']`).test(htmlContent);
            if (siteIdInHtml) {
                foundSiteId = true;
                console.log('Found site ID in HTML content');
            }
        }
        
        // Check for the script patterns in the full HTML if not found yet
        if (!foundScript) {
            const scriptPatterns = [
                new RegExp(`["']${escapeRegExp(targetScriptSrc)}["']`),
                new RegExp(`src=["']${escapeRegExp(targetScriptSrc)}["']`),
                /cryptique.*script/i,
                /CryptiqueSDK/i
            ];
            
            for (const pattern of scriptPatterns) {
                if (pattern.test(htmlContent)) {
                    foundScript = true;
                    console.log('Found script pattern in HTML content');
                    break;
                }
            }
        }
        
        // Check for GTM implementation if we haven't confirmed both script and site-id
        if (hasGTM && (!foundScript || !foundSiteId)) {
            checkForGTM();
        }
        
        // SPECIAL CASE: Directly check for analytics data presence
        // If we have analytics data flowing but can't detect the script, we can still verify
        if (!foundScript || !foundSiteId) {
            try {
                // Check if we have analytics data for this siteId first
                const Analytics = require('../models/analytics');
                const analytics = await Analytics.findOne({ siteId: siteId });
                
                if (analytics && analytics.totalVisitors > 0) {
                    console.log('Analytics data found, overriding script detection');
                    foundScript = true;
                    foundSiteId = true;
                    
                    // Find website and update analytics reference if needed
                    const website = await Website.findOne({ siteId: siteId });
                    if (website && (!website.analytics || !website.analytics.equals(analytics._id))) {
                        // Update the analytics reference
                        website.analytics = analytics._id;
                        await website.save();
                        console.log('Updated website with analytics reference');
                    }
                }
            } catch (analyticsError) {
                console.error('Error checking analytics data:', analyticsError);
                // Continue with normal verification - don't fail because of this check
            }
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
            { siteId: siteId },  // Use siteId for finding website - more reliable than Domain alone
            { $set: { isVerified: true } },
            { new: true }
        );
        
        if (!updatedWebsite) {
            console.log('Website not found with siteId:', siteId);
            return res.status(404).json({ message: "Website not found with the provided siteId" });
        }
        
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

// Helper function to get plan limits
function getPlanLimits(plan) {
    const SUBSCRIPTION_PLANS = {
        'offchain': {
            websites: 1,
            smartContracts: 0,
            apiCalls: 0,
            teamMembers: 1
        },
        'basic': {
            websites: 2,
            smartContracts: 1,
            apiCalls: 40000,
            teamMembers: 2
        },
        'pro': {
            websites: 5,
            smartContracts: 5,
            apiCalls: 150000,
            teamMembers: 5
        },
        'enterprise': {
            websites: 100, // High value for enterprise, can be customized
            smartContracts: 100,
            apiCalls: 1000000,
            teamMembers: 100
        }
    };

    return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['offchain'];
}

// Helper function to get upgrade options
function getUpgradeOptions(currentPlan) {
    const planHierarchy = ['offchain', 'basic', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    
    // If already on enterprise or an invalid plan, no upgrade options
    if (currentIndex === -1 || currentPlan === 'enterprise') {
        return [];
    }
    
    // Return next plan up as an upgrade option
    const nextPlan = planHierarchy[currentIndex + 1];
    
    if (nextPlan) {
        return [{
            plan: nextPlan,
            websites: getPlanLimits(nextPlan).websites,
            message: `Upgrade to ${nextPlan} to add more websites`
        }];
    }
    
    return [];
}