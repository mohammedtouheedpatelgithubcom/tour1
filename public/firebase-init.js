(function initializeFirebase() {
  console.log('[Firebase Init] Starting initialization...');
  
  if (!window.FIREBASE_CONFIG) {
    const error = 'Missing Firebase configuration. Copy firebase-config.example.js to firebase-config.js and fill your project values.';
    console.error('[Firebase Init]', error);
    throw new Error(error);
  }

  console.log('[Firebase Init] Firebase config loaded');

  // Handle App Check debug tokens
  if (window.FIREBASE_CONFIG.appCheckDebugToken === true) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.info('[Firebase Init] App Check debug token mode enabled (allow all). Use only for local development.');
  } else if (typeof window.FIREBASE_CONFIG.appCheckDebugToken === 'string' && window.FIREBASE_CONFIG.appCheckDebugToken.length > 0) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = window.FIREBASE_CONFIG.appCheckDebugToken;
    console.info('[Firebase Init] App Check debug token configured (custom token).');
  } else {
    console.log('[Firebase Init] No debug token mode - production reCAPTCHA validation enabled');
  }

  // Initialize Firebase app
  if (!firebase.apps.length) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    console.log('[Firebase Init] Firebase app initialized');
  } else {
    console.log('[Firebase Init] Firebase app already initialized');
  }

  // Activate App Check if configured
  if (window.FIREBASE_CONFIG.appCheckSiteKey && firebase.appCheck) {
    try {
      firebase.appCheck().activate(window.FIREBASE_CONFIG.appCheckSiteKey, true);
      console.info('[Firebase Init] App Check reCAPTCHA provider activated successfully');
    } catch (error) {
      console.warn('[Firebase Init] App Check activation failed (may be already activated):', error.message);
    }
  } else if (!window.FIREBASE_CONFIG.appCheckSiteKey) {
    console.warn('[Firebase Init] appCheckSiteKey is empty. Configure it in firebase-config.js and register App Check in Firebase Console for production.');
  } else if (!firebase.appCheck) {
    console.warn('[Firebase Init] firebase.appCheck not available - App Check SDK may not be loaded');
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
