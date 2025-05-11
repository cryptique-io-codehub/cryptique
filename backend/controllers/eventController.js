const EventLog = require('../models/eventLog');
const EventDefinition = require('../models/eventDefinition');
const Website = require('../models/website');
const Team = require('../models/team');
const { v4: uuidv4 } = require('uuid');

// Process and log events from SDK
exports.trackEvent = async (req, res) => {
  try {
    const { 
      siteId, 
      userId, 
      sessionId, 
      name, 
      category, 
      type, 
      timestamp,
      value,
      currency,
      abVariant,
      funnelId,
      funnelStep,
      metadata,
      page,
      device,
      location
    } = req.body;

    // Validate required fields
    if (!siteId || !userId || !sessionId || !name) {
      return res.status(400).json({
        error: true,
        message: 'Missing required fields',
        requiredFields: ['siteId', 'userId', 'sessionId', 'name']
      });
    }

    // Find website and team for the siteId
    const website = await Website.findOne({ siteId });
    
    if (!website) {
      return res.status(404).json({
        error: true,
        message: 'Website not found'
      });
    }

    // Generate event ID if not provided
    const eventId = uuidv4();

    // Create event log
    const eventLog = new EventLog({
      eventId,
      name,
      category: category || 'custom',
      type: type || 'custom',
      sessionId,
      userId,
      siteId,
      teamId: website.teamId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      value: value || null,
      currency: currency || 'USD',
      abVariant: abVariant || null,
      funnelId: funnelId || null,
      funnelStep: funnelStep || null,
      
      // Page info
      pageUrl: page?.url || '',
      pagePath: page?.path || '',
      pageTitle: page?.title || '',
      pageVisitTimestamp: page?.timestamp ? new Date(page.timestamp) : null,
      
      // Custom metadata
      metadata: metadata || {},
      
      // Device info
      device: {
        type: device?.type || 'unknown',
        os: device?.os || '',
        browser: device?.browser || '',
        resolution: device?.resolution || ''
      },
      
      // Location info if available
      country: location?.country || 'Unknown',
      city: location?.city || '',
      region: location?.region || '',
      
      createdAt: new Date()
    });

    await eventLog.save();

    // Success response
    res.status(201).json({
      error: false,
      message: 'Event tracked successfully',
      eventId
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    // Don't return detailed error to client for security
    res.status(500).json({
      error: true,
      message: 'Failed to track event'
    });
  }
};

// Batch tracking for multiple events
exports.trackEvents = async (req, res) => {
  try {
    const { events, siteId } = req.body;

    if (!Array.isArray(events) || events.length === 0 || !siteId) {
      return res.status(400).json({
        error: true,
        message: 'Invalid request format or empty events array'
      });
    }

    // Find website
    const website = await Website.findOne({ siteId });
    
    if (!website) {
      return res.status(404).json({
        error: true,
        message: 'Website not found'
      });
    }

    // Process events in parallel (can be optimized with bulk insert)
    const eventLogs = events.map(event => {
      return new EventLog({
        eventId: event.eventId || uuidv4(),
        name: event.name,
        category: event.category || 'custom',
        type: event.type || 'custom',
        sessionId: event.sessionId,
        userId: event.userId,
        siteId,
        teamId: website.teamId,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        value: event.value || null,
        currency: event.currency || 'USD',
        abVariant: event.abVariant || null,
        funnelId: event.funnelId || null,
        funnelStep: event.funnelStep || null,
        
        // Page info
        pageUrl: event.page?.url || '',
        pagePath: event.page?.path || '',
        pageTitle: event.page?.title || '',
        pageVisitTimestamp: event.page?.timestamp ? new Date(event.page.timestamp) : null,
        
        // Custom metadata
        metadata: event.metadata || {},
        
        // Device info
        device: {
          type: event.device?.type || 'unknown',
          os: event.device?.os || '',
          browser: event.device?.browser || '',
          resolution: event.device?.resolution || ''
        },
        
        // Location info if available
        country: event.location?.country || 'Unknown',
        city: event.location?.city || '',
        region: event.location?.region || '',
        
        createdAt: new Date()
      });
    });

    // Save all events
    await EventLog.insertMany(eventLogs);

    // Success response
    res.status(201).json({
      error: false,
      message: 'Events tracked successfully',
      count: events.length
    });
  } catch (error) {
    console.error('Error batch tracking events:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to track events'
    });
  }
};

// Get event configuration for a website
exports.getEventConfig = async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!siteId) {
      return res.status(400).json({
        error: true,
        message: 'Site ID is required'
      });
    }

    // Get all active events for this site
    const events = await EventDefinition.find({
      siteId,
      active: true
    });

    // Format events for SDK consumption
    const eventConfig = events.map(event => ({
      id: event._id,
      name: event.name,
      category: event.category,
      type: event.type,
      selector: event.selector,
      trigger: event.trigger,
      
      // Properties for dynamic data extraction
      properties: {},
      dynamicProperties: event.metadata.reduce((acc, meta) => {
        if (meta.source && meta.source !== 'custom') {
          acc[meta.key] = meta.source;
        }
        return acc;
      }, {}),
      
      // Value tracking
      valueTracking: event.valueTracking.enabled ? {
        source: event.valueTracking.source,
        defaultValue: event.valueTracking.defaultValue,
        currency: event.valueTracking.currencyCode
      } : null,
      
      // Funnel data
      funnel: event.funnelSteps && event.funnelSteps.length > 0 ? {
        id: event._id, // Using event ID as funnel ID
        steps: event.funnelSteps.map(step => ({
          position: step.position,
          name: step.name,
          isRequired: step.isRequired
        }))
      } : null,
      
      // A/B testing
      abTest: event.abTesting?.enabled ? {
        id: event._id, // Using event ID as test ID
        variants: event.abTesting.variants.map(v => v.id),
        variantNames: event.abTesting.variants.reduce((acc, v) => {
          acc[v.id] = v.name;
          return acc;
        }, {})
      } : null
    }));

    res.json({
      error: false,
      siteId,
      config: eventConfig
    });
  } catch (error) {
    console.error('Error getting event config:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get event configuration'
    });
  }
}; 