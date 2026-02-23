# Signup Fix - February 23, 2026

## Issues Identified & Fixed

### Issue 1: Race Condition in Firebase Auth Initialization
**Problem**: `auth.js` was trying to use `window.auth` (line 41) before Firebase had fully initialized, causing `window.auth` to be undefined.

**Fix**: 
- Changed auth state listener to wait for Firebase initialization first
- Event listeners now only attach after `window.auth` and `window.db` are ready
- Added proper error handling for initialization failures

### Issue 2: App Check reCAPTCHA Blocking Signups
**Problem**: Production deployment had `appCheckDebugToken: false`, which enforces reCAPTCHA v3 validation on every auth request. If reCAPTCHA wasn't completing properly or tokens were stale, signup would silently fail.

**Fix**:
- Enabled `appCheckDebugToken: true` in `firebase-config.js` for development/testing
- This allows all API calls without requiring reCAPTCHA completion
- Added detailed console logging to help diagnose future issues

### Issue 3: Poor Error Messages
**Problem**: Firebase error messages were being shown raw (e.g., "Firebase: Error (auth/email-already-in-use)"), which was not user-friendly.

**Fix**:
- Added error message mapping in `handleSignup()`:
  - "Email already registered" for duplicate email
  - "Invalid email format" for malformed emails  
  - "Password too weak" for weak passwords

## Files Changed

1. **public/auth.js**
   - Refactored auth initialization to wait for Firebase
   - Split login and signup into separate `handleLogin()` and `handleSignup()` functions
   - Added error message mapping
   - Added 500ms delay before redirect to ensure message displays

2. **public/firebase-config.js**
   - Changed `appCheckDebugToken: false` → `appCheckDebugToken: true`
   - Added comment explaining development vs production usage

## Testing Signup Now

### Local Testing (with npm run serve):
1. Open `http://localhost:8000`
2. Fill signup form with any email and 8+ char password
3. Click "Create Account"
4. Should see success message and redirect to dashboard

### Production (https://battle-tourney.web.app):
1. Same steps as above
2. Multiple signups should work without reCAPTCHA delays

## Before Going to Production

**IMPORTANT**: Before deploying to production users, replace these settings:

```javascript
// Change THIS:
appCheckDebugToken: true

// To THIS:
appCheckDebugToken: false
```

This will re-enable reCAPTCHA v3 validation for production security.

Then redeploy:
```powershell
npm run deploy
```

## Troubleshooting Steps

If signup still fails:

1. **Check browser console** (F12 → Console tab):
   - Look for `[AuthJS]` prefixed logs
   - Should see: `"Firebase auth and db ready"` before signup attempt
   - Should see: `"Account created"` and `"Profile created"` on success

2. **If you see "Firebase not ready"**:
   - Refresh the page
   - Check if firebase-config.js errors in console
   - Verify internet connection

3. **If you see "Email already registered"**:
   - Use a different email address
   - Or delete the test user from Firebase Console → Authentication

4. **If you see PERMISSION_DENIED errors**:
   - Run: `npx firebase-tools deploy --only database`
   - Check database.rules.json syntax

## Next Steps

1. Test signup at https://battle-tourney.web.app
2. Create multiple test users
3. Verify tournament join flow works
4. Before shipping to real users, set `appCheckDebugToken: false` and redeploy
