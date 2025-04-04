const express = require('express');

const {addWebsite,deleteWebsite,verify, getWebsitesOfTeam}=require("../controllers/websiteController");

const router = express.Router();

router.post('/create',addWebsite);
router.post('/delete',deleteWebsite);
router.post('/verify',verify);
router.post('/getWebsites',getWebsitesOfTeam);

module.exports = router;