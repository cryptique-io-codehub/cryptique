const express = require('express');

const {addWebsite,deleteWebsite,verify}=require("../controllers/websiteController");

const router = express.Router();

router.post('/create',addWebsite);
router.get('/delete',deleteWebsite);
router.post('/verify',verify);
module.exports = router;