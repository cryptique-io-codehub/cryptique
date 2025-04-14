const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
const VERSION = 'v0.11.21';
const CONSENT_STORAGE_KEY = 'mtm_consent';
const USER_ID_KEY = 'mtm_user_id';
const SITE_ID = 'abck-1234-dfdfdf-dfd-f-acbkdfc';
const SESSION_STORAGE_KEY = 'mtm_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const BOUNCE_TIME_THRESHOLD = 30 * 1000; // 30 seconds

// Initialize the sessions Map to store active sessions
const sessions = new Map();

// 💡 Initialize User Session Object
let userSession = {
    siteId: SITE_ID,
    sessionId: getSessionId(),
    userId: getUserId(),
    sessionStart: getSessionStartTime(),
    sessionEnd: null,
    pagesPerVisit: 0,
    isBounce: true,
    userAgent: navigator.userAgent,
    language: navigator.language,
    referrer: getStoredReferrer(),
    resolution: `${window.screen.width}x${window.screen.height}`,
    consentGiven: getTrackingConsent(),
    walletAddresses: [],
    chainId: null,
    provider: null,
    utmData: getUTMParameters(),
    browser: getBrowserAndDeviceInfo().browser,
    os: getBrowserAndDeviceInfo().device.os,
    device: getBrowserAndDeviceInfo().device,
    country: null,
    lastActivity: null,
    visitedPages: [],
    pagesViewed: 0,
    duration: 0,
    startTime: null,
    endTime: null
};

// 🚀 Utility Functions
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = 'usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

function getTrackingConsent() {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
}

function setTrackingConsent(consent) {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent ? 'true' : 'false');
}

function getUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmTerm = urlParams.get('utm_term');
    const utmContent = urlParams.get('utm_content');
    
    return {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        term: utmTerm,
        content: utmContent
    };
}

function getStoredReferrer() {
    return localStorage.getItem('referrer') || document.referrer;
}

function getBrowserAndDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';

    if (/Mobi|Android/i.test(userAgent)) {
        deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
        deviceType = 'tablet';
    }

    return {
        browser: {
            name: navigator.userAgentData?.brands?.[0]?.brand || navigator.appName,
            version: navigator.appVersion
        },
        device: {
            type: deviceType,
            os: navigator.platform,
            resolution: `${window.screen.width}x${window.screen.height}`
        }
    };
}

function getSiteId() {
    return SITE_ID;
}

function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = sessionStorage.getItem('mtm_last_activity');
    
    if (sessionId && lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity < SESSION_TIMEOUT) {
            // Update last activity time in sessionStorage
            sessionStorage.setItem('mtm_last_activity', Date.now().toString());
            return sessionId;
        }
    }
    
    // Create new session if none exists or if expired
    sessionId = generateId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    sessionStorage.setItem('mtm_last_activity', Date.now().toString());
    sessionStorage.setItem('mtm_session_start', Date.now().toString());
    
    return sessionId;
}

function getSessionStartTime() {
    const storedStartTime = localStorage.getItem('mtm_session_start');
    if (storedStartTime) {
        const timeSinceStart = Date.now() - parseInt(storedStartTime);
        if (timeSinceStart < SESSION_TIMEOUT) {
            return parseInt(storedStartTime);
        }
    }
    const startTime = Date.now();
    localStorage.setItem('mtm_session_start', startTime);
    return startTime;
}

// 🛠️ Activity Tracking Functions
function trackDailyActivity() {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = localStorage.getItem('lastActiveDate');
    if (today !== lastActive) {
        localStorage.setItem('lastActiveDate', today);
        return true;
    }
    return false;
}

function trackWeeklyActivity() {
    const currentWeek = getWeekNumber(new Date());
    const lastWeek = localStorage.getItem('lastActiveWeek');
    if (currentWeek !== lastWeek) {
        localStorage.setItem('lastActiveWeek', currentWeek);
        return true;
    }
    return false;
}

