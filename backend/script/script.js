const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
const VERSION = 'v0.11.21';
const CONSENT_STORAGE_KEY = 'mtm_consent';
const USER_ID_KEY = 'mtm_user_id';
const SITE_ID = 'abck-1234-dfdfdf-dfd-f-acbkdfc';
const SESSION_STORAGE_KEY = 'mtm_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const BOUNCE_TIME_THRESHOLD = 30 * 1000; // 30 seconds

// 💡 Initialize User Session Object
let userSession = {
    siteId: SITE_ID,
    sessionId: getOrCreateSessionId(),
    userId: getOrCreateUserId(),
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
function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function getOrCreateUserId() {
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
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    let storedUTM = {};
    utmParams.forEach(param => {
        storedUTM[param] = localStorage.getItem(param) || '';
    });
    return storedUTM;
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

function getSessionId() {
    return getOrCreateSessionId();
}

function getUserId() {
    return getOrCreateUserId();
}

function getSiteId() {
    return SITE_ID;
}

function getOrCreateSessionId() {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = localStorage.getItem('mtm_last_activity');
    
    // Check if session exists and is not expired
    if (sessionId && lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity < SESSION_TIMEOUT) {
            // Update last activity time
            localStorage.setItem('mtm_last_activity', Date.now().toString());
            return sessionId;
        }
    }
    
    // Create new session
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    localStorage.setItem('mtm_last_activity', Date.now().toString());
    localStorage.setItem('mtm_session_start', Date.now().toString());
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
    // Update last activity in localStorage to maintain session
    localStorage.setItem('mtm_last_activity', Date.now().toString());
    
    const currentTime = new Date();
    const sessionId = getSessionId(); // This uses getOrCreateSessionId() which handles session continuation
    const userId = getUserId();
    const siteId = getSiteId();
    const deviceInfo = getDeviceInfo();
    const browserInfo = getBrowserInfo();
    const country = getCountry();

    // Check if we should continue an existing session from our sessions Map
    const existingSession = sessions.get(sessionId);
    if (existingSession) {
        // Always update last activity to current time to prevent expiration
        existingSession.lastActivity = currentTime;
        
        // Only count as new page view if it's a different page
        const lastPage = existingSession.visitedPages.length > 0 ? 
            existingSession.visitedPages[existingSession.visitedPages.length - 1] : null;
        const isNewPage = !lastPage || lastPage.path !== pageUrl;
        
        if (isNewPage) {
            // Update existing session with new page
            existingSession.pagesViewed++;
            existingSession.visitedPages.push({
                path: pageUrl,
                timestamp: currentTime,
                duration: 0
            });
            existingSession.isBounce = false;
        }
        
        // Update duration and end time
        const startTime = new Date(existingSession.startTime);
        existingSession.duration = Math.floor((currentTime - startTime) / 1000);
        existingSession.endTime = currentTime;
        
        sessions.set(sessionId, existingSession);
        return;
    }

    // Create new session if no existing session found in our sessions Map
    const sessionStartTime = new Date(parseInt(localStorage.getItem('mtm_session_start')));
    const newSession = {
        sessionId,
        userId,
        siteId,
        startTime: sessionStartTime, // Use the stored session start time
        lastActivity: currentTime,
        pagesViewed: 1,
        visitedPages: [{
            path: pageUrl,
            timestamp: currentTime,
            duration: 0
        }],
        referrer,
        utmData,
        device: deviceInfo,
        browser: browserInfo,
        country,
        isBounce: true,
        wallet: {
            walletAddress: '',
            walletType: 'No Wallet Detected',
            chainName: 'No Wallet Detected'
        },
        endTime: currentTime,
        duration: Math.floor((currentTime - sessionStartTime) / 1000)
    };
    sessions.set(sessionId, newSession);
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
    userSession.country = getCountryName();
    const payload = {
        siteId: SITE_ID,
        userId: userSession.userId,
        sessionId: userSession.sessionId,
        type: eventType,
        pagePath: window.location.pathname,
        eventData: {
            ...eventData,
            ...userSession.utmData,
            referrer: userSession.referrer,
            sessionDuration: Date.now() - userSession.sessionStart,
            pagesPerVisit: userSession.pagesPerVisit,
            isBounce: userSession.isBounce,
            browser: userSession.browser,
            os: userSession.os,
            deviceType: userSession.deviceType,
            resolution: userSession.resolution,
            language: userSession.language,
            country: userSession.country,
        },
        timestamp: new Date().toISOString(),
        version: VERSION
    };

    // ✅ Display payload in the console before sending
    // console.log('Payload:', JSON.stringify(payload, null, 2));
    // console.log('User Session:', userSession);

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload })
    })
        .then(res => res.json())
        .then(result => console.log('API Response:', result))
        .catch(error => console.error('Error:', error));
}

// 🚀 Initialization
function initCryptiqueAnalytics() {
    getCountryName();
    trackPageView();
    startSessionTracking();
}

// Start Analytics
initCryptiqueAnalytics();

// Function to check if session should continue
function shouldContinueSession(lastActivity, currentTime) {
    if (!lastActivity) return false;
    
    const sessionTimeout = SESSION_TIMEOUT;
    const diff = currentTime - lastActivity;
    return diff < sessionTimeout;
}

