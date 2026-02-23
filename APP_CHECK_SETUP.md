# App Check Setup (reCAPTCHA v3) — Battle Tourney

Use this guide to register App Check correctly and make the app work both in production and on localhost.

## What App Check does

App Check helps Firebase verify requests are coming from your real app (not bots/scripts abusing your database).

---

## Part A: Register App Check in Firebase Console

1. Open Firebase Console: https://console.firebase.google.com/project/battletour-9dc70/overview
2. In left menu, go to **Build → App Check**.
3. In the apps list, select your **Web app** (`battletour-9dc70`).
4. Click **Register**.
5. Provider: choose **reCAPTCHA v3**.
6. Save and copy the **site key**.

---

## Part B: Add the site key in code

1. Open [public/firebase-config.js](public/firebase-config.js).
2. Set:

```js
appCheckSiteKey: "YOUR_RECAPTCHA_V3_SITE_KEY",
appCheckDebugToken: false
```

3. Save.

---

## Part C: Deploy hosting after key update

```powershell
cd "c:\Users\moham\Downloads\Projects\github\tour1"
npx firebase-tools deploy --only hosting
```

---

## Part D: Enable enforcement safely

In **Firebase Console → App Check**:

1. Open **Realtime Database** App Check section.
2. Start with **Monitoring** mode first (recommended).
3. Verify your app requests appear as valid.
4. Then switch to **Enforced**.

---

## Localhost development (important)

reCAPTCHA may block local development if not configured for localhost. Use debug token mode locally:

1. In [public/firebase-config.js](public/firebase-config.js), set:

```js
appCheckDebugToken: true
```

2. Run local app:

```powershell
npm run serve
```

3. Open browser console and copy the shown debug token.
4. In Firebase Console → App Check → **Manage debug tokens**, add that token.
5. Keep `appCheckDebugToken: true` only for local testing.
6. Before production deploy, set it back to `false`.

---

## Quick verification checklist

- Signup/login works.
- Create tournament works.
- No `PERMISSION_DENIED` for valid logged-in actions.
- App Check panel shows recent accepted requests.

---

## Common issues

- **Still blocked after setting key**  
  Deploy hosting again and hard refresh browser (`Ctrl+F5`).

- **App Check warning persists**  
  Ensure you registered the same web app used by `appId` in `firebase-config.js`.

- **Works locally but fails in production**  
  Set `appCheckDebugToken` back to `false` before prod deploy.