function trackMonthlyActivity() {
    const currentMonth = new Date().getMonth();
    const lastMonth = localStorage.getItem('lastActiveMonth');
    if (currentMonth !== lastMonth) {
        localStorage.setItem('lastActiveMonth', currentMonth);
        return true;
    }
    return false;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

// 📈 Page View and Event Tracking
function trackPageView(pageUrl, referrer, utmData) {
    // Ensure we're using the latest values
    pageUrl = pageUrl || window.location.pathname;
    referrer = referrer || document.referrer || 'direct';
    utmData = utmData || getUTMParameters();
    
    const currentTime = new Date();
    const sessionId = getSessionId();
    const userId = getUserId();
    const siteId = getSiteId();
    
    // Always update last activity in sessionStorage
    sessionStorage.setItem('mtm_last_activity', Date.now().toString());
    
    // Get or create session in our Map
    let session = sessions.get(sessionId);
    
    if (!session) {
        // Create new session
        const sessionStartTime = new Date(parseInt(sessionStorage.getItem('mtm_session_start')));
        session = {
            sessionId,
            userId,
            siteId,
            startTime: sessionStartTime,
            lastActivity: currentTime,
            pagesViewed: 0, // We'll increment this below
            visitedPages: [],
            referrer,
            utmData,
            device: getDeviceInfo(),
            browser: getBrowserInfo(),
            country: getCountry(),
            isBounce: true,
            wallet: {
                walletAddress: '',
                walletType: 'No Wallet Detected',
                chainName: 'No Wallet Detected'
            },
            endTime: currentTime,
            duration: Math.floor((currentTime - sessionStartTime) / 1000)
        };
    }
    
    // Always update last activity
    session.lastActivity = currentTime;
    
    // Only count as new page view if it's a different page
    const lastPage = session.visitedPages.length > 0 ? 
        session.visitedPages[session.visitedPages.length - 1] : null;
    const isNewPage = !lastPage || lastPage.path !== pageUrl;
    
    if (isNewPage) {
        // Add new page view
        session.pagesViewed++;
        session.visitedPages.push({
            path: pageUrl,
            timestamp: currentTime,
            duration: 0
        });
        if (session.pagesViewed > 1) {
            session.isBounce = false;
        }
    }
    
    // Update duration and end time
    const startTime = new Date(session.startTime);
    session.duration = Math.floor((currentTime - startTime) / 1000);
    session.endTime = currentTime;
    
    // Save updated session
    sessions.set(sessionId, session);
}

function updatePageDuration() {
    const currentPage = window.location.pathname;
    const currentTime = new Date();
    const currentTimeISO = currentTime.toISOString();
    
    if (userSession.sessionId) {
        const pageIndex = userSession.visitedPages.findIndex(page => page.path === currentPage);
        if (pageIndex !== -1) {
            const pageEntry = userSession.visitedPages[pageIndex];
            const pageStartTime = new Date(pageEntry.timestamp);
            pageEntry.duration = Math.floor((currentTime - pageStartTime) / 1000);
            
            // Update session duration based on first page to last activity
            const firstPageTime = new Date(userSession.visitedPages[0].timestamp);
            userSession.duration = Math.floor((currentTime - firstPageTime) / 1000);
            userSession.endTime = currentTimeISO;
            userSession.lastActivity = currentTimeISO;
            
            // Update bounce status based on duration only
            userSession.isBounce = userSession.duration < BOUNCE_TIME_THRESHOLD;
            
            saveSessionData();
        }
    }
}

function getCountryName() {
    fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
        userSession.country = data.country_name;
    })
    .catch(err => console.error('Error:', err));
    return userSession.country;
}

function startSessionTracking() {
    // Update last activity time on user interaction
    const updateActivity = () => {
        localStorage.setItem('mtm_last_activity', Date.now());
    };

    // Add event listeners for user activity
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
        window.addEventListener(event, updateActivity);
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            updatePageDuration();
        } else if (document.visibilityState === 'visible') {
            trackPageView();
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        updatePageDuration();
    });
}

function sendSessionData(sessionData) {
    const formattedSessionData = {
        siteId: userSession.siteId,
        sessionId: userSession.sessionId,
        userId: userSession.userId,
        startTime: new Date(userSession.sessionStart).toISOString(),
        endTime: sessionData.sessionEnd ? new Date(sessionData.sessionEnd).toISOString() : null,
        pagesViewed: sessionData.pagesViewed || userSession.pagesPerVisit,
        duration: sessionData.sessionEnd ? 
            Math.round((sessionData.sessionEnd - userSession.sessionStart) / 1000) : 
            Math.round((Date.now() - userSession.sessionStart) / 1000),
        isBounce: userSession.isBounce,
        country: userSession.country,
        device: userSession.device,
        browser: userSession.browser,
        referrer: userSession.referrer,
        utmData: userSession.utmData,
        currentPage: sessionData?.currentPage || window.location.pathname,
        visitedPages: sessionData?.visitedPages || [{
            path: window.location.pathname,
            timestamp: Date.now(),
            duration: 0
        }],
        wallet: {
            walletAddress: userSession.walletAddresses[0] || '',
            walletType: userSession.provider || 'No Wallet Detected',
            chainName: userSession.chainId || 'No Chain Detected'
        }
    };

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData: formattedSessionData })
    })
    .then(res => res.json())
    .then(result => console.log('API Response:', result))
    .catch(error => console.error('Error:', error));
}

