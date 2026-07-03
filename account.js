// account.js - Account Dashboard Logic with Firebase Backend

import './lenis-init.js';
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadData();
    } else {
      // Redirect to login if not authenticated
      window.location.href = 'login.html';
    }
  });
});

// --- Tab Switching Logic ---
function initTabs() {
  const tabs = document.querySelectorAll('.tab-item:not(.logout)');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
      });
    });
  }
}


// --- Data Loading & Rendering ---
async function loadData() {
  if (!currentUser) return;
  
  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profPhone = document.getElementById('prof-phone');

  // --- Step 1: Always populate from Firebase Auth immediately ---
  // Email: show real Google email, hide fake phone-based email
  if (currentUser.email && !currentUser.email.endsWith('@kad-multiplier.com')) {
    profEmail.value = currentUser.email;
  }
  // Name from Google auth
  if (currentUser.displayName) {
    profName.value = currentUser.displayName;
  }

  // --- Step 2: Try to enrich from Firestore ---
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // Override name from Firestore if available (user may have updated it)
      if (data.name) profName.value = data.name;
      
      // Set phone - strip +91 prefix for display
      let phone = data.phone || '';
      if (phone.startsWith('+91')) phone = phone.substring(3);
      if (phone) profPhone.value = phone;

      // For phone users: email won't be in auth, check Firestore
      if (!profEmail.value && data.email && !data.email.endsWith('@kad-multiplier.com')) {
        profEmail.value = data.email;
      }
    }
  } catch (error) {
    console.error("Firestore read error (check security rules):", error);
  }

  renderAddresses();
  renderOrders();
}

// Profile Save Event
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-profile-btn');
  const errorBox = document.getElementById('profile-error');
  const nameVal = document.getElementById('prof-name').value.trim();
  const phoneVal = document.getElementById('prof-phone').value.trim();
  
  errorBox.style.display = 'none';

  if (nameVal.length < 2 || phoneVal.length < 10) {
    errorBox.textContent = "Please fill out both your Full Name and a valid Phone Number.";
    errorBox.style.display = 'block';
    return;
  }

  btn.textContent = 'Saving...';
  
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      name: nameVal,
      phone: "+91" + phoneVal,
      email: currentUser.email && !currentUser.email.endsWith('@kad-multiplier.com') ? currentUser.email : "",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setTimeout(() => {
      btn.style.background = '#10b981';
      btn.textContent = 'Saved!';
      setTimeout(() => {
        btn.textContent = 'Save Changes';
        btn.style.background = '';
      }, 2000);
    }, 500);
  } catch (error) {
    console.error("Error saving profile:", error);
    errorBox.textContent = "Error saving profile. Please try again.";
    errorBox.style.display = 'block';
    btn.textContent = 'Save Changes';
  }
});


// --- Address Logic (MOCK - Keep as is for UI testing until backend address support) ---
const addressFormContainer = document.getElementById('address-form-container');
const btnAddAddress = document.getElementById('btn-add-address');
const btnCancelAddress = document.getElementById('btn-cancel-address');
const addressForm = document.getElementById('address-form');

if (btnAddAddress && btnCancelAddress && addressForm) {
  btnAddAddress.addEventListener('click', () => {
    addressFormContainer.style.display = 'block';
    btnAddAddress.style.display = 'none';
  });

  btnCancelAddress.addEventListener('click', () => {
    addressFormContainer.style.display = 'none';
    btnAddAddress.style.display = 'block';
    addressForm.reset();
  });

  addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let addresses = JSON.parse(localStorage.getItem('kadAddresses')) || [];
    
    const newAddress = {
      id: 'addr_' + Date.now(),
      name: document.getElementById('addr-name').value,
      phone: document.getElementById('addr-phone').value,
      house: document.getElementById('addr-house').value,
      area: document.getElementById('addr-area').value,
      city: document.getElementById('addr-city').value,
      state: document.getElementById('addr-state').value,
      pin: document.getElementById('addr-pin').value,
      label: document.getElementById('addr-label').value,
      isDefault: document.getElementById('addr-default').checked
    };

    if (newAddress.isDefault) {
      addresses.forEach(a => a.isDefault = false);
    }

    addresses.push(newAddress);
    localStorage.setItem('kadAddresses', JSON.stringify(addresses));
    
    addressFormContainer.style.display = 'none';
    btnAddAddress.style.display = 'block';
    addressForm.reset();
    renderAddresses();
  });
}

