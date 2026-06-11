import './lenis-init.js';
import gsap from 'gsap';

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('toggle-password');
const svg = document.getElementById('characters-svg');
const loginBtn = document.getElementById('login-btn');

// Character Elements
const blobs = gsap.utils.toArray('.blob');
const pupils = gsap.utils.toArray('.pupil');
const openEyes = gsap.utils.toArray('.eye-bg, .pupil');
const closedEyes = gsap.utils.toArray('.eye-closed');
const mouths = gsap.utils.toArray('.mouth');

// State
let isMouseTrackingEnabled = true;
let isPasswordVisible = false;

// 1. Initial Intro Animation
gsap.set(blobs, { y: 800 }); // Start them all below the screen

const introTl = gsap.timeline({ delay: 0.2 });
introTl.to('#pink-blob', { y: 0, duration: 1, ease: 'back.out(1.2)' })
       .to('#orange-blob', { y: 0, duration: 1, ease: 'back.out(1)' }, "-=0.7")
       .to('#purple-blob', { y: 0, duration: 1.2, ease: 'back.out(1)' }, "-=0.8")
       .to('#yellow-blob', { y: 0, duration: 1, ease: 'back.out(1.2)' }, "-=0.9");

// Subtle idle breathing animation
blobs.forEach((blob, i) => {
  gsap.to(blob, {
    scaleY: 0.97,
    scaleX: 1.02,
    duration: 1.5 + (i * 0.2),
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
});

// 2. Mouse Tracking Logic
// We map the mouse coordinates to a small boundary box for the pupils
function updatePupils(x, y) {
  if (!isMouseTrackingEnabled) return;

  const svgRect = svg.getBoundingClientRect();
  // Calculate relative mouse position (0 to 1)
  const relX = (x - svgRect.left) / svgRect.width;
  const relY = (y - svgRect.top) / svgRect.height;

  // Map 0-1 to an offset (e.g., -3 to 3 pixels)
  const moveX = (relX - 0.5) * 6;
  const moveY = (relY - 0.5) * 6;

  gsap.to(pupils, {
    x: moveX,
    y: moveY,
    duration: 0.2,
    ease: 'power2.out'
  });
}

window.addEventListener('mousemove', (e) => {
  updatePupils(e.clientX, e.clientY);
});

// 3. Focus Reactions

// When Email is focused, look at the email input
emailInput.addEventListener('focus', () => {
  isMouseTrackingEnabled = false;
  // Look up and right towards the form
  gsap.to(pupils, {
    x: 4,
    y: -3,
    duration: 0.4,
    ease: 'power2.out'
  });
});

emailInput.addEventListener('blur', () => {
  isMouseTrackingEnabled = true;
});

// When Password is focused, hide!
passwordInput.addEventListener('focus', () => {
  if (isPasswordVisible) return; // If password is visible, don't hide
  
  isMouseTrackingEnabled = false;
  
  const hideTl = gsap.timeline();
  
  // Squish bodies
  hideTl.to(blobs, {
    scaleY: 0.85,
    scaleX: 1.05,
    y: 20,
    duration: 0.4,
    ease: 'back.out(1.5)',
    stagger: 0.05
  }, 0);
  
  // Crossfade eyes from open to closed
  hideTl.to(openEyes, { opacity: 0, duration: 0.2 }, 0)
        .to(closedEyes, { opacity: 1, duration: 0.2 }, 0);
        
  // Hide mouths or change them
  hideTl.to(mouths, { scaleY: 0.2, transformOrigin: "center center", duration: 0.2 }, 0);
});

passwordInput.addEventListener('blur', () => {
  if (!isPasswordVisible) {
    unhideCharacters();
  }
});

function unhideCharacters() {
  const showTl = gsap.timeline();
  
  showTl.to(blobs, {
    scaleY: 1,
    scaleX: 1,
    y: 0,
    duration: 0.5,
    ease: 'back.out(1.5)'
  }, 0);
  
  showTl.to(closedEyes, { opacity: 0, duration: 0.2 }, 0)
        .to(openEyes, { opacity: 1, duration: 0.2 }, 0);
        
  showTl.to(mouths, { scaleY: 1, duration: 0.2 }, 0);
  
  setTimeout(() => {
    isMouseTrackingEnabled = true;
  }, 500);
}

// 4. Toggle Password Visibility
togglePasswordBtn.addEventListener('click', () => {
  isPasswordVisible = !isPasswordVisible;
  
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  if (isPasswordVisible) {
    // Reveal! Eyes wide open, looking at password
    const revealTl = gsap.timeline();
    
    // Restore bodies
    revealTl.to(blobs, { scaleY: 1, scaleX: 1, y: 0, duration: 0.4, ease: 'back.out(1)' }, 0);
    
    // Switch eyes to open
    revealTl.to(closedEyes, { opacity: 0, duration: 0.1 }, 0)
            .to(openEyes, { opacity: 1, duration: 0.1 }, 0);
            
    // Make pupils look at password
    revealTl.to(pupils, { x: 5, y: -2, duration: 0.2 }, 0);
    
    // Mouths 'O' shape (approximate by scaling)
    revealTl.to(mouths, { scaleY: 2, scaleX: 0.5, duration: 0.2 }, 0);
    
  } else {
    // Hide again if still focused
    if (document.activeElement === passwordInput) {
       // Re-trigger the hide animation
       passwordInput.blur();
       setTimeout(() => passwordInput.focus(), 10);
    } else {
      unhideCharacters();
    }
  }
});

// 5. Button Hover Reaction
loginBtn.addEventListener('mouseenter', () => {
  if (isMouseTrackingEnabled) {
    gsap.to(pupils, {
      x: 5,
      y: 2,
      duration: 0.3
    });
  }
});

// 6. Handle Form Submission
const loginForm = document.querySelector('.login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    
    // Simulate logging in by creating the user in our mock backend
    localStorage.setItem('kadUser', JSON.stringify({
      name: 'Ramesh Patel',
      email: emailInput.value,
      phone: '+91 9876543210'
    }));
    
    // Visual feedback
    loginBtn.textContent = 'Logging in...';
    loginBtn.style.opacity = '0.8';
    
    // Redirect to the new My Account dashboard
    setTimeout(() => {
      window.location.href = 'account.html';
    }, 800);
  });
}
