import './lenis-init.js';
import { auth } from './firebase.js';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const phoneInput = document.getElementById('phone');
const otpInput = document.getElementById('otp');
const otpLabel = document.getElementById('otp-label');
const mainBtn = document.getElementById('main-auth-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const loginForm = document.querySelector('.login-form');

let confirmationResult = null;

// Initialize invisible reCAPTCHA
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible',
  'callback': (response) => {
    // reCAPTCHA solved
  }
});

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!confirmationResult) {
      // Phase 1: Send OTP
      const phoneVal = phoneInput.value.trim();
      if (phoneVal.length < 10) {
        showError("Please enter a valid 10-digit phone number.");
        return;
      }
      
      // Assuming India based on context
      const phoneNumber = "+91" + phoneVal;
      
      mainBtn.textContent = 'Sending OTP...';
      mainBtn.style.opacity = '0.7';
      authError.style.display = 'none';

      signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
        .then((result) => {
          confirmationResult = result;
          
          // UI Updates for Phase 2: Enter OTP
          otpInput.style.display = 'block';
          otpLabel.style.display = 'block';
          mainBtn.textContent = 'Verify & Login';
          mainBtn.style.opacity = '1';
          
          // Force reflow and focus
          setTimeout(() => {
            otpInput.focus();
          }, 100);
          
        }).catch((error) => {
          console.error("SMS Error:", error);
          let msg = "Failed to send OTP. Please try again.";
          if (error.code === 'auth/invalid-phone-number') msg = "Invalid phone number format.";
          if (error.code === 'auth/too-many-requests') msg = "Too many requests. Try again later.";
          
          showError(msg);
          mainBtn.textContent = 'Send OTP Code';
          mainBtn.style.opacity = '1';
          
          // Reset recaptcha on error so they can try again
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.render().then(function(widgetId) {
              grecaptcha.reset(widgetId);
            }).catch(()=>{}); // ignore if not rendered
          }
        });
    } else {
      // Phase 2: Verify OTP
      const otpVal = otpInput.value.trim();
      if (otpVal.length < 6) {
        showError("Please enter the 6-digit code.");
        return;
      }
      
      mainBtn.textContent = 'Verifying...';
      mainBtn.style.opacity = '0.7';
      authError.style.display = 'none';

      confirmationResult.confirm(otpVal).then((result) => {
        // User signed in successfully.
        const user = result.user;
        
        mainBtn.style.background = '#10b981'; // Success green
        mainBtn.textContent = 'Success!';
        
        // Save state
        localStorage.setItem('isLoggedIn', 'true');
        
        // Animate blobs for success
        if (window.gsap) {
          window.gsap.to('.blob-character', {
            y: -15, scale: 1.1, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.out"
          });
        }

        setTimeout(() => {
          window.location.href = 'account.html';
        }, 800);
        
      }).catch((error) => {
        console.error("OTP Error:", error);
        showError("Invalid OTP code. Try again.");
        mainBtn.textContent = 'Verify & Login';
        mainBtn.style.opacity = '1';
      });
    }
  });
}

function showError(msg) {
  authErrorText.textContent = msg;
  authError.style.display = "flex";
  if (window.gsap) {
    window.gsap.fromTo(authError, { x: -5 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5 });
  }
}
