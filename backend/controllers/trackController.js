// Add imports for event tracking
const EventLog = require('../models/eventLog');
const { v4: uuidv4 } = require('uuid');

exports.track = async (req, res) => {
  try {
    // Extract tracking data
    const { 
      siteId, 
      userId, 
      sessionId, 
      url, 
      referrer, 
      pageTitle, 
      device,
      screen,
      browser,
      os,
      ipAddress,
      country,
      cityName,
      events
    } = req.body;

    // Validate required data
    if (!siteId || !url) {
      return res.status(400).json({ 
        message: 'Missing required fields.',
        required: ['siteId', 'url']
      });
    }

    // Gather analytics data as before
    // ... existing code for analytics tracking ...

    // Additionally, if events are included in the payload, log them
    if (events && Array.isArray(events) && events.length > 0) {
      try {
        // Find the website to get the teamId
        const website = await Website.findOne({ siteId });
        
        if (website) {
          const teamId = website.teamId;
          
          // Process events
          const eventLogs = events.map(event => {
            return new EventLog({
              eventId: event.id || uuidv4(),
              name: event.name,
              category: event.category || 'custom',
              type: event.type || 'custom',
              sessionId: sessionId || 'unknown',
              userId: userId || 'unknown',
              siteId,
              teamId,
              timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
              value: event.value || null,
              currency: event.currency || 'USD',
              abVariant: event.abVariant || null,
              funnelId: event.funnelId || null,
              funnelStep: event.funnelStep || null,
              
              // Page info
              pageUrl: url,
              pagePath: new URL(url).pathname,
              pageTitle: pageTitle || '',
              
              // Custom metadata
              metadata: event.metadata || {},
              
              // Device info
              device: {
                type: device || 'unknown',
                os: os || '',
                browser: browser || '',
                resolution: screen || ''
              },
              
              // Location info if available
              country: country || 'Unknown',
              city: cityName || '',
              
              createdAt: new Date()
            });
          });
          
          // Save events
          if (eventLogs.length > 0) {
            await EventLog.insertMany(eventLogs);
            console.log(`Logged ${eventLogs.length} events for site ${siteId}`);
          }
        }
      } catch (eventError) {
        // Log but don't fail the request
        console.error('Error logging events:', eventError);
      }
    }

    // Send success response
    res.status(200).json({ 
      status: 'success',
      message: 'Analytics data received successfully.'
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({ 
      message: 'An error occurred while processing analytics data.'
    });
  }
}; 