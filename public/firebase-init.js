(function initializeFirebase() {
  console.log('[Firebase Init] Starting initialization...');

  if (!window.FIREBASE_CONFIG) {
    const error = 'Missing Firebase configuration. Copy firebase-config.example.js to firebase-config.js and fill your project values.';
    console.error('[Firebase Init]', error);
    throw new Error(error);
  }

  const config = window.FIREBASE_CONFIG;
  const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter((key) => !config[key] || typeof config[key] !== 'string');
  if (missingKeys.length > 0) {
    const error = `Invalid Firebase configuration. Missing keys: ${missingKeys.join(', ')}`;
    console.error('[Firebase Init]', error);
    throw new Error(error);
  }

  if (config.apiKey.indexOf('YOUR_') !== -1) {
    const error = 'Firebase apiKey is a placeholder. Update public/firebase-config.js with real project credentials.';
    console.error('[Firebase Init]', error);
    throw new Error(error);
  }

  const isDebugMode = config.appCheckDebugToken === true
    || (typeof config.appCheckDebugToken === 'string' && config.appCheckDebugToken.length > 0);
  const appCheckEnabled = config.enableAppCheck === true;

  if (isDebugMode) {
    if (config.appCheckDebugToken === true) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.info('[Firebase Init] App Check DEBUG MODE enabled.');
    } else {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = config.appCheckDebugToken;
      console.info('[Firebase Init] App Check custom debug token configured.');
    }
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
    console.log('[Firebase Init] Firebase app initialized');
  } else {
    console.log('[Firebase Init] Firebase app already initialized');
  }

  const shouldActivateAppCheck = (appCheckEnabled || isDebugMode) && !!config.appCheckSiteKey && !!firebase.appCheck;

  if (shouldActivateAppCheck) {
    try {
      firebase.appCheck().activate(config.appCheckSiteKey, true);
      if (isDebugMode) {
        console.info('[Firebase Init] App Check activated in DEBUG mode');
      } else {
        console.info('[Firebase Init] App Check activated for production');
      }
    } catch (error) {
      console.warn('[Firebase Init] App Check activation failed:', error.message);
    }
  } else if (appCheckEnabled || isDebugMode) {
    console.warn('[Firebase Init] App Check requested but appCheckSiteKey/firebase.appCheck is missing');
  } else {
    console.log('[Firebase Init] App Check disabled by config');
  }

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

  console.log('[Firebase Init] Initialization complete');
}());

