const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
const VERSION = 'v0.11.21';
const CONSENT_STORAGE_KEY = 'mtm_consent';
const USER_ID_KEY = 'mtm_user_id';
const SITE_ID = 'abck-1234-dfdfdf-dfd-f-df-dfdfdf';

// 💡 Initialize User Session Object
let userSession = {
    siteId: SITE_ID,
    sessionId: generateSessionId(),
    userId: getOrCreateUserId(),
    sessionStart: Date.now(),
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
    browser: getBrowserInfo(),
    os: getOSInfo(),
    deviceType: getDeviceType(),
    country:null
};
//countryName
function getCountryName() {
    const url = 'https://ipapi.co/json/';
    fetch(url)
        .then(response => response.json())
        .then(data => {
            userSession.country = data.country_name;
        }
        )
        .catch(error => console.error('Error:', error));
}

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

function getBrowserInfo() {
    const ua = navigator.userAgent;
    let tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

    if (/trident/i.test(M[1])) return { name: 'IE', version: M[2] || '' };

    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edg)\/(\d+)/);
        if (tem) return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] };
    }

    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i))) M.splice(1, 1, tem[1]);

    return { name: M[0], version: M[1] };
}

function getOSInfo() {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS/.test(ua)) return 'MacOS';
    if (/Android/.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown OS';
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile';
    return 'Desktop';
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
    userSession.pagesPerVisit++;
    if (userSession.pagesPerVisit > 1) userSession.isBounce = false;

    trackEvent('PAGEVIEW', {
        pageUrl: window.location.href,
        pageTitle: document.title,
        userActivity: {
            dau: trackDailyActivity(),
            wau: trackWeeklyActivity(),
            mau: trackMonthlyActivity()
        }
    });
}

function trackEvent(eventType, eventData = {}) {
    const payload = {
        siteId: SITE_ID,
        userId: userSession.userId,
        sessionId: userSession.sessionId,
        type: eventType,
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
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('User Session:', userSession);

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
}

// Start Analytics
initCryptiqueAnalytics();
