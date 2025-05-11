import React, { useState, useEffect } from 'react';
import { FiPlusCircle, FiEdit2, FiTrash2, FiEye, FiInfo, FiBarChart2 } from 'react-icons/fi';
import axiosInstance from '../../axiosInstance';
import './ConversionEvents.css';
import EventModal from './EventModal';
import CodeSnippetModal from './CodeSnippetModal';

const ConversionEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(localStorage.getItem('selectedTeam'));
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  
  // Load websites and events on mount or when team changes
  useEffect(() => {
    const fetchWebsitesAndEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get websites for the team
        const websiteResponse = await axiosInstance.get(`/website/team/${selectedTeam}`);
        
        if (websiteResponse.data && websiteResponse.data.websites) {
          setWebsites(websiteResponse.data.websites);
          
          // Select the first website by default if none selected
          if (!selectedWebsite && websiteResponse.data.websites.length > 0) {
            setSelectedWebsite(websiteResponse.data.websites[0].siteId);
            
            // Load events for the first website
            const eventsResponse = await axiosInstance.get(`/events/site/${websiteResponse.data.websites[0].siteId}`);
            if (eventsResponse.data && eventsResponse.data.events) {
              setEvents(eventsResponse.data.events);
            }
          } else if (selectedWebsite) {
            // Load events for the selected website
            const eventsResponse = await axiosInstance.get(`/events/site/${selectedWebsite}`);
            if (eventsResponse.data && eventsResponse.data.events) {
              setEvents(eventsResponse.data.events);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load websites and events. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWebsitesAndEvents();
  }, [selectedTeam, selectedWebsite]);
  
  // Handle website change
  const handleWebsiteChange = (e) => {
    setSelectedWebsite(e.target.value);
  };
  
  // Open create event modal
  const handleCreateEvent = () => {
    setCurrentEvent(null);
    setModalMode('create');
    setShowModal(true);
  };
  
  // Open edit event modal
  const handleEditEvent = (event) => {
    setCurrentEvent(event);
    setModalMode('edit');
    setShowModal(true);
  };
  
  // Show code snippet modal
  const handleViewCode = (event) => {
    setCurrentEvent(event);
    setShowCodeModal(true);
  };
  
  // Delete an event
  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await axiosInstance.delete(`/events/${eventId}`);
        
        // Update local state
        setEvents(events.filter(event => event._id !== eventId));
      } catch (err) {
        console.error('Error deleting event:', err);
        setError('Failed to delete event. Please try again.');
      }
    }
  };
  
  // Save an event (create or update)
  const handleSaveEvent = async (eventData) => {
    try {
      let response;
      
      if (modalMode === 'create') {
        // Add team and site IDs
        eventData.teamId = selectedTeam;
        eventData.siteId = selectedWebsite;
        
        response = await axiosInstance.post('/events', eventData);
        
        // Add to local state
        if (response.data && response.data.event) {
          setEvents([...events, response.data.event]);
        }
      } else {
        // Update existing event
        response = await axiosInstance.put(`/events/${currentEvent._id}`, eventData);
        
        // Update in local state
        if (response.data && response.data.event) {
          setEvents(events.map(event => 
            event._id === currentEvent._id ? response.data.event : event
          ));
        }
      }
      
      // Close modal
      setShowModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Failed to save event. Please try again.');
    }
  };
  
  // Group events by category
  const groupedEvents = events.reduce((groups, event) => {
    const category = event.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(event);
    return groups;
  }, {});
  
  return (
    <div className="conversion-events-container">
      <h1 className="page-title">Conversion Events</h1>
      
      <div className="page-description">
        <p>
          Create and manage custom events to track user interactions on your website.
          These events help you understand user behavior and measure conversions.
        </p>
      </div>
      
      <div className="controls">
        <div className="website-selector">
          <label htmlFor="website-select">Website:</label>
          <select 
            id="website-select"
            value={selectedWebsite || ''}
            onChange={handleWebsiteChange}
            disabled={websites.length === 0 || loading}
          >
            {websites.length === 0 ? (
              <option value="">No websites available</option>
            ) : (
              websites.map(website => (
                <option key={website.siteId} value={website.siteId}>
                  {website.Domain}
                </option>
              ))
            )}
          </select>
        </div>
        
        <button 
          className="create-button"
          onClick={handleCreateEvent}
          disabled={!selectedWebsite || loading}
        >
          <FiPlusCircle size={18} />
          <span>Create Event</span>
        </button>
      </div>
      
      {loading ? (
        <div className="loading-state">Loading events...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-message">
            <FiInfo size={32} />
            <h3>No events created yet</h3>
            <p>
              Start tracking user interactions by creating your first event.
              Click the "Create Event" button above to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="events-grid">
          {Object.entries(groupedEvents).map(([category, categoryEvents]) => (
            <div key={category} className="event-category">
              <h2>{category}</h2>
              
              <div className="events-list">
                {categoryEvents.map(event => (
                  <div key={event._id} className="event-card">
                    <div className="event-header">
                      <h3 className="event-name">{event.name}</h3>
                      <div className="event-type">{event.type}</div>
                    </div>
                    
                    <div className="event-description">
                      {event.description || 'No description provided'}
                    </div>
                    
                    <div className="event-details">
                      {event.selector && (
                        <div className="event-selector">
                          <span>Selector:</span> {event.selector}
                        </div>
                      )}
                      
                      {event.valueTracking && event.valueTracking.enabled && (
                        <div className="event-value">
                          <span>Tracks value:</span> {event.valueTracking.currencyCode}
                        </div>
                      )}
                      
                      {event.abTesting && event.abTesting.enabled && (
                        <div className="event-ab-test">
                          <span>A/B Testing:</span> {event.abTesting.variants.length} variants
                        </div>
                      )}
                    </div>
                    
                    <div className="event-actions">
                      <button 
                        className="action-button view-code"
                        onClick={() => handleViewCode(event)}
                        title="View implementation code"
                      >
                        <FiEye size={18} />
                      </button>
                      
                      <button 
                        className="action-button analytics"
                        onClick={() => window.location.href = `/analytics/events/${event._id}`}
                        title="View analytics"
                      >
                        <FiBarChart2 size={18} />
                      </button>
                      
                      <button 
                        className="action-button edit"
                        onClick={() => handleEditEvent(event)}
                        title="Edit event"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      
                      <button 
                        className="action-button delete"
                        onClick={() => handleDeleteEvent(event._id)}
                        title="Delete event"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Event creation/editing modal */}
      {showModal && (
        <EventModal
          mode={modalMode}
          event={currentEvent}
          onSave={handleSaveEvent}
          onCancel={() => setShowModal(false)}
        />
      )}
      
      {/* Code snippet modal */}
      {showCodeModal && (
        <CodeSnippetModal
          event={currentEvent}
          website={websites.find(w => w.siteId === selectedWebsite)}
          onClose={() => setShowCodeModal(false)}
        />
      )}
    </div>
  );
};

export default ConversionEventsPage; 