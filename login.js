import { auth } from './firebase.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const phoneInput = document.getElementById('phone');
const passInput = document.getElementById('password');
const btn = document.querySelector('.login-submit-btn');
const googleBtn = document.querySelector('.login-google-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const loginForm = document.querySelector('.login-form');

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    if (phoneInput.value.length < 10) {
      showError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (passInput.value.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    authError.style.display = "none";
    
    btn.textContent = 'Logging in...';
    btn.style.opacity = '0.8';

    // Format as email for Firebase
    const fakeEmail = `${phoneInput.value.trim()}@kad-multiplier.com`;

    signInWithEmailAndPassword(auth, fakeEmail, passInput.value)
      .then((userCredential) => {
        // Success
        btn.style.background = '#10b981';
        btn.textContent = 'Success!';
        
        localStorage.setItem('isLoggedIn', 'true');
        
        if (window.gsap) {
          window.gsap.to('.blob-character', {
            y: -15, scale: 1.1, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.out"
          });
        }

        setTimeout(() => {
          window.location.href = 'account.html'; 
        }, 800);
      })
      .catch((error) => {
        console.error(error);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          showError("Account doesn't exist or wrong password. Please create an account.");
        } else if (error.code === 'auth/wrong-password') {
          showError("Wrong password. Please try again.");
        } else {
          showError("Invalid phone number or password.");
        }
        
        btn.textContent = 'Log In';
        btn.style.opacity = '1';
      });
  });
}

// Google Login
if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    googleBtn.textContent = 'Connecting...';
    googleBtn.style.opacity = '0.8';
    
    signInWithPopup(auth, provider)
      .then((result) => {
        // Success
        googleBtn.textContent = 'Success!';
        localStorage.setItem('isLoggedIn', 'true');
        setTimeout(() => {
          window.location.href = 'account.html';
        }, 800);
      })
      .catch((error) => {
        console.error(error);
        showError("Google login failed.");
        googleBtn.textContent = 'Log in with Google';
        googleBtn.style.opacity = '1';
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
