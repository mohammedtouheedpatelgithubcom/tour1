const messageEl = document.getElementById('message');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

function setMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

// Wait for Firebase to be ready
function waitForFirebaseAuth() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (window.auth) {
        clearInterval(checkInterval);
        console.log('[AuthJS] Firebase auth ready');
        resolve();
      } else if (attempts > 50) {
        clearInterval(checkInterval);
        reject(new Error('Firebase auth failed to initialize after 5 seconds'));
      }
      attempts++;
    }, 100);
  });
}

waitForFirebaseAuth().catch(error => {
  console.error('[AuthJS] Firebase auth initialization failed:', error);
  setMessage('Firebase failed to load. Please refresh the page.', 'error');
});

window.auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('[AuthJS] User already logged in, redirecting to dashboard');
    window.location.replace('loginINpage.html');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = normalizeEmail(document.getElementById('loginEmail').value);
  const password = document.getElementById('loginPassword').value;

  if (!validatePassword(password)) {
    setMessage('Password must be at least 8 characters.', 'error');
    return;
  }

  try {
    console.log('[AuthJS] Attempting login for:', email);
    await window.auth.signInWithEmailAndPassword(email, password);
    console.log('[AuthJS] Login successful');
    setMessage('Login successful. Redirecting...', 'success');
    window.location.replace('loginINpage.html');
  } catch (error) {
    console.error('[AuthJS] Login error:', error);
    setMessage(error.message, 'error');
  }
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = normalizeEmail(document.getElementById('signupEmail').value);
  const password = document.getElementById('signupPassword').value;

  if (!validatePassword(password)) {
    setMessage('Password must be at least 8 characters.', 'error');
    return;
  }

  try {
    console.log('[AuthJS] Attempting signup for:', email);
    const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
    console.log('[AuthJS] Account created, writing profile for uid:', userCredential.user.uid);
    
    if (!window.db) {
      throw new Error('Database not ready');
    }
    
    await window.db.ref(`profiles/${userCredential.user.uid}`).set({
      email,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    console.log('[AuthJS] Profile created, signup complete');
    setMessage('Account created. Redirecting...', 'success');
    window.location.replace('loginINpage.html');
  } catch (error) {
    console.error('[AuthJS] Signup error:', error);
    setMessage(error.message, 'error');
  }
});
