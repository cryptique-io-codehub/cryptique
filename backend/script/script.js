const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
const VERSION = 'v0.11.21';
const CONSENT_STORAGE_KEY = 'mtm_consent';
const USER_ID_KEY = 'mtm_user_id';
const SITE_ID = 'abck-1234-dfdfdf-dfd-f-acbkdfc';
const SESSION_STORAGE_KEY = 'mtm_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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

function getOrCreateSessionId() {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = localStorage.getItem('mtm_last_activity');
    
    // Check if session exists and is not expired
    if (sessionId && lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity < SESSION_TIMEOUT) {
            // Update last activity time
            localStorage.setItem('mtm_last_activity', Date.now());
            return sessionId;
        }
    }
    
    // Create new session
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    localStorage.setItem('mtm_last_activity', Date.now());
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
function trackPageView() {
    const currentPage = window.location.pathname;
    const currentTime = new Date().toISOString();
    
    // Update session data
    if (userSession.sessionId) {
        // Update last activity time
        userSession.lastActivity = currentTime;
        
        // Check if this is a new page view
        const isNewPage = !userSession.visitedPages.some(page => page.path === currentPage);
        
        if (isNewPage) {
            // Add new page to visited pages
            userSession.visitedPages.push({
                path: currentPage,
                timestamp: currentTime,
                duration: 0 // Will be updated when user leaves the page
            });
            
            // Update pages viewed count
            userSession.pagesViewed = userSession.visitedPages.length;
            
            // Update session duration
            if (userSession.visitedPages.length > 0) {
                const firstPageTime = new Date(userSession.visitedPages[0].timestamp);
                const lastPageTime = new Date(currentTime);
                userSession.duration = Math.floor((lastPageTime - firstPageTime) / 1000);
                userSession.startTime = userSession.visitedPages[0].timestamp;
                userSession.endTime = currentTime;
            }
            
            // Update bounce status
            userSession.isBounce = userSession.pagesViewed <= 1;
            
            // Save session data
            saveSessionData();
        }
    }
}

function updatePageDuration() {
    const currentPage = window.location.pathname;
    const currentTime = new Date();
    
    if (userSession.sessionId) {
        const pageIndex = userSession.visitedPages.findIndex(page => page.path === currentPage);
        if (pageIndex !== -1) {
            const pageEntry = userSession.visitedPages[pageIndex];
            const pageStartTime = new Date(pageEntry.timestamp);
            pageEntry.duration = Math.floor((currentTime - pageStartTime) / 1000);
            
            // Update session duration
            const firstPageTime = new Date(userSession.visitedPages[0].timestamp);
            userSession.duration = Math.floor((currentTime - firstPageTime) / 1000);
            userSession.endTime = currentTime.toISOString();
            
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
