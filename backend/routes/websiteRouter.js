const express = require('express');

const {addWebsite,deleteWebsite,verify, getWebsitesOfTeam}=require("../controllers/websiteController");

const router = express.Router();

router.post('/create',addWebsite);
router.post('/delete',deleteWebsite);
router.post('/verify',verify);
router.get('/team/:teamName',getWebsitesOfTeam);

// Ensure the routes are accessible
router.get('/routes', (req, res) => {
  const routes = router.stack.map(layer => {
    return {
      path: layer.route?.path,
      methods: layer.route?.methods ? Object.keys(layer.route.methods) : []
    };
  }).filter(route => route.path);
  
  res.json({
    message: 'Website router routes',
    routes
  });
});

module.exports=router;