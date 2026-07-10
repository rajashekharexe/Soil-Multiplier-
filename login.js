import { auth } from './firebase.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const phoneInput = document.getElementById('phone');
const passInput = document.getElementById('password');
const btn = document.querySelector('.login-submit-btn');
const googleBtn = document.querySelector('.login-google-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const loginForm = document.querySelector('.login-form');

// Remove "Remember Me" if present (no-op, we leave checkbox UI but don't use it)

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const phoneVal = phoneInput.value.trim();
    const passVal = passInput.value;

    // Validation
    if (!/^[6-9]\d{9}$/.test(phoneVal)) {
      showError("Please enter a valid 10-digit Indian mobile number starting with 6–9.");
      return;
    }
    if (passVal.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    authError.style.display = "none";
    btn.textContent = 'Logging in...';
    btn.style.opacity = '0.8';
    btn.disabled = true;

    const fakeEmail = `${phoneVal}@kad-multiplier.com`;

    signInWithEmailAndPassword(auth, fakeEmail, passVal)
      .then(() => {
        btn.style.background = '#10b981';
        btn.textContent = 'Success!';
        localStorage.setItem('isLoggedIn', 'true');

        if (window.gsap) {
          window.gsap.to('.blob-character', {
            y: -15, scale: 1.1, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.out"
          });
        }

        // Redirect back to previous page if came from checkout, otherwise account
        const returnTo = sessionStorage.getItem('loginReturnTo') || 'account.html';
        sessionStorage.removeItem('loginReturnTo');
        setTimeout(() => { window.location.href = returnTo; }, 800);
      })
      .catch((error) => {
        console.error(error);
        let msg = "Invalid phone number or password.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          msg = "Wrong phone number or password. Please try again or create an account.";
        } else if (error.code === 'auth/too-many-requests') {
          msg = "Too many failed attempts. Please wait a few minutes before trying again.";
        } else if (error.code === 'auth/network-request-failed') {
          msg = "No internet connection. Please check your network and try again.";
        } else if (error.code === 'auth/popup-blocked') {
          msg = "Popup was blocked by your browser. Please allow popups and try again.";
        }
        showError(msg);
        btn.textContent = 'Log In';
        btn.style.opacity = '1';
        btn.disabled = false;
      });
  });
}

// Google Login
if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    googleBtn.textContent = 'Connecting...';
    googleBtn.style.opacity = '0.8';
    googleBtn.disabled = true;

    signInWithPopup(auth, provider)
      .then(() => {
        googleBtn.textContent = 'Success!';
        localStorage.setItem('isLoggedIn', 'true');
        const returnTo = sessionStorage.getItem('loginReturnTo') || 'account.html';
        sessionStorage.removeItem('loginReturnTo');
        setTimeout(() => { window.location.href = returnTo; }, 800);
      })
      .catch((error) => {
        console.error(error);
        let msg = "Google sign-in failed. Please try again.";
        if (error.code === 'auth/popup-blocked') {
          msg = "Popup was blocked by your browser. Please allow popups for this site and try again.";
        } else if (error.code === 'auth/popup-closed-by-user') {
          msg = "Sign-in was cancelled. Please try again.";
        } else if (error.code === 'auth/network-request-failed') {
          msg = "No internet connection. Please check your network.";
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          msg = "An account already exists with this email using a different sign-in method.";
        }
        showError(msg);
        googleBtn.textContent = 'Log in with Google';
        googleBtn.style.opacity = '1';
        googleBtn.disabled = false;
      });
  });
}

function showError(msg) {
  authErrorText.textContent = msg;
  authError.style.display = "flex";
  if (window.gsap) {
    window.gsap.fromTo(authError, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5 });
  }
}
