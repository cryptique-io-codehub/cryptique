const express = require('express');

const {addWebsite,deleteWebsite,verify}=require("../controllers/websiteController");

const router = express.Router();

router.post('/create',addWebsite);
router.post('/delete',deleteWebsite);
router.post('/verify',verify);
module.exports = router;