function trackEvent(eventType, eventData = {}) {
    const sessionId = getSessionId();
    const session = sessions.get(sessionId) || {};
    
    const payload = {
        siteId: getSiteId(),
        userId: getUserId(),
        sessionId,
        type: eventType,
        pagePath: window.location.pathname,
        eventData: {
            ...eventData,
            sessionDuration: session.duration || 0,
            pagesViewed: session.pagesViewed || 0,
            browser: getBrowserInfo(),
            device: getDeviceInfo(),
            country: getCountry()
        },
        timestamp: new Date().toISOString(),
        version: VERSION
    };
    
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: payload })
    })
    .then(res => res.json())
    .catch(error => console.error('Error tracking event:', error));
}

function trackWalletConnection(walletAddress, walletType, chainName) {
    const sessionId = getSessionId();
    const session = sessions.get(sessionId);
    
    if (session) {
        session.wallet = {
            walletAddress: walletAddress || '',
            walletType: walletType || 'Unknown Wallet',
            chainName: chainName || 'Unknown Chain'
        };
        
        sessions.set(sessionId, session);
        
        // Also track as an event
        trackEvent('wallet_connected', {
            walletAddress,
            walletType,
            chainName
        });
    }
}

function cleanupExpiredSessions() {
    const currentTime = new Date();
    const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = sessionStorage.getItem('mtm_last_activity');
    
    if (sessionId && lastActivity) {
        const lastActivityTime = new Date(parseInt(lastActivity));
        
        if (!shouldContinueSession(lastActivityTime, currentTime)) {
            // Session expired in sessionStorage
            const session = sessions.get(sessionId);
            
            if (session) {
                // Finalize session data
                session.endTime = lastActivityTime;
                session.duration = Math.floor((lastActivityTime - new Date(session.startTime)) / 1000);
                
                // Save to database
                saveSessionToDatabase(session);
                
                // Clear from local storage
                sessions.delete(sessionId);
            }
            
            // Clear sessionStorage
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            sessionStorage.removeItem('mtm_last_activity');
            sessionStorage.removeItem('mtm_session_start');
        }
    }
    
    // Check other sessions in our Map
    for (const [id, session] of sessions.entries()) {
        if (id !== sessionId) {
            const lastSessionActivity = new Date(session.lastActivity);
            
            if (!shouldContinueSession(lastSessionActivity, currentTime)) {
                // Session expired
                session.endTime = lastSessionActivity;
                saveSessionToDatabase(session);
                sessions.delete(id);
            }
        }
    }
}

// Initialize tracking
function initializeTracking() {
    const sessionId = getSessionId();
    
    // Track initial page view
    trackPageView();
    
    // Set up cleanup interval
    setInterval(cleanupExpiredSessions, 60000);
    
    // Add event listeners
    window.addEventListener('beforeunload', () => {
        const session = sessions.get(sessionId);
        
        if (session) {
            const currentTime = new Date();
            session.endTime = currentTime;
            session.lastActivity = currentTime;
            session.duration = Math.floor((currentTime - new Date(session.startTime)) / 1000);
            
            // Try to save session data
            saveSessionToDatabase(session);
        }
    });
    
    // Track user activity to update last activity time
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(eventType => {
        window.addEventListener(eventType, () => {
            sessionStorage.setItem('mtm_last_activity', Date.now().toString());
        });
    });
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Page became visible again, might be a return visit
            const currentTime = Date.now();
            const lastActivity = parseInt(sessionStorage.getItem('mtm_last_activity'));
            
            // Continue same session if within timeout
            if (shouldContinueSession(lastActivity, currentTime)) {
                sessionStorage.setItem('mtm_last_activity', currentTime.toString());
            } else {
                // This is a new session after being away too long
                cleanupExpiredSessions();
                // New session will be created on next trackPageView call
            }
        }
    });
}

// Initialize when the DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializeTracking, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeTracking, 100);
        });
    }
}

// Expose public API
window.cryptiqueAnalytics = {
    trackEvent,
    trackPageView,
    trackWalletConnection,
    getSessionId,
    getUserId
};
