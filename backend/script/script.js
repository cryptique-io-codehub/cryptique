// Cryptique Analytics - Session Tracking Script
const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
const VERSION = 'v0.12.0';

// Storage keys
const USER_ID_KEY = 'cryptique_user_id';
const SESSION_ID_KEY = 'cryptique_session_id';
const SESSION_START_KEY = 'cryptique_session_start';
const LAST_ACTIVITY_KEY = 'cryptique_last_activity';
const CONSENT_KEY = 'cryptique_consent';

// Timeouts
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const BOUNCE_THRESHOLD = 30 * 1000; // 30 seconds

// Active sessions cache
const sessions = new Map();

// ==== CORE IDENTITY FUNCTIONS ====

/**
 * Generate a UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Get or create a persistent user ID
 */
function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = 'usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

/**
 * Get the site ID for this installation
 */
function getSiteId() {
    // This would come from a configuration
    return '7c883e78-187a-4865-92a0-f363334b1cb8';
}

// ==== SESSION MANAGEMENT ====

/**
 * Get or create a session ID using localStorage for persistence across page loads
 * This is the core function that prevents session splitting
 */
function getSessionId() {
    const now = Date.now();
    
    // Check for existing session
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    let lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    let sessionStart = localStorage.getItem(SESSION_START_KEY);
    
    if (sessionId && lastActivity) {
        const timeSinceLastActivity = now - parseInt(lastActivity);
        
        // Session is still active
        if (timeSinceLastActivity < SESSION_TIMEOUT) {
            // Update last activity time
            localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
            return sessionId;
        }
    }
    
    // Create new session
    sessionId = generateUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(SESSION_START_KEY, now.toString());
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    
    return sessionId;
}

/**
 * Check if a session is still active based on last activity
 */
function isSessionActive(lastActivityTime) {
    if (!lastActivityTime) return false;
    const now = Date.now();
    return (now - lastActivityTime) < SESSION_TIMEOUT;
}

/**
 * Get the session start timestamp
 */
function getSessionStartTime() {
    const startTime = localStorage.getItem(SESSION_START_KEY);
    return startTime ? parseInt(startTime) : Date.now();
}

// ==== DATA COLLECTION ====

/**
 * Get browser information
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    
    let browserName = 'Unknown';
    if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) {
        browserName = 'Microsoft Edge';
    } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Google Chrome';
    } else if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
    } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari';
    } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
        browserName = 'Internet Explorer';
    }
    
    return {
        name: browserName,
        version: ua
    };
}

/**
 * Get device information
 */
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let os = 'Unknown';
    
    // Detect device type
    if (/Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        if (/iPad|Tablet/i.test(ua)) {
            deviceType = 'tablet';
        } else {
            deviceType = 'mobile';
        }
    }
    
    // Detect OS
    if (/Windows/i.test(ua)) {
        os = 'Win32';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
        os = 'MacOS';
    } else if (/Android/i.test(ua)) {
        os = 'Android';
    } else if (/iOS|iPhone|iPad|iPod/i.test(ua)) {
        os = 'iOS';
    } else if (/Linux/i.test(ua)) {
        os = 'Linux';
    }
    
    return {
        type: deviceType,
        os: os
    };
}

/**
 * Get country information (placeholder)
 */
function getCountry() {
    return localStorage.getItem('user_country') || 'IN';
}

/**
 * Get UTM parameters from URL
 */
function getUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
        source: urlParams.get('utm_source') || null,
        medium: urlParams.get('utm_medium') || null,
        campaign: urlParams.get('utm_campaign') || null,
        term: urlParams.get('utm_term') || null,
        content: urlParams.get('utm_content') || null
    };
}

/**
 * Get referrer information
 */
function getReferrer() {
    return document.referrer || 'direct';
}

// ==== TRACKING FUNCTIONS ====

/**
 * Track a page view
 */
function trackPageView() {
    const sessionId = getSessionId();
    const userId = getUserId();
    const siteId = getSiteId();
    const currentTime = new Date();
    const pageUrl = window.location.pathname;
    
    // Update last activity time
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    
    // Check if we have an active session for this session ID
    let session = sessions.get(sessionId);
    
    if (!session) {
        // Get the actual session start time from localStorage
        const sessionStartTime = new Date(parseInt(localStorage.getItem(SESSION_START_KEY)));
        
        // Create a new session object
        session = {
            sessionId,
            userId,
            siteId,
            startTime: sessionStartTime,
            lastActivity: currentTime,
            endTime: currentTime,
            duration: Math.floor((currentTime - sessionStartTime) / 1000),
            pagesViewed: 0,
            visitedPages: [],
            referrer: getReferrer(),
            utmData: getUTMParameters(),
            device: getDeviceInfo(),
            browser: getBrowserInfo(),
            country: getCountry(),
            isBounce: true,
            wallet: {
                walletAddress: '',
                walletType: 'No Wallet Detected',
                chainName: 'No Wallet Detected'
            }
        };
    }
    
    // Update session data
    session.lastActivity = currentTime;
    session.endTime = currentTime;
    session.duration = Math.floor((currentTime - new Date(session.startTime)) / 1000);
    
    // Check if this is a new page
    const lastPage = session.visitedPages.length > 0 ? 
        session.visitedPages[session.visitedPages.length - 1] : null;
    const isNewPage = !lastPage || lastPage.path !== pageUrl;
    
    if (isNewPage) {
        // Add page to visited pages
        session.pagesViewed++;
        session.visitedPages.push({
            path: pageUrl,
            timestamp: currentTime,
            duration: 0
        });
        
        // Update bounce status
        if (session.pagesViewed > 1) {
            session.isBounce = false;
        }
    }
    
    // Save updated session
    sessions.set(sessionId, session);
    
    // Save session to database
    saveSession(session);
}

