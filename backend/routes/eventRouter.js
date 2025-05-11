const express = require('express');
const router = express.Router();
const EventDefinition = require('../models/eventDefinition');
const EventLog = require('../models/eventLog');
const { verifyToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Create a new event definition
router.post('/', async (req, res) => {
  try {
    const {
      name, category, type, description, selector, trigger,
      metadata, valueTracking, funnelSteps, abTesting, siteId, teamId
    } = req.body;

    // Validate required fields
    if (!name || !siteId || !teamId) {
      return res.status(400).json({ 
        error: true, 
        message: 'Missing required fields',
        requiredFields: ['name', 'siteId', 'teamId']
      });
    }

    // Check for duplicate event name for this site
    const existingEvent = await EventDefinition.findOne({ 
      name, 
      siteId,
      active: true
    });

    if (existingEvent) {
      return res.status(409).json({ 
        error: true, 
        message: 'An event with this name already exists for this site' 
      });
    }

    // Create event definition
    const eventDefinition = new EventDefinition({
      name,
      category: category || 'custom',
      type: type || 'custom',
      description,
      selector: selector || '',
      trigger: trigger || 'click',
      metadata: metadata || [],
      valueTracking: valueTracking || { enabled: false },
      funnelSteps: funnelSteps || [],
      abTesting: abTesting || { enabled: false },
      siteId,
      teamId,
      createdBy: req.userId,
      active: true
    });

    // Save to database
    await eventDefinition.save();

    res.status(201).json({
      error: false,
      message: 'Event definition created successfully',
      eventId: eventDefinition._id,
      event: eventDefinition
    });
  } catch (error) {
    console.error('Error creating event definition:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to create event definition',
      details: error.message
    });
  }
});

// Get all events for a website
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { active = true } = req.query;

    // Convert active to boolean
    const isActive = active === 'true' || active === true;

    // Get events for this site
    const events = await EventDefinition.find({ 
      siteId, 
      active: isActive
    }).sort({ createdAt: -1 });

    res.json({
      error: false,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get events',
      details: error.message
    });
  }
});

// Get all events for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { active = true, siteId } = req.query;

    // Convert active to boolean
    const isActive = active === 'true' || active === true;

    // Build query
    const query = { teamId, active: isActive };
    if (siteId) query.siteId = siteId;

    // Get events for this team
    const events = await EventDefinition.find(query).sort({ createdAt: -1 });

    res.json({
      error: false,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error getting team events:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get team events',
      details: error.message
    });
  }
});

// Get a single event by ID
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await EventDefinition.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        error: true, 
        message: 'Event not found' 
      });
    }

    res.json({
      error: false,
      event
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get event',
      details: error.message
    });
  }
});

// Update an event
router.put('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      name, category, type, description, selector, trigger,
      metadata, valueTracking, funnelSteps, abTesting, active
    } = req.body;

    // Find the event
    const event = await EventDefinition.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        error: true, 
        message: 'Event not found' 
      });
    }

    // Check for duplicate name if name changed
    if (name && name !== event.name) {
      const duplicate = await EventDefinition.findOne({
        name,
        siteId: event.siteId,
        _id: { $ne: eventId }, // Exclude current event
        active: true
      });

      if (duplicate) {
        return res.status(409).json({
          error: true,
          message: 'An event with this name already exists for this site'
        });
      }
    }

    // Update fields
    if (name) event.name = name;
    if (category) event.category = category;
    if (type) event.type = type;
    if (description !== undefined) event.description = description;
    if (selector !== undefined) event.selector = selector;
    if (trigger) event.trigger = trigger;
    if (metadata) event.metadata = metadata;
    if (valueTracking) event.valueTracking = valueTracking;
    if (funnelSteps) event.funnelSteps = funnelSteps;
    if (abTesting) event.abTesting = abTesting;
    if (active !== undefined) event.active = active;

    // Update timestamp
    event.updatedAt = new Date();

    // Save changes
    await event.save();

    res.json({
      error: false,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to update event',
      details: error.message
    });
  }
});

// Delete an event (soft delete)
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await EventDefinition.findById(eventId);

    if (!event) {
      return res.status(404).json({ 
        error: true, 
        message: 'Event not found' 
      });
    }

    // Soft delete by setting active to false
    event.active = false;
    event.updatedAt = new Date();
    await event.save();

    res.json({
      error: false,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to delete event',
      details: error.message
    });
  }
});

// Get event logs for a website
router.get('/logs/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { 
      name, category, userId, fromDate, toDate, 
      limit = 100, page = 1, sort = 'desc'
    } = req.query;

    // Build query
    const query = { siteId };
    if (name) query.name = name;
    if (category) query.category = category;
    if (userId) query.userId = userId;

    // Date range
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = new Date(fromDate);
      if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort === 'asc' ? 1 : -1;

    // Get logs
    const logs = await EventLog.find(query)
      .sort({ timestamp: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await EventLog.countDocuments(query);

    res.json({
      error: false,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      logs
    });
  } catch (error) {
    console.error('Error getting event logs:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get event logs',
      details: error.message
    });
  }
});

// Get event logs for a user journey
router.get('/logs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      sessionId, fromDate, toDate, 
      limit = 100, page = 1 
    } = req.query;

    // Build query
    const query = { userId };
    if (sessionId) query.sessionId = sessionId;

    // Date range
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = new Date(fromDate);
      if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get logs
    const logs = await EventLog.find(query)
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await EventLog.countDocuments(query);

    res.json({
      error: false,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      logs
    });
  } catch (error) {
    console.error('Error getting user event logs:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get user event logs',
      details: error.message
    });
  }
});

