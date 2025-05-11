import React, { useState, useRef } from 'react';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';
import './CodeSnippetModal.css';

const CodeSnippetModal = ({ event, website, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');
  const codeRef = useRef(null);
  
  // Copy code to clipboard
  const copyToClipboard = () => {
    if (codeRef.current) {
      const codeElement = codeRef.current;
      const range = document.createRange();
      range.selectNode(codeElement);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Generate code for direct implementation
  const generateDirectCode = () => {
    if (!event || !website) return '';
    
    let code = '';
    
    // Basic event tracking
    if (event.type === 'click' || event.trigger === 'click') {
      code = `
// Add this code to track ${event.name} when an element is clicked
document.querySelector('${event.selector || 'button.your-element'}').addEventListener('click', function(e) {
  // Track the event
  CryptiqueSDK.events.track('${event.name}', {
    // Add your custom metadata here
    ${event.metadata && event.metadata.length > 0 
      ? event.metadata.map(m => `${m.key}: 'yourValue'`).join(',\n    ') 
      : "pageUrl: window.location.href"}
  }, {
    category: '${event.category}',
    type: '${event.type}'
    ${event.valueTracking && event.valueTracking.enabled 
      ? `,\n    value: ${event.valueTracking.defaultValue},\n    currency: '${event.valueTracking.currencyCode}'` 
      : ''}
  });
});`;
    } else if (event.type === 'form' || event.trigger === 'submit') {
      code = `
// Add this code to track ${event.name} when a form is submitted
document.querySelector('${event.selector || 'form.your-form'}').addEventListener('submit', function(e) {
  // Optionally prevent default form submission
  // e.preventDefault();
  
  // Track the form submission event
  CryptiqueSDK.events.trackForm('${event.selector || 'form.your-form'}', '${event.name}', {
    // Add form field values here
    ${event.metadata && event.metadata.length > 0 
      ? event.metadata.map(m => `${m.key}: this.querySelector('[name="${m.key}"]')?.value || ''`).join(',\n    ') 
      : "formId: this.id || 'unknown'"}
  });
});`;
    } else if (event.type === 'video' || event.trigger === 'play' || event.trigger === 'pause') {
      code = `
// Add this code to track ${event.name} for video interactions
const videoElement = document.querySelector('${event.selector || 'video.your-video'}');

// Automatically track all video events (play, pause, progress, completion)
CryptiqueSDK.trackVideo(videoElement, {
  videoId: '${event.name}',
  category: '${event.category}'
});`;
    } else if (event.funnelSteps && event.funnelSteps.length > 0) {
      // Funnel tracking
      code = `
// Add this code to track funnel step: ${event.name}
CryptiqueSDK.events.trackFunnelStep(
  '${event._id}', // funnel ID
  ${event.funnelSteps[0].position}, // step number
  '${event.funnelSteps[0].name}', // step name
  {
    // Add your custom metadata here
    ${event.metadata && event.metadata.length > 0 
      ? event.metadata.map(m => `${m.key}: 'yourValue'`).join(',\n    ') 
      : "pageUrl: window.location.href"}
  }
);`;
    } else if (event.abTesting && event.abTesting.enabled) {
      // A/B testing
      code = `
// Add this code to implement A/B testing for: ${event.name}
const variant = CryptiqueSDK.events.getTestVariant(
  '${event._id}', // test ID
  [${event.abTesting.variants.map(v => `'${v.id}'`).join(', ')}] // variants
);

// Apply different behaviors based on the variant
switch (variant) {
  ${event.abTesting.variants.map(v => `case '${v.id}':\n  // Implement behavior for ${v.name}\n  break;`).join('\n  ')}
}

// Track the variant impression
CryptiqueSDK.events.track('${event.name}_impression', {
  variant: variant
}, {
  category: 'ab_test',
  type: 'impression',
  abVariant: variant
});`;
    } else {
      // Generic custom event
      code = `
// Add this code to track ${event.name}
CryptiqueSDK.events.track('${event.name}', {
  // Add your custom metadata here
  ${event.metadata && event.metadata.length > 0 
    ? event.metadata.map(m => `${m.key}: 'yourValue'`).join(',\n    ') 
    : "pageUrl: window.location.href"}
}, {
  category: '${event.category}',
  type: '${event.type}'
  ${event.valueTracking && event.valueTracking.enabled 
    ? `,\n  value: ${event.valueTracking.defaultValue},\n  currency: '${event.valueTracking.currencyCode}'` 
    : ''}
});`;
    }
    
    return code;
  };
  
  // Generate automated binding code
  const generateBindingCode = () => {
    if (!event || !website) return '';
    
    // Create configuration object for automatic binding
    const config = {
      selector: event.selector || '.your-element',
      name: event.name,
      trigger: event.trigger || 'click',
      category: event.category,
      type: event.type
    };
    
    // Add metadata if defined
    if (event.metadata && event.metadata.length > 0) {
      config.dynamicProperties = {};
      event.metadata.forEach(meta => {
        if (meta.source && meta.source !== 'custom') {
          config.dynamicProperties[meta.key] = meta.source;
        }
      });
    }
    
    // Add value tracking if enabled
    if (event.valueTracking && event.valueTracking.enabled) {
      config.valueTracking = {
        defaultValue: event.valueTracking.defaultValue,
        currency: event.valueTracking.currencyCode
      };
      
      if (event.valueTracking.source) {
        config.valueTracking.source = event.valueTracking.source;
      }
    }
    
    // Add A/B testing if enabled
    if (event.abTesting && event.abTesting.enabled && event.abTesting.variants.length > 0) {
      config.abTest = {
        id: event._id,
        variants: event.abTesting.variants.map(v => v.id)
      };
    }
    
    // Add funnel info if defined
    if (event.funnelSteps && event.funnelSteps.length > 0) {
      config.funnel = {
        id: event._id,
        step: event.funnelSteps[0].position,
        name: event.funnelSteps[0].name
      };
    }
    
    return `
// Add this configuration to automatically bind the ${event.name} event
// This can be added at the bottom of your page, or in a script that runs after DOM is loaded
CryptiqueSDK.events.bindEvents([
  ${JSON.stringify(config, null, 2)}
]);`;
  };
  
  // Generate SDK installation code
  const generateSDKInstallCode = () => {
    return `
<!-- Step 1: Add the Cryptique Analytics SDK to your website -->
<script async src="https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.script.min.js" site-id="${website?.siteId || 'your-site-id'}"></script>

<!-- Step 2: Add the Events extension -->
<script async src="https://cdn.cryptique.io/scripts/analytics/1.0.1/cryptique.events.min.js"></script>`;
  };
  
  // Get code based on active tab
  const getCodeForTab = () => {
    switch(activeTab) {
      case 'direct':
        return generateDirectCode();
      case 'automatic':
        return generateBindingCode();
      case 'installation':
        return generateSDKInstallCode();
      default:
        return generateDirectCode();
    }
  };
  
  return (
    <div className="code-snippet-modal-overlay">
      <div className="code-snippet-modal">
        <div className="modal-header">
          <h2>Implementation Code: {event?.name}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'installation' ? 'active' : ''}`}
              onClick={() => setActiveTab('installation')}
            >
              SDK Installation
            </button>
            <button 
              className={`tab ${activeTab === 'direct' ? 'active' : ''}`}
              onClick={() => setActiveTab('direct')}
            >
              Direct Implementation
            </button>
            <button 
              className={`tab ${activeTab === 'automatic' ? 'active' : ''}`}
              onClick={() => setActiveTab('automatic')}
            >
              Automatic Binding
            </button>
          </div>
          
          <div className="code-container">
            <div className="code-header">
              <div className="code-language">JavaScript</div>
              <button 
                className="copy-button" 
                onClick={copyToClipboard}
                title="Copy code to clipboard"
              >
                {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            
            <pre className="code-block">
              <code ref={codeRef}>{getCodeForTab()}</code>
            </pre>
          </div>
          
          <div className="implementation-notes">
            <h3>Implementation Notes</h3>
            <ul>
              <li>
                <strong>SDK Installation:</strong> Make sure you have added the Cryptique SDK and Events extension to your site before implementing custom events.
              </li>
              <li>
                <strong>Selectors:</strong> Replace any placeholder CSS selectors with actual selectors that match your HTML elements.
              </li>
              <li>
                <strong>Event Names:</strong> Event names should be consistent and follow a pattern like <code>noun_verb</code> (e.g., <code>button_click</code>, <code>form_submit</code>).
              </li>
              <li>
                <strong>Metadata:</strong> Add relevant context to your events by including custom metadata.
              </li>
              {event?.valueTracking?.enabled && (
                <li>
                  <strong>Value Tracking:</strong> This event tracks monetary values. Make sure to set the value accurately for proper analytics.
                </li>
              )}
              {event?.abTesting?.enabled && (
                <li>
                  <strong>A/B Testing:</strong> Your event is configured for A/B testing with {event.abTesting.variants.length} variants.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSnippetModal; 