/**
 * Track a wallet connection
 */
function trackWalletConnection(walletAddress, walletType, chainName) {
    const sessionId = getSessionId();
    let session = sessions.get(sessionId);
    
    if (!session) {
        // Need to initialize a session first
        trackPageView();
        session = sessions.get(sessionId);
    }
    
    if (session) {
        // Update wallet information
        session.wallet = {
            walletAddress: walletAddress || '',
            walletType: walletType || 'Unknown Wallet',
            chainName: chainName || 'Unknown Chain'
        };
        
        // Save session
        sessions.set(sessionId, session);
        saveSession(session);
        
        // Also track as an event
        trackEvent('wallet_connected', {
            walletAddress,
            walletType,
            chainName
        });
    }
}

/**
 * Track a custom event
 */
function trackEvent(eventType, eventData = {}) {
    const sessionId = getSessionId();
    let session = sessions.get(sessionId);
    
    if (!session) {
        // Need to initialize a session first
        trackPageView();
        session = sessions.get(sessionId);
    }
    
    const payload = {
        siteId: getSiteId(),
        userId: getUserId(),
        sessionId,
        type: eventType,
        pagePath: window.location.pathname,
        eventData: {
            ...eventData,
            sessionDuration: session.duration || 0,
            pagesViewed: session.pagesViewed || 0
        },
        timestamp: new Date().toISOString(),
        version: VERSION
    };
    
    // Send to server
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: payload })
    })
    .catch(error => console.error('Error tracking event:', error));
}

/**
 * Save session data to server
 */
function saveSession(session) {
    if (!session) return;
    
    // Create a clean copy for sending
    const sessionData = {
        ...session,
        startTime: new Date(session.startTime).toISOString(),
        lastActivity: new Date(session.lastActivity).toISOString(),
        endTime: new Date(session.endTime).toISOString()
    };
    
    // Send to server
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData })
    })
    .catch(error => console.error('Error saving session:', error));
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY));
    
    // Check if the current session has expired
    if (lastActivity && (now - lastActivity) > SESSION_TIMEOUT) {
        const sessionId = localStorage.getItem(SESSION_ID_KEY);
        const session = sessions.get(sessionId);
        
        if (session) {
            // Finalize session
            const lastActivityTime = new Date(session.lastActivity);
            session.endTime = lastActivityTime;
            
            // Save final session data
            saveSession(session);
            
            // Remove from session cache
            sessions.delete(sessionId);
        }
        
        // Clear session from localStorage
        localStorage.removeItem(SESSION_ID_KEY);
    }
    
    // Check any other sessions that might have expired
    for (const [id, session] of sessions.entries()) {
        const lastSessionActivity = new Date(session.lastActivity);
        if ((now - lastSessionActivity) > SESSION_TIMEOUT) {
            // Save and remove expired session
            saveSession(session);
            sessions.delete(id);
        }
    }
}

// ==== INITIALIZATION ====

/**
 * Initialize analytics tracking
 */
function initAnalytics() {
    // Track the initial page view
    trackPageView();
    
    // Set up cleanup interval
    setInterval(cleanupExpiredSessions, 60000); // Check every minute
    
    // Set up activity tracking to update last activity time
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(eventType => {
        window.addEventListener(eventType, () => {
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        });
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Update activity time
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
    });
    
    // Handle page unload/close
    window.addEventListener('beforeunload', () => {
        const sessionId = localStorage.getItem(SESSION_ID_KEY);
        const session = sessions.get(sessionId);
        
        if (session) {
            // Update session end time
            const currentTime = new Date();
            session.endTime = currentTime;
            session.lastActivity = currentTime;
            session.duration = Math.floor((currentTime - new Date(session.startTime)) / 1000);
            
            // Update bounce status
            if (session.duration < BOUNCE_THRESHOLD && session.pagesViewed <= 1) {
                session.isBounce = true;
            } else {
                session.isBounce = false;
            }
            
            // Save final session data
            saveSession(session);
        }
    });
}

// Initialize when the page loads
if (typeof window !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initAnalytics, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initAnalytics, 100);
        });
    }
}

// ==== PUBLIC API ====

// Export public API
window.cryptiqueAnalytics = {
    trackEvent,
    trackPageView,
    trackWalletConnection,
    getSessionId,
    getUserId
};