function renderAddresses() {
  const list = document.getElementById('address-list');
  if (!list) return;
  
  let addresses = JSON.parse(localStorage.getItem('kadAddresses')) || [];
  if (addresses.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted); padding: 1rem 0;">No saved addresses yet. Add one below.</p>';
    return;
  }

  list.innerHTML = '';
  
  addresses.forEach(addr => {
    const card = document.createElement('div');
    card.className = `card-box ${addr.isDefault ? 'default' : ''}`;
    card.innerHTML = `
      ${addr.isDefault ? '<div class="card-badge">Default</div>' : ''}
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
        <h3 style="margin: 0;">${addr.label}</h3>
      </div>
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-color);">${addr.name || 'John Doe'} | ${addr.phone || '+91 9876543210'}</p>
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${addr.house || addr.street || ''}, ${addr.area || ''}</p>
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${addr.city || ''}, ${addr.state || ''}</p>
      <p style="color: #718096; font-size: 0.95rem;">PIN: ${addr.pin || ''}</p>
      <div class="card-actions">
        <button class="btn-outline" onclick="deleteAddress('${addr.id}')">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

window.deleteAddress = (id) => {
  if(!confirm('Are you sure you want to delete this address?')) return;
  let addresses = JSON.parse(localStorage.getItem('kadAddresses')) || [];
  addresses = addresses.filter(a => a.id !== id);
  localStorage.setItem('kadAddresses', JSON.stringify(addresses));
  renderAddresses();
};


// --- Orders Logic (REAL FIREBASE DATA) ---
async function renderOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;
  
  list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading orders...</p>';
  
  if (!currentUser) return;
  
  try {
    const q = query(collection(db, "orders"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">You have no past orders.</p>';
      return;
    }

    list.innerHTML = '';
    // sort locally by date
    const orders = [];
    querySnapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    orders.forEach(ord => {
      let statusClass = 'processing';
      if(ord.status === 'Completed') statusClass = 'delivered';
      if(ord.status === 'Cancelled') statusClass = 'cancelled';

      const dateStr = new Date(ord.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      
      let itemsStr = '';
      if (ord.items && Array.isArray(ord.items)) {
         itemsStr = ord.items.map(i => `${i.qty}x ${i.title}`).join(', ');
      }

      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="order-header">
          <div class="order-meta">
            <div class="meta-block">
              <p>Order Placed</p>
              <span>${dateStr}</span>
            </div>
            <div class="meta-block">
              <p>Total</p>
              <span>₹${ord.total.toLocaleString('en-IN')}</span>
            </div>
            <div class="meta-block">
              <p>Order ID</p>
              <span>${ord.id.slice(-6).toUpperCase()}</span>
            </div>
          </div>
          <div class="order-status status ${statusClass}">${ord.status || 'Processing'}</div>
        </div>
        <div class="order-body">
          <div class="order-items">
            <p>${itemsStr}</p>
          </div>
          <div class="order-actions">
            <button class="btn-outline">Track</button>
            <button class="btn-outline">Invoice</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #ff4d4f;">Error loading orders.</p>';
  }
}

// --- Payment Preference Logic ---
const paymentRadios = document.querySelectorAll('input[name="payment-pref"]');
const savedPref = localStorage.getItem('paymentPref');
if (savedPref) {
  paymentRadios.forEach(radio => {
    if (radio.value === savedPref) radio.checked = true;
  });
}
paymentRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.checked) {
      localStorage.setItem('paymentPref', e.target.value);
    }
  });
});
