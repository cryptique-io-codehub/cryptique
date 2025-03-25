(function () {
    const API_URL = 'https://cryptique-backend.vercel.app/api/sdk/track';
    const VERSION = 'v0.11.21';
    const CONSENT_STORAGE_KEY = 'mtm_consent';
    const USER_ID_KEY = 'mtm_user_id';
    const currentScript = document.currentScript;
    const SITE_ID = currentScript.getAttribute('site-id');

    if (!SITE_ID) {
        console.error('Cryptique Analytics: Missing site-id attribute');
        return;
    }

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
        deviceType: getDeviceType()
    };

    function generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
        let utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        let storedUTM = {};
        utmParams.forEach(param => {
            storedUTM[param] = localStorage.getItem(param) || '';
        });
        return storedUTM;
    }

    function getStoredReferrer() {
        return localStorage.getItem('referrer') || document.referrer;
    }
    // Existing utility functions (getTrackingConsent, setTrackingConsent, getUTMParameters, getStoredReferrer) remain the same
    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    
        if (/trident/i.test(M[1])) return 'IE ' + (M[2] || '');
    
        if (M[1] === 'Chrome') {
            tem = ua.match(/\b(OPR|Edg)\/(\d+)/);
            if (tem) return tem.slice(1).join(' ').replace('OPR', 'Opera');
        }
    
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    
        // ✅ Add curly braces to properly scope the if statement
        if ((tem = ua.match(/version\/(\d+)/i))) {
            M.splice(1, 1, tem[1]);
        }
    
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

    function trackEvent(eventType, eventData = {}) {
        if (!userSession.consentGiven) return;
        
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
                language: userSession.language
            },
            timestamp: new Date().toISOString(),
            version: VERSION
        };

         fetch('https://cryptique-backend.vercel.app/api/sdk/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload: payload })
    })
    .then(res => res.json())
    .then(result => console.log('API Response:', result))
    .catch(error => console.error('Error posting country:', error));
    }

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

    function handleSessionEnd() {
        userSession.sessionEnd = Date.now();
        trackEvent('SESSION_END', {
            sessionDuration: userSession.sessionEnd - userSession.sessionStart,
            pagesPerVisit: userSession.pagesPerVisit,
            isBounce: userSession.isBounce
        });
    }

    function setupSessionTracking() {
        window.addEventListener('beforeunload', handleSessionEnd);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleSessionEnd();
            }
        });
    }

    // Modified initialization function


    function trackCohortAnalysis() {
        const firstVisitDate = localStorage.getItem('firstVisitDate') || new Date().toISOString();
        if (!localStorage.getItem('firstVisitDate')) {
            localStorage.setItem('firstVisitDate', firstVisitDate);
        }
        trackEvent('COHORT_DATA', {
            firstVisitDate,
            lastVisitDate: new Date().toISOString(),
            totalVisits: parseInt(localStorage.getItem('totalVisits') || 0) + 1
        });
        localStorage.setItem('totalVisits', parseInt(localStorage.getItem('totalVisits') || 0) + 1);
    }
    function setupWalletTracking() {
        if (window.ethereum) {
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) {
                    userSession.walletAddresses = accounts;
                    trackEvent('WALLET_CONNECTED', { addresses: accounts });
                }
            });

            window.ethereum.on('accountsChanged', accounts => {
                userSession.walletAddresses = accounts;
                trackEvent('WALLET_ACCOUNT_CHANGED', { addresses: accounts });
            });

            window.ethereum.on('chainChanged', chainId => {
                userSession.chainId = chainId;
                trackEvent('CHAIN_CHANGED', { chainId });
            });
        }
    }

    function capturePerformanceMetrics() {
        if (performance.getEntriesByType) {
            let metrics = performance.getEntriesByType('navigation')[0];
            if (metrics) {
                trackEvent('PERFORMANCE_METRICS', {
                    loadTime: metrics.loadEventEnd - metrics.startTime,
                    domContentLoaded: metrics.domContentLoadedEventEnd - metrics.startTime,
                    serverResponseTime: metrics.responseStart - metrics.requestStart
                });
            }
        }
    }
    function setupEventListeners() {
        window.addEventListener('popstate', trackPageView);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') trackPageView();
        });
    }
    function initCryptiqueAnalytics() {
        if (userSession.consentGiven) {
            trackPageView();
            trackOutboundLinkClicks();
            setupWalletTracking();
            setupEventListeners();
            capturePerformanceMetrics();
            setupSessionTracking();
            trackCohortAnalysis();
        }
    }
  

    window.CryptiqueAnalytics = {
        trackEvent,
        setTrackingConsent,
        isTrackingConsentGiven: getTrackingConsent
    };

    document.addEventListener('DOMContentLoaded', initCryptiqueAnalytics);
})();