function trackPageView(pageUrl, referrer, utmData) {
    const currentTime = new Date();
    const sessionId = getSessionId();
    const userId = getUserId();
    const siteId = getSiteId();
    const deviceInfo = getDeviceInfo();
    const browserInfo = getBrowserInfo();
    const country = getCountry();

    // Check if we should continue an existing session
    const existingSession = sessions.get(sessionId);
    if (existingSession) {
        const lastActivity = new Date(existingSession.lastActivity);
        if (shouldContinueSession(lastActivity, currentTime)) {
            // Only count as new page view if it's a different page
            const lastPage = existingSession.visitedPages[existingSession.visitedPages.length - 1];
            const isNewPage = !lastPage || lastPage.path !== pageUrl;
            
            if (isNewPage) {
                // Update existing session
                existingSession.lastActivity = currentTime;
                existingSession.pagesViewed++;
                existingSession.visitedPages.push({
                    path: pageUrl,
                    timestamp: currentTime,
                    duration: 0
                });
                existingSession.isBounce = false;
                sessions.set(sessionId, existingSession);
            }
            return;
        } else {
            // Session expired, finalize it
            const startTime = new Date(existingSession.startTime);
            existingSession.duration = Math.floor((lastActivity - startTime) / 1000);
            existingSession.endTime = lastActivity;
            existingSession.isBounce = existingSession.pagesViewed <= 1;
            saveSessionToDatabase(existingSession);
            sessions.delete(sessionId);
        }
    }

    // Create new session only if no existing session or session expired
    const newSession = {
        sessionId,
        userId,
        siteId,
        startTime: currentTime,
        lastActivity: currentTime,
        pagesViewed: 1,
        visitedPages: [{
            path: pageUrl,
            timestamp: currentTime,
            duration: 0
        }],
        referrer,
        utmData,
        device: deviceInfo,
        browser: browserInfo,
        country,
        isBounce: true,
        wallet: {
            walletAddress: '',
            walletType: 'No Wallet Detected',
            chainName: 'No Wallet Detected'
        }
    };
    sessions.set(sessionId, newSession);
}

function updateSessionData(sessionId, data) {
    const session = sessions.get(sessionId);
    if (!session) return;

    const currentTime = new Date();
    
    // Always update last activity in localStorage to maintain session continuity
    localStorage.setItem('mtm_last_activity', Date.now().toString());
    
    // Update session data
    Object.assign(session, data);
    session.lastActivity = currentTime;
    
    // Calculate duration based on first page view and last activity
    const startTime = new Date(session.startTime);
    session.duration = Math.floor((currentTime - startTime) / 1000); // Duration in seconds
    
    // Update end time to match last activity
    session.endTime = currentTime;
    
    // Update visited pages duration
    if (session.visitedPages && session.visitedPages.length > 0) {
        const lastPage = session.visitedPages[session.visitedPages.length - 1];
        if (lastPage) {
            const pageStartTime = new Date(lastPage.timestamp);
            lastPage.duration = Math.floor((currentTime - pageStartTime) / 1000);
        }
    }
    
    // Update bounce status based on duration and page views
    session.isBounce = session.pagesViewed <= 1 && session.duration < 30; // 30 seconds threshold
    
    sessions.set(sessionId, session);
}

function cleanupExpiredSessions() {
    const currentTime = new Date();
    // Check localStorage for session expiration first
    const lastActivity = localStorage.getItem('mtm_last_activity');
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    
    if (lastActivity && sessionId) {
        const lastActivityTime = new Date(parseInt(lastActivity));
        if (!shouldContinueSession(lastActivityTime, currentTime)) {
            // Session expired in localStorage, clear it
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem('mtm_last_activity');
            localStorage.removeItem('mtm_session_start');
            
            // Finalize session data in our sessions Map if it exists
            const session = sessions.get(sessionId);
            if (session) {
                const startTime = new Date(session.startTime);
                session.duration = Math.floor((lastActivityTime - startTime) / 1000);
                session.endTime = lastActivityTime;
                session.isBounce = session.pagesViewed <= 1 && session.duration < 30;
                
                // Save session to database
                saveSessionToDatabase(session);
                
                // Remove from active sessions
                sessions.delete(sessionId);
            }
        }
    }
    
    // Now check any other sessions in our Map that might have expired
    for (const [id, session] of sessions.entries()) {
        if (id !== sessionId) { // Skip the main session we just handled
            const lastSessionActivity = new Date(session.lastActivity);
            if (!shouldContinueSession(lastSessionActivity, currentTime)) {
                // Finalize and save this expired session
                const startTime = new Date(session.startTime);
                session.duration = Math.floor((lastSessionActivity - startTime) / 1000);
                session.endTime = lastSessionActivity;
                session.isBounce = session.pagesViewed <= 1 && session.duration < 30;
                
                saveSessionToDatabase(session);
                sessions.delete(id);
            }
        }
    }
}

// Initialize session tracking
function initializeSessionTracking() {
    // Check if we have an existing session
    const sessionId = getSessionId();
    const userId = getUserId();
    const siteId = getSiteId();
    
    // Set up periodic cleanup of expired sessions
    setInterval(cleanupExpiredSessions, 60000); // Check every minute
    
    // Track the initial page view
    const currentPage = window.location.pathname;
    const referrer = document.referrer || 'direct';
    const utmData = getUTMParameters();
    
    // Track this page view
    trackPageView(currentPage, referrer, utmData);
    
    // Listen for beforeunload to update session data
    window.addEventListener('beforeunload', () => {
        const session = sessions.get(sessionId);
        if (session) {
            const currentTime = new Date();
            const startTime = new Date(session.startTime);
            session.duration = Math.floor((currentTime - startTime) / 1000);
            session.endTime = currentTime;
            session.lastActivity = currentTime;
            
            // Save the session
            saveSessionToDatabase(session);
        }
    });
}

// Call initialize on script load
if (typeof window !== 'undefined') {
    // Wait for the DOM to be ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializeSessionTracking, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeSessionTracking, 100);
        });
    }
}
