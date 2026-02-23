# Battle Tourney (Firebase)

Battle Tourney is a simple tournament web app using Firebase Authentication + Realtime Database.

## What was fixed

- Removed insecure password storage in Realtime Database.
- Added auth-guarded dashboard access.
- Rebuilt create/join/list tournament flow with validation.
- Added Firebase Realtime Database security rules.
- Added safer headers via Firebase Hosting config.

## Project structure

- `public/index.html` - Login and signup page
- `public/loginINpage.html` - Authenticated dashboard
- `public/auth.js` - Login/signup logic
- `public/app.js` - Tournament create/join/list + bracket preview
- `public/firebase-init.js` - Firebase initialization guard
- `public/firebase-config.js` - Active Firebase config
- `database.rules.json` - Realtime Database security rules
- `firebase.json` - Hosting + headers + rules mapping

## Local run

```powershell
npm run serve
```

Then open: `http://localhost:8000`

## Firebase deploy

1. Install Firebase CLI (if needed):

```powershell
npm install -g firebase-tools
```

2. Login and link your project:

```powershell
firebase login
firebase use --add
```

Current default project is `battle-tourney` (see [.firebaserc](.firebaserc)).

3. Deploy hosting + database rules:

```powershell
npm run deploy
```

## Conduct tournaments quickly (demo + real users)

1. Login with one account and open dashboard.
2. Click **Load Demo Tournaments** to seed 7 tournaments with preloaded teams.
3. Open the same app in Incognito/another browser and sign up additional users.
4. Join the same tournament from different users and use **View Fixtures**.

This gives immediate fixtures from demo teams and live participant joins from real users.

## App Check registration (recommended)

1. In Firebase Console, open `Build -> App Check`.
2. Select your Web app (`battle-tourney`) and click `Register`.
3. Choose `reCAPTCHA v3` provider and copy the site key.
4. Put that key in `public/firebase-config.js` as `appCheckSiteKey`.
5. Deploy hosting again:

```powershell
npx firebase-tools deploy --only hosting
```

Detailed walkthrough: [APP_CHECK_SETUP.md](APP_CHECK_SETUP.md)

## Security notes

- Frontend Firebase config is public by design; security is enforced by Authentication and Database Rules.
- Keep `public/firebase-config.js` out of Git history (already in `.gitignore`).
- Rules now allow:
	- users to read/write their own `profiles/{uid}`
	- authenticated users to read tournaments
	- participants to only write their own participant record

## Live URL

https://battle-tourney.web.app/
