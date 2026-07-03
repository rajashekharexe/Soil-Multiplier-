import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const passInput = document.getElementById('password');
const confirmPassInput = document.getElementById('confirm-password');
const btn = document.querySelector('.login-submit-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const registerForm = document.querySelector('.login-form');

if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    if (nameInput.value.trim().length < 2) {
      showError("Please enter your full name.");
      return;
    }

    if (phoneInput.value.length < 10) {
      showError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (passInput.value.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    if (passInput.value !== confirmPassInput.value) {
      showError("Passwords do not match.");
      return;
    }

    authError.style.display = "none";
    
    btn.textContent = 'Creating Account...';
    btn.style.opacity = '0.8';

    // Format as email for Firebase
    const fakeEmail = `${phoneInput.value.trim()}@kad-multiplier.com`;

    createUserWithEmailAndPassword(auth, fakeEmail, passInput.value)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        try {
          await setDoc(doc(db, "users", user.uid), {
            name: nameInput.value.trim(),
            phone: "+91" + phoneInput.value.trim(),
            createdAt: new Date().toISOString()
          });
        } catch (dbError) {
          console.error("Error saving user profile:", dbError);
        }

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
        if (error.code === 'auth/email-already-in-use') {
          showError("This phone number is already registered.");
        } else {
          showError("Registration failed. Please try again.");
        }
        btn.textContent = 'Sign Up';
        btn.style.opacity = '1';
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
