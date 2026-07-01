import './lenis-init.js';
import { auth, db } from './firebase.js';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const otpInput = document.getElementById('otp');
const otpLabel = document.getElementById('otp-label');
const mainBtn = document.getElementById('main-auth-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const registerForm = document.querySelector('.login-form');

let confirmationResult = null;

// Initialize invisible reCAPTCHA
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible',
  'callback': (response) => {
    // reCAPTCHA solved
  }
});

if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!confirmationResult) {
      // Phase 1: Send OTP
      const nameVal = nameInput.value.trim();
      const phoneVal = phoneInput.value.trim();
      
      if (nameVal.length < 2) {
        showError("Please enter your full name.");
        return;
      }
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
          
          otpInput.style.display = 'block';
          otpLabel.style.display = 'block';
          mainBtn.textContent = 'Verify & Create Account';
          mainBtn.style.opacity = '1';
          
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
          
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.render().then(function(widgetId) {
              grecaptcha.reset(widgetId);
            }).catch(()=>{});
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

      confirmationResult.confirm(otpVal).then(async (result) => {
        // User signed in successfully.
        const user = result.user;
        
        // Save user profile to Firestore
        try {
          await setDoc(doc(db, "users", user.uid), {
            name: nameInput.value.trim(),
            phone: user.phoneNumber,
            createdAt: new Date().toISOString()
          }, { merge: true }); // Merge prevents overwriting existing data if they re-register
        } catch (dbError) {
          console.error("Error saving user profile:", dbError);
        }
        
        mainBtn.style.background = '#10b981'; // Success green
        mainBtn.textContent = 'Success!';
        
        localStorage.setItem('isLoggedIn', 'true');
        
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
        mainBtn.textContent = 'Verify & Create Account';
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
