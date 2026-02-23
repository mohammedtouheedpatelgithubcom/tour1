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

// Wait for Firebase to be ready before setting up event listeners
function waitForFirebaseAuth() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (window.auth && window.db) {
        clearInterval(checkInterval);
        console.log('[AuthJS] Firebase auth and db ready');
        resolve();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        reject(new Error('Firebase failed to initialize after 10 seconds'));
      }
      attempts++;
    }, 100);
  });
}

// Initialize auth listener after Firebase is ready
waitForFirebaseAuth().then(() => {
  console.log('[AuthJS] Setting up auth state listener');
  window.auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('[AuthJS] User already logged in, redirecting to dashboard');
      window.location.replace('loginINpage.html');
    }
  });
  
  // Set up form listeners
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}).catch(error => {
  console.error('[AuthJS] Firebase auth initialization failed:', error);
  setMessage('Firebase failed to load. Please refresh the page.', 'error');
});

async function handleLogin(event) {
  event.preventDefault();
  
  if (!window.auth) {
    setMessage('Firebase not ready. Please refresh the page.', 'error');
    return;
  }

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
    setTimeout(() => {
      window.location.replace('loginINpage.html');
    }, 500);
  } catch (error) {
    console.error('[AuthJS] Login error:', error);
    setMessage(error.message || 'Login failed', 'error');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  
  if (!window.auth || !window.db) {
    setMessage('Firebase not ready. Please refresh the page.', 'error');
    return;
  }

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
    
    await window.db.ref(`profiles/${userCredential.user.uid}`).set({
      email,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    console.log('[AuthJS] Profile created, signup complete');
    setMessage('Account created. Redirecting...', 'success');
    setTimeout(() => {
      window.location.replace('loginINpage.html');
    }, 500);
  } catch (error) {
    console.error('[AuthJS] Signup error:', error);
    const msg = error.message || 'Signup failed';
    // Map common Firebase errors to user-friendly messages
    let displayMsg = msg;
    if (msg.includes('already in use')) {
      displayMsg = 'Email already registered';
    } else if (msg.includes('invalid-email')) {
      displayMsg = 'Invalid email format';
    } else if (msg.includes('weak-password')) {
      displayMsg = 'Password too weak (min 8 characters, preferably with numbers/symbols)';
    }
    setMessage(displayMsg, 'error');
  }
}
