import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash } from 'react-icons/fi';
import './EventModal.css';

const EventModal = ({ mode, event, onSave, onCancel }) => {
  // State for basic event info
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [type, setType] = useState('custom');
  const [description, setDescription] = useState('');
  const [selector, setSelector] = useState('');
  const [trigger, setTrigger] = useState('click');
  
  // State for advanced features
  const [metadata, setMetadata] = useState([]);
  const [valueTracking, setValueTracking] = useState({ enabled: false, currencyCode: 'USD', source: '', defaultValue: 0 });
  const [funnelSteps, setFunnelSteps] = useState([]);
  const [abTesting, setAbTesting] = useState({ enabled: false, variants: [] });
  
  // Populate form when editing an event
  useEffect(() => {
    if (mode === 'edit' && event) {
      setName(event.name || '');
      setCategory(event.category || 'custom');
      setType(event.type || 'custom');
      setDescription(event.description || '');
      setSelector(event.selector || '');
      setTrigger(event.trigger || 'click');
      
      // Set advanced features if they exist
      if (event.metadata) setMetadata(event.metadata);
      if (event.valueTracking) setValueTracking(event.valueTracking);
      if (event.funnelSteps) setFunnelSteps(event.funnelSteps);
      if (event.abTesting) setAbTesting(event.abTesting);
    }
  }, [mode, event]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      alert('Event name is required');
      return;
    }
    
    // Prepare event data
    const eventData = {
      name,
      category,
      type,
      description,
      selector,
      trigger,
      metadata,
      valueTracking,
      funnelSteps,
      abTesting
    };
    
    // Send to parent component
    onSave(eventData);
  };
  
  // Add a new metadata field
  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', source: 'custom', required: false }]);
  };
  
  // Update a metadata field
  const updateMetadataField = (index, field, value) => {
    const updatedMetadata = [...metadata];
    updatedMetadata[index][field] = value;
    setMetadata(updatedMetadata);
  };
  
  // Remove a metadata field
  const removeMetadataField = (index) => {
    const updatedMetadata = [...metadata];
    updatedMetadata.splice(index, 1);
    setMetadata(updatedMetadata);
  };
  
  // Add a funnel step
  const addFunnelStep = () => {
    const newPosition = funnelSteps.length > 0 
      ? Math.max(...funnelSteps.map(step => step.position)) + 1 
      : 1;
    
    setFunnelSteps([
      ...funnelSteps, 
      { position: newPosition, name: '', isRequired: true }
    ]);
  };
  
  // Update a funnel step
  const updateFunnelStep = (index, field, value) => {
    const updatedSteps = [...funnelSteps];
    updatedSteps[index][field] = value;
    setFunnelSteps(updatedSteps);
  };
  
  // Remove a funnel step
  const removeFunnelStep = (index) => {
    const updatedSteps = [...funnelSteps];
    updatedSteps.splice(index, 1);
    setFunnelSteps(updatedSteps);
  };
  
  // Add an A/B test variant
  const addAbTestVariant = () => {
    const newVariant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${abTesting.variants.length + 1}`,
      weight: 50
    };
    
    setAbTesting({
      ...abTesting,
      enabled: true,
      variants: [...abTesting.variants, newVariant]
    });
  };
  
  // Update an A/B test variant
  const updateAbTestVariant = (index, field, value) => {
    const updatedVariants = [...abTesting.variants];
    updatedVariants[index][field] = value;
    setAbTesting({
      ...abTesting,
      variants: updatedVariants
    });
  };
  
  // Remove an A/B test variant
  const removeAbTestVariant = (index) => {
    const updatedVariants = [...abTesting.variants];
    updatedVariants.splice(index, 1);
    setAbTesting({
      ...abTesting,
      variants: updatedVariants,
      enabled: updatedVariants.length > 0
    });
  };
  
  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Event' : 'Edit Event'}</h2>
          <button className="close-button" onClick={onCancel}>
            <FiX size={24} />
          </button>
        </div>
        
        <form className="event-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="event-name">Event Name *</label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., button_click, form_submit, purchase"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event-category">Category</label>
                <select
                  id="event-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="custom">Custom</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="form">Form</option>
                  <option value="video">Video</option>
                  <option value="click">Click</option>
                  <option value="funnel">Funnel</option>
                  <option value="ab_test">A/B Test</option>
                  <option value="conversion">Conversion</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="event-type">Type</label>
                <input
                  id="event-type"
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g., click, submit, play"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="event-description">Description</label>
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this event is tracking"
                rows={3}
              />
            </div>
          </div>
          
          <div className="form-section">
            <h3>Tracking Configuration</h3>
            
            <div className="form-group">
              <label htmlFor="event-selector">CSS Selector</label>
              <input
                id="event-selector"
                type="text"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder="e.g., #submit-button, .product-card"
              />
              <div className="field-help">
                CSS selector to automatically bind this event to elements
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="event-trigger">Trigger</label>
              <select
                id="event-trigger"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              >
                <option value="click">Click</option>
                <option value="submit">Form Submit</option>
                <option value="play">Play</option>
                <option value="pause">Pause</option>
                <option value="ended">Ended</option>
                <option value="hover">Hover</option>
                <option value="focus">Focus</option>
                <option value="blur">Blur</option>
                <option value="load">Page Load</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          
          <div className="form-section">
            <div className="section-header">
              <h3>Custom Metadata</h3>
              <button 
                type="button" 
                className="add-button"
                onClick={addMetadataField}
              >
                <FiPlus size={16} />
                <span>Add Field</span>
              </button>
            </div>
            
            {metadata.length === 0 ? (
              <div className="empty-subsection">
                <p>No metadata fields defined yet. Add fields to track additional information.</p>
              </div>
            ) : (
              <div className="metadata-fields">
                {metadata.map((field, index) => (
                  <div key={index} className="metadata-field">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Field Name</label>
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                          placeholder="e.g., product_id, price"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Source</label>
                        <select
                          value={field.source}
                          onChange={(e) => updateMetadataField(index, 'source', e.target.value)}
                        >
                          <option value="custom">Custom Value</option>
                          <option value="attr:data-id">data-id Attribute</option>
                          <option value="attr:data-value">data-value Attribute</option>
                          <option value="attr:data-name">data-name Attribute</option>
                          <option value="text">Element Text</option>
                          <option value="value">Input Value</option>
                          <option value="id">Element ID</option>
                        </select>
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateMetadataField(index, 'required', e.target.checked)}
                          />
                          Required
                        </label>
                      </div>
                      
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removeMetadataField(index)}
                      >
                        <FiTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-section">
            <h3>Value Tracking</h3>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={valueTracking.enabled}
                  onChange={(e) => setValueTracking({ ...valueTracking, enabled: e.target.checked })}
                />
                Enable Value Tracking
              </label>
            </div>
            
            {valueTracking.enabled && (
              <div className="value-tracking-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={valueTracking.currencyCode}
                      onChange={(e) => setValueTracking({ ...valueTracking, currencyCode: e.target.value })}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Value Source</label>
                    <select
                      value={valueTracking.source}
                      onChange={(e) => setValueTracking({ ...valueTracking, source: e.target.value })}
                    >
                      <option value="">Use Default Value</option>
                      <option value="attr:data-value">data-value Attribute</option>
                      <option value="attr:data-price">data-price Attribute</option>
                      <option value="value">Input Value</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Default Value</label>
                    <input
                      type="number"
                      value={valueTracking.defaultValue}
                      onChange={(e) => setValueTracking({ ...valueTracking, defaultValue: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="form-section">
            <div className="section-header">
              <h3>Funnel Steps</h3>
              <button 
                type="button" 
                className="add-button"
                onClick={addFunnelStep}
              >
                <FiPlus size={16} />
                <span>Add Step</span>
              </button>
            </div>
            
            {funnelSteps.length === 0 ? (
              <div className="empty-subsection">
                <p>No funnel steps defined yet. Add steps to track conversion funnels.</p>
              </div>
            ) : (
              <div className="funnel-steps">
                {funnelSteps.map((step, index) => (
                  <div key={index} className="funnel-step">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Position</label>
                        <input
                          type="number"
                          value={step.position}
                          onChange={(e) => updateFunnelStep(index, 'position', parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Step Name</label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateFunnelStep(index, 'name', e.target.value)}
                          placeholder="e.g., View Product, Add to Cart"
                        />
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={step.isRequired}
                            onChange={(e) => updateFunnelStep(index, 'isRequired', e.target.checked)}
                          />
                          Required Step
                        </label>
                      </div>
                      
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removeFunnelStep(index)}
                      >
                        <FiTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-section">
            <div className="section-header">
              <h3>A/B Testing</h3>
              <button 
                type="button" 
                className="add-button"
                onClick={addAbTestVariant}
              >
                <FiPlus size={16} />
                <span>Add Variant</span>
              </button>
            </div>
            
            {abTesting.variants.length === 0 ? (
              <div className="empty-subsection">
                <p>No A/B test variants defined yet. Add variants to conduct A/B tests.</p>
              </div>
            ) : (
              <div className="ab-variants">
                {abTesting.variants.map((variant, index) => (
                  <div key={index} className="ab-variant">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Variant ID</label>
                        <input
                          type="text"
                          value={variant.id}
                          onChange={(e) => updateAbTestVariant(index, 'id', e.target.value)}
                          placeholder="e.g., variant_a, blue_button"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateAbTestVariant(index, 'name', e.target.value)}
                          placeholder="e.g., Control, Variant A"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Weight (%)</label>
                        <input
                          type="number"
                          value={variant.weight}
                          onChange={(e) => updateAbTestVariant(index, 'weight', parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                        />
                      </div>
                      
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => removeAbTestVariant(index)}
                      >
                        <FiTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
            >
              {mode === 'create' ? 'Create Event' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal; 