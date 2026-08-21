import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, deleteUser } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const passInput = document.getElementById('password');
const confirmPassInput = document.getElementById('confirm-password');
const btn = document.querySelector('.login-submit-btn');
const googleBtn = document.querySelector('.login-google-btn');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');
const registerForm = document.querySelector('.login-form');

// Password strength: min 8 chars, at least 1 uppercase, 1 number, 1 special char
function validatePassword(p) {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(p)) return "Password must contain at least one number.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(p)) return "Password must contain at least one special character (e.g. @, #, !).";
  return null;
}

if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameVal = nameInput.value.trim();
    const phoneVal = phoneInput.value.trim();
    const passVal = passInput.value;
    const confirmVal = confirmPassInput.value;

    // Security Check: Anti-Bot Honeypot Trap
    const hpVal = document.getElementById('reg-hp')?.value;
    if (hpVal) {
      // Bot detected! Abort silently and pretend to load
      return;
    }

    if (nameVal.length < 2) { showError("Please enter your full name (at least 2 characters)."); return; }
    if (!/^[6-9]\d{9}$/.test(phoneVal)) { showError("Please enter a valid 10-digit Indian mobile number starting with 6–9."); return; }

    const lastReg = localStorage.getItem('lastRegistrationTime');
    if (lastReg && (Date.now() - parseInt(lastReg)) < 60000) {
      showError("Please wait a minute before creating another account.");
      return;
    }

    const passError = validatePassword(passVal);
    if (passError) { showError(passError); return; }

    if (passVal !== confirmVal) { showError("Passwords do not match."); return; }

    authError.style.display = "none";
    btn.textContent = 'Creating Account...';
    btn.style.opacity = '0.8';
    btn.disabled = true;

    const fakeEmail = `${phoneVal}@kad-multiplier.com`;

    // Extra security: block any admin-domain email from being registered
    if (fakeEmail.includes('@admin.com')) {
      showError("Registration blocked. Please contact support.");
      btn.textContent = 'Sign Up';
      btn.style.opacity = '1';
      btn.disabled = false;
      return;
    }

    createUserWithEmailAndPassword(auth, fakeEmail, passVal)
      .then(async (userCredential) => {
        const user = userCredential.user;
        try {
          await setDoc(doc(db, "users", user.uid), {
            name: nameVal,
            phone: "+91" + phoneVal,
            createdAt: new Date().toISOString()
          });
        } catch (dbError) {
          console.error("Error saving user profile:", dbError);
          await deleteUser(user);
          showError("Database error during registration. Please try again.");
          btn.textContent = 'Sign Up';
          btn.style.opacity = '1';
          btn.disabled = false;
          return;
        }

        btn.style.background = '#10b981';
        btn.textContent = 'Success!';
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('lastRegistrationTime', Date.now().toString());

        if (window.gsap) {
          window.gsap.to('.blob-character', {
            y: -15, scale: 1.1, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.out"
          });
        }
        setTimeout(() => { window.location.href = 'account.html'; }, 800);
      })
      .catch((error) => {
        console.error(error);
        let msg = "Registration failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
          msg = "This phone number is already registered. Please log in instead.";
        } else if (error.code === 'auth/weak-password') {
          msg = "Password is too weak. Please use a stronger password.";
        } else if (error.code === 'auth/network-request-failed') {
          msg = "No internet connection. Please check your network.";
        } else if (error.code === 'auth/popup-blocked') {
          msg = "Popup was blocked by your browser. Please allow popups and try again.";
        }
        showError(msg);
        btn.textContent = 'Sign Up';
        btn.style.opacity = '1';
        btn.disabled = false;
      });
  });
}

if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    googleBtn.textContent = 'Connecting...';
    googleBtn.style.opacity = '0.8';
    googleBtn.disabled = true;

    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        try {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              name: user.displayName || "",
              email: user.email || "",
              phone: "",
              createdAt: new Date().toISOString()
            });
          } else {
            await setDoc(userRef, {
              name: user.displayName || "",
              email: user.email || ""
            }, { merge: true });
          }
        } catch (dbError) {
          console.error("Error saving user profile:", dbError);
          await deleteUser(user);
          showError("Database error during Google login. Please try again.");
          googleBtn.textContent = 'Sign Up with Google';
          googleBtn.style.opacity = '1';
          googleBtn.disabled = false;
          return;
        }
        googleBtn.textContent = 'Success!';
        localStorage.setItem('isLoggedIn', 'true');
        setTimeout(() => { window.location.href = 'account.html'; }, 800);
      })
      .catch((error) => {
        console.error(error);
        let msg = "Google sign-up failed. Please try again.";
        if (error.code === 'auth/popup-blocked') {
          msg = "Popup was blocked. Please allow popups for this site.";
        } else if (error.code === 'auth/popup-closed-by-user') {
          msg = "Sign-up was cancelled. Please try again.";
        } else if (error.code === 'auth/network-request-failed') {
          msg = "No internet connection. Please check your network.";
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          msg = "An account already exists with this email. Please log in instead.";
        }
        showError(msg);
        googleBtn.textContent = 'Sign Up with Google';
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
