// nav.js - Shared Navigation & Mock Auth Logic
document.addEventListener('DOMContentLoaded', () => {
  const profileSection = document.getElementById('profile-section');
  const profileBtn = document.getElementById('profile-btn');
  const authOutState = document.getElementById('auth-out-state');
  const authInState = document.getElementById('auth-in-state');
  const logoutBtn = document.getElementById('logout-btn');

  if (profileBtn && profileSection) {
    // Check mock auth state
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      if (authOutState) authOutState.style.display = 'none';
      if (authInState) authInState.style.display = 'block';
    } else {
      if (authOutState) authOutState.style.display = 'block';
      if (authInState) authInState.style.display = 'none';
    }

    // Toggle dropdown
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileSection.classList.toggle('active');
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!profileSection.contains(e.target)) {
        profileSection.classList.remove('active');
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'index.html'; // Redirect to home after logout
    });
  }
});
