(function initializeFirebase() {
  console.log('[Firebase Init] Starting initialization...');
  
  if (!window.FIREBASE_CONFIG) {
    const error = 'Missing Firebase configuration. Copy firebase-config.example.js to firebase-config.js and fill your project values.';
    console.error('[Firebase Init]', error);
    throw new Error(error);
  }

  console.log('[Firebase Init] Firebase config loaded');

  // Handle App Check debug tokens BEFORE Firebase initialization
  const isDebugMode = window.FIREBASE_CONFIG.appCheckDebugToken === true || 
                      (typeof window.FIREBASE_CONFIG.appCheckDebugToken === 'string' && window.FIREBASE_CONFIG.appCheckDebugToken.length > 0);
  
  if (isDebugMode) {
    if (window.FIREBASE_CONFIG.appCheckDebugToken === true) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.info('[Firebase Init] App Check DEBUG MODE enabled (all requests allowed). Development only!');
    } else {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = window.FIREBASE_CONFIG.appCheckDebugToken;
      console.info('[Firebase Init] App Check custom debug token configured.');
    }
  }

  // Initialize Firebase app
  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    console.log('[Firebase Init] Firebase app initialized');
  } else {
    console.log('[Firebase Init] Firebase app already initialized');
  }

  // Activate App Check ONLY in production mode (not debug mode)
  if (!isDebugMode && window.FIREBASE_CONFIG.appCheckSiteKey && firebase.appCheck) {
    try {
      firebase.appCheck().activate(window.FIREBASE_CONFIG.appCheckSiteKey, true);
      console.info('[Firebase Init] App Check reCAPTCHA provider activated for production');
    } catch (error) {
      console.warn('[Firebase Init] App Check activation failed:', error.message);
    }
  } else if (isDebugMode) {
    console.log('[Firebase Init] Skipping App Check activation (debug mode - requests will bypass validation)');
  }

  // Set up global auth and db references with error handling
  try {
    window.auth = firebase.auth();
    console.log('[Firebase Init] Auth reference created');
  } catch (error) {
    console.error('[Firebase Init] Failed to create auth reference:', error);
  }

  try {
    window.db = firebase.database();
    console.log('[Firebase Init] Database reference created');
  } catch (error) {
    console.error('[Firebase Init] Failed to create database reference:', error);
  }

  console.log('[Firebase Init] Initialization complete. Firebase is ready.');
})();
})();