// Get funnel analytics
router.get('/funnels/:funnelId/analytics', async (req, res) => {
  try {
    const { funnelId } = req.params;
    const { fromDate, toDate } = req.query;

    // Get all events in this funnel
    const funnelEvents = await EventDefinition.find({
      'funnelSteps.0': { $exists: true },
      active: true
    }).sort({ 'funnelSteps.position': 1 });

    if (funnelEvents.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Funnel not found or has no steps'
      });
    }

    // Build query for logs
    const query = { funnelId };

    // Date range
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = new Date(fromDate);
      if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    // Get all funnel step logs
    const logs = await EventLog.find(query).sort({ 
      userId: 1, 
      funnelStep: 1, 
      timestamp: 1 
    });

    // Group by funnel step
    const stepCounts = {};
    const usersByStep = {};
    
    // Initialize counts
    funnelEvents.forEach(event => {
      event.funnelSteps.forEach(step => {
        stepCounts[step.position] = 0;
        usersByStep[step.position] = new Set();
      });
    });
    
    // Count users at each step
    logs.forEach(log => {
      if (log.funnelStep && stepCounts[log.funnelStep] !== undefined) {
        usersByStep[log.funnelStep].add(log.userId);
      }
    });
    
    // Convert sets to counts
    Object.keys(usersByStep).forEach(step => {
      stepCounts[step] = usersByStep[step].size;
    });
    
    // Calculate conversion rates
    const conversionRates = {};
    const sortedSteps = Object.keys(stepCounts).sort((a, b) => a - b);
    
    if (sortedSteps.length > 0) {
      const firstStep = sortedSteps[0];
      const entryCount = stepCounts[firstStep] || 0;
      
      sortedSteps.forEach(step => {
        const count = stepCounts[step] || 0;
        conversionRates[step] = entryCount > 0 ? count / entryCount : 0;
      });
    }

    res.json({
      error: false,
      funnelId,
      steps: funnelEvents.map(event => ({
        eventId: event._id,
        name: event.name,
        steps: event.funnelSteps
      })),
      analytics: {
        totalSteps: sortedSteps.length,
        stepCounts,
        uniqueUsers: Object.keys(usersByStep).reduce((total, step) => {
          return total + usersByStep[step].size;
        }, 0),
        conversionRates
      }
    });
  } catch (error) {
    console.error('Error getting funnel analytics:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get funnel analytics',
      details: error.message
    });
  }
});

// Get A/B test results
router.get('/ab-tests/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;
    const { siteId, fromDate, toDate } = req.query;

    if (!siteId) {
      return res.status(400).json({
        error: true,
        message: 'siteId is required'
      });
    }

    // Find events with this A/B test
    const events = await EventDefinition.find({
      'abTesting.enabled': true,
      siteId
    });

    if (events.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'No A/B tests found for this site'
      });
    }

    // Build query for logs
    const query = { 
      siteId,
      abVariant: { $ne: null }
    };

    // Date range
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = new Date(fromDate);
      if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    // Get logs with A/B variants
    const logs = await EventLog.find(query);

    // Group by variant
    const variantResults = {};
    const usersByVariant = {};
    const conversionsByVariant = {};

    // Initialize results structure
    events.forEach(event => {
      if (event.abTesting && event.abTesting.variants) {
        event.abTesting.variants.forEach(variant => {
          variantResults[variant.id] = {
            id: variant.id,
            name: variant.name,
            impressions: 0,
            conversions: 0,
            conversionRate: 0,
            values: []
          };
          usersByVariant[variant.id] = new Set();
          conversionsByVariant[variant.id] = new Set();
        });
      }
    });

    // Process logs
    logs.forEach(log => {
      if (log.abVariant && variantResults[log.abVariant]) {
        // Count impressions
        if (log.type === 'impression' || log.type === 'view') {
          variantResults[log.abVariant].impressions++;
          usersByVariant[log.abVariant].add(log.userId);
        }
        
        // Count conversions
        if (log.type === 'conversion' || log.category === 'conversion') {
          variantResults[log.abVariant].conversions++;
          conversionsByVariant[log.abVariant].add(log.userId);
          
          // Track values for revenue tracking
          if (log.value) {
            variantResults[log.abVariant].values.push(log.value);
          }
        }
      }
    });

    // Calculate averages and rates
    Object.keys(variantResults).forEach(variant => {
      const result = variantResults[variant];
      
      // Unique users
      result.uniqueUsers = usersByVariant[variant].size;
      
      // Unique conversions
      result.uniqueConversions = conversionsByVariant[variant].size;
      
      // Conversion rate
      result.conversionRate = result.impressions > 0 ? 
        result.conversions / result.impressions : 0;
      
      // Average value
      if (result.values.length > 0) {
        const sum = result.values.reduce((a, b) => a + b, 0);
        result.averageValue = sum / result.values.length;
        result.totalValue = sum;
      } else {
        result.averageValue = 0;
        result.totalValue = 0;
      }
    });

    res.json({
      error: false,
      testId,
      siteId,
      variants: Object.values(variantResults),
      events: events.map(e => ({
        id: e._id,
        name: e.name,
        abTesting: e.abTesting
      }))
    });
  } catch (error) {
    console.error('Error getting A/B test results:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to get A/B test results',
      details: error.message
    });
  }
});

module.exports = router; 