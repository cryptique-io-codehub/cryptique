const express = require('express');
const router = express.Router();
const zohoService = require('../services/zohoService');
const Team = require('../models/team');

// Create or update contact in Zoho CRM
router.post('/contact', async (req, res) => {
  try {
    const { 
      teamId, 
      firstName, 
      lastName, 
      email, 
      companyName, 
      phone, 
      address, 
      city, 
      zipCode, 
      country 
    } = req.body;
    
    if (!teamId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get team to check if they already have a contact
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let contactId = team.billing?.zohoContactId;
    let result;

    // Prepare contact data
    const contactData = {
      firstName: firstName || 'Team',
      lastName: lastName || 'Member',
      email,
      companyName: companyName || team.name,
      phone: phone || '',
      address: address || team.billing?.address || '',
      city: city || team.billing?.city || '',
      zipCode: zipCode || team.billing?.zipCode || '',
      country: country || team.billing?.country || '',
      teamName: team.name
    };

    if (contactId) {
      // Update existing contact
      result = await zohoService.updateContact(contactId, {
        First_Name: contactData.firstName,
        Last_Name: contactData.lastName,
        Email: contactData.email,
        Company: contactData.companyName,
        Phone: contactData.phone,
        Mailing_Street: contactData.address,
        Mailing_City: contactData.city,
        Mailing_Zip: contactData.zipCode,
        Mailing_Country: contactData.country
      });
    } else {
      // Create new contact
      contactId = await zohoService.createContact(contactData);
      
      // Save the contact ID to the team
      team.billing = {
        ...team.billing,
        zohoContactId: contactId
      };
      await team.save();
      
      result = { id: contactId, action: 'created' };
    }

    res.json({ 
      success: true, 
      contactId,
      result
    });
  } catch (error) {
    console.error('Error managing contact:', error);
    res.status(500).json({ error: error.message || 'Failed to manage contact' });
  }
});

// Get contact details from Zoho CRM
router.get('/contact/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Get team
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const contactId = team.billing?.zohoContactId;
    
    if (!contactId) {
      return res.status(404).json({ error: 'No CRM contact found for this team' });
    }

    const contactDetails = await zohoService.getContact(contactId);
    res.json(contactDetails);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch contact' });
  }
});

module.exports = router; 