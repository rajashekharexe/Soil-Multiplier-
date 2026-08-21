import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import { showToast } from './toast.js';

let currentUser = null;

// XSS escape helper
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  loadData();
  setupTabs();
});

// --- Tab Setup ---
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-item');
  const panes = document.querySelectorAll('.tab-pane');

  // Mobile drawer elements
  const sidebar = document.getElementById('account-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  function openDrawer() {
    sidebar?.classList.add('drawer-open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar?.classList.remove('drawer-open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Hamburger opens drawer
  hamburgerBtn?.addEventListener('click', openDrawer);

  // Close button inside drawer
  closeBtn?.addEventListener('click', closeDrawer);

  // Clicking overlay closes drawer
  overlay?.addEventListener('click', closeDrawer);

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (tab.id === 'sidebar-logout-btn') return;
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId)?.classList.add('active');
      // Auto-close drawer on tab select (mobile)
      closeDrawer();
    });
  });

  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
      } catch (error) {
        showToast('Logout failed. Please try again.', 'error');
        console.error('Logout error:', error);
      }
    });
  }
}

// --- Data Loading ---
async function loadData() {
  if (!currentUser) return;

  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profPhone = document.getElementById('prof-phone');

  // Step 1: Populate from Firebase Auth immediately
  if (currentUser.email && !currentUser.email.endsWith('@kad-multiplier.com')) {
    profEmail.value = currentUser.email;
  }
  if (currentUser.displayName) {
    profName.value = currentUser.displayName;
  }

  // Step 2: Enrich from Firestore
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.name) profName.value = data.name;
      let phone = data.phone || '';
      if (phone.startsWith('+91')) phone = phone.substring(3);
      if (phone) profPhone.value = phone;
      if (!profEmail.value && data.email && !data.email.endsWith('@kad-multiplier.com')) {
        profEmail.value = data.email;
      }
    }
  } catch (error) {
    console.error("Firestore read error:", error);
  }

  renderAddresses();
  renderOrders();
  loadWishlist();
}

// --- Profile Save ---
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('save-profile-btn');
  const errorBox = document.getElementById('profile-error');
  const nameVal = document.getElementById('prof-name').value.trim();
  const phoneVal = document.getElementById('prof-phone').value.trim();

  errorBox.style.display = 'none';

  if (nameVal.length < 2) {
    errorBox.textContent = "Please enter your full name (at least 2 characters).";
    errorBox.style.display = 'block';
    return;
  }
  if (!/^[6-9]\d{9}$/.test(phoneVal)) {
    errorBox.textContent = "Please enter a valid 10-digit Indian mobile number starting with 6-9.";
    errorBox.style.display = 'block';
    return;
  }

  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      name: nameVal,
      phone: "+91" + phoneVal,
      email: currentUser.email && !currentUser.email.endsWith('@kad-multiplier.com') ? currentUser.email : "",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    btn.style.background = '#10b981';
    btn.textContent = 'Saved!';
    setTimeout(() => {
      btn.textContent = 'Save Changes';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    errorBox.textContent = "Failed to save. Please check your connection and try again.";
    errorBox.style.display = 'block';
    btn.textContent = 'Save Changes';
    btn.disabled = false;
    console.error(err);
  }
});

// --- Password Change ---
const passwordForm = document.getElementById('password-form');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-password-btn');
    const errorBox = document.getElementById('password-error');
    const successBox = document.getElementById('password-success');
    
    const currentPass = document.getElementById('prof-current-pass').value;
    const newPass = document.getElementById('prof-new-pass').value;
    const confirmPass = document.getElementById('prof-confirm-pass').value;

    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    if (newPass !== confirmPass) {
      errorBox.textContent = "New passwords do not match.";
      errorBox.style.display = 'block';
      return;
    }
    
    if (newPass.length < 8) {
      errorBox.textContent = "New password must be at least 8 characters long.";
      errorBox.style.display = 'block';
      return;
    }

    if (!currentUser || currentUser.providerData.some(p => p.providerId === 'google.com')) {
      errorBox.textContent = "You logged in with Google. Passwords cannot be changed here.";
      errorBox.style.display = 'block';
      return;
    }

    btn.textContent = 'Updating...';
    btn.disabled = true;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);
      
      successBox.style.display = 'block';
      passwordForm.reset();
      btn.textContent = 'Update Password';
      btn.disabled = false;
    } catch (err) {
      console.error(err);
      errorBox.textContent = err.code === 'auth/invalid-credential' 
        ? "Incorrect current password." 
        : "Failed to update password. Please try logging out and back in.";
      errorBox.style.display = 'block';
      btn.textContent = 'Update Password';
      btn.disabled = false;
    }
  });
}

// Toggle password visibility in Account page
document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
  });
});

// ==========================================
// ADDRESSES (Firebase)
// ==========================================
async function getAddresses() {
  if (!currentUser) return [];
  try {
    const q = query(collection(db, "addresses"), where("uid", "==", currentUser.uid));
    const snap = await getDocs(q);
    const addresses = [];
    snap.forEach(d => addresses.push({ id: d.id, ...d.data() }));
    return addresses;
  } catch (err) {
    console.error("Error fetching addresses:", err);
    return [];
  }
}

async function renderAddresses() {
  const list = document.getElementById('address-list');
  if (!list) return;

  list.innerHTML = '<p style="color:var(--text-muted);">Loading addresses...</p>';
  const addresses = await getAddresses();

  if (addresses.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding: 3rem 1rem; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📍</div>
        <h3 style="margin-bottom: 0.5rem;">No saved addresses</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">You haven't added any delivery addresses yet.</p>
        <button class="btn-primary" onclick="document.getElementById('btn-add-address').click()">Add New Address</button>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  addresses.forEach(addr => {
    const card = document.createElement('div');
    card.className = `card-box ${addr.isDefault ? 'default' : ''}`;
    card.innerHTML = `
      ${addr.isDefault ? '<div class="card-badge">Default</div>' : ''}
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
        <h3 style="margin: 0;">${escapeHTML(addr.label || '')}</h3>
      </div>
      ${addr.name ? `<p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-color);">${escapeHTML(addr.name)}${addr.phone ? ' | ' + escapeHTML(addr.phone) : ''}</p>` : ''}
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${escapeHTML(addr.house || '')}, ${escapeHTML(addr.area || '')}</p>
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${escapeHTML(addr.city || '')}, ${escapeHTML(addr.state || '')}</p>
      <p style="color: #718096; font-size: 0.95rem;">PIN: ${escapeHTML(addr.pin || '')}</p>
      <div class="card-actions">
        <button class="btn-outline" onclick="editAddress('${escapeHTML(addr.id)}')">Edit</button>
        <button class="btn-outline" onclick="deleteAddress('${escapeHTML(addr.id)}')">Delete</button>
        ${!addr.isDefault ? `<button class="btn-outline" onclick="setDefaultAddress('${escapeHTML(addr.id)}')">Set Default</button>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

// Add Address
const addressFormContainer = document.getElementById('address-form-container');
const btnAddAddress = document.getElementById('btn-add-address');
if (btnAddAddress) {
  btnAddAddress.addEventListener('click', () => {
    if (addressFormContainer) addressFormContainer.classList.remove('hidden-panel');
  });
}
const btnCancelAddress = document.getElementById('btn-cancel-address');
if (btnCancelAddress) {
  btnCancelAddress.addEventListener('click', () => {
    if (addressFormContainer) addressFormContainer.classList.add('hidden-panel');
    const form = document.getElementById('address-form');
    if (form) {
      form.reset();
      delete form.dataset.editId;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Save Address';
    }
  });
}

const addressForm = document.getElementById('address-form');
if (addressForm) {
  addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = addressForm.querySelector('button[type="submit"]');

    const nameVal = document.getElementById('addr-name').value.trim();
    const phoneVal = document.getElementById('addr-phone').value.trim();
    const houseVal = document.getElementById('addr-house').value.trim();
    const areaVal = document.getElementById('addr-area').value.trim();
    const cityVal = document.getElementById('addr-city').value.trim();
    const stateVal = document.getElementById('addr-state').value.trim();
    const pinVal = document.getElementById('addr-pin').value.trim();
    const labelVal = document.getElementById('addr-label').value.trim();
    const isDefault = document.getElementById('addr-default').checked;

    // Validation
    if (!nameVal || nameVal.length < 2) { showToast('Please enter a valid receiver name.', 'error'); return; }
    if (!/^[6-9]\d{9}$/.test(phoneVal)) { showToast('Please enter a valid 10-digit mobile number starting with 6-9.', 'error'); return; }
    if (!houseVal) { showToast('Please enter house/building name.', 'error'); return; }
    if (!areaVal) { showToast('Please enter area/road/colony.', 'error'); return; }
    if (!cityVal) { showToast('Please enter city.', 'error'); return; }
    if (!stateVal) { showToast('Please enter state.', 'error'); return; }
    if (!/^\d{6}$/.test(pinVal)) { showToast('Please enter a valid 6-digit PIN code.', 'error'); return; }
    if (!labelVal) { showToast('Please enter an address label (e.g. Farm, Home).', 'error'); return; }

    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const editId = addressForm.dataset.editId;
      if (editId) {
        // Update existing
        await updateDoc(doc(db, "addresses", editId), {
          uid: currentUser.uid, name: nameVal, phone: phoneVal,
          house: houseVal, area: areaVal, city: cityVal, state: stateVal,
          pin: pinVal, label: labelVal, isDefault,
          updatedAt: new Date().toISOString()
        });
        delete addressForm.dataset.editId;
      } else {
        const currentAddresses = await getAddresses();
        if (currentAddresses.length >= 2) {
          showToast('You can save up to 2 addresses. Delete one to add a new one.', 'warning');
          btn.textContent = 'Save Address';
          btn.disabled = false;
          return;
        }

        await addDoc(collection(db, "addresses"), {
          uid: currentUser.uid, name: nameVal, phone: phoneVal,
          house: houseVal, area: areaVal, city: cityVal, state: stateVal,
          pin: pinVal, label: labelVal, isDefault,
          createdAt: new Date().toISOString()
        });
      }

      addressForm.reset();
      document.getElementById('address-form-container').classList.add('hidden-panel');
      renderAddresses();
      showToast('Address saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save address. Please try again.', 'error');
      console.error(err);
    } finally {
      btn.textContent = 'Save Address';
      btn.disabled = false;
    }
  });
}

window.deleteAddress = async (id) => {
  if (!confirm('Delete this address?')) return;
  try {
    await deleteDoc(doc(db, "addresses", id));
    renderAddresses();
    showToast('Address deleted successfully.', 'success');
  } catch (err) {
    showToast('Failed to delete address.', 'error');
    console.error(err);
  }
};

window.editAddress = async (id) => {
  const container = document.getElementById('address-form-container');
  container.classList.remove('hidden-panel');
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const snap = await getDoc(doc(db, "addresses", id));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById('addr-name').value = d.name || '';
    document.getElementById('addr-phone').value = d.phone || '';
    document.getElementById('addr-house').value = d.house || '';
    document.getElementById('addr-area').value = d.area || '';
    document.getElementById('addr-city').value = d.city || '';
    document.getElementById('addr-state').value = d.state || '';
    document.getElementById('addr-pin').value = d.pin || '';
    document.getElementById('addr-label').value = d.label || '';
    document.getElementById('addr-default').checked = d.isDefault || false;
    document.getElementById('address-form').dataset.editId = id;
    document.querySelector('#address-form button[type="submit"]').textContent = 'Update Address';
  } catch (err) {
    showToast('Failed to load address for editing.', 'error');
    console.error(err);
  }
};

window.setDefaultAddress = async (id) => {
  try {
    const addresses = await getAddresses();
    const batch = addresses.map(a =>
      updateDoc(doc(db, "addresses", a.id), { isDefault: a.id === id })
    );
    await Promise.all(batch);
    renderAddresses();
    showToast('Default address updated.', 'success');
  } catch (err) {
    showToast('Failed to set default address.', 'error');
    console.error(err);
  }
};

// ==========================================
// ORDERS (Firebase) + INVOICE
// ==========================================
let ordersUnsubscribe = null;
async function renderOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;

  list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading orders...</p>';

  if (!currentUser) return;

  try {
    const q = query(collection(db, "orders"), where("uid", "==", currentUser.uid));
    
    if (ordersUnsubscribe) {
      ordersUnsubscribe();
    }
    
    ordersUnsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) {
        list.innerHTML = `
          <div style="text-align:center; padding: 4rem 1rem; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📦</div>
            <h3 style="margin-bottom: 0.5rem;">No orders found</h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Looks like you haven't placed any orders yet.</p>
            <a href="index.html#purchase" class="btn-primary" style="display:inline-block; text-decoration:none;">Start Shopping</a>
          </div>
        `;
        return;
      }

      list.innerHTML = '';
      const orders = [];
      snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      orders.forEach(ord => {
        let statusClass = 'processing';
        if (ord.status === 'Delivered' || ord.status === 'Completed') statusClass = 'delivered';
        if (ord.status === 'Cancelled') statusClass = 'cancelled';

        const dateStr = new Date(ord.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });

        let itemsStr = '';
        if (ord.items && Array.isArray(ord.items)) {
          itemsStr = ord.items.map(i => `${escapeHTML(i.qty)}x ${escapeHTML(i.title)}${i.sub ? ' ' + escapeHTML(i.sub) : ''}`).join(', ');
        }

        const orderId = escapeHTML(ord.id.slice(-6).toUpperCase());
        const safeStatus = escapeHTML(ord.status || 'Processing');

        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-header">
            <div class="order-meta">
              <div class="meta-block">
                <p>Order Placed</p>
                <span>${escapeHTML(dateStr)}</span>
              </div>
              <div class="meta-block">
                <p>Total</p>
                <span>₹${ord.total?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div class="meta-block">
                <p>Order ID</p>
                <span>#${orderId}</span>
              </div>
            </div>
            <div class="order-status status ${statusClass}">${safeStatus}</div>
          </div>
          <div class="order-body">
            <div class="order-items">
              <p>${itemsStr}</p>
            </div>
            <div class="order-actions">
              <button class="btn-outline" onclick="showShippingStatus('${safeStatus}', '#${orderId}')">Track Order</button>
              ${safeStatus !== 'Cancelled' ? `<button class="btn-primary" onclick="showInvoice(${JSON.stringify(ord).replace(/"/g, '&quot;')})">Invoice</button>` : ''}
            </div>
          </div>
        `;
        list.appendChild(card);
      });
    }, (error) => {
      console.error("Error fetching orders real-time:", error);
      list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #ff4d4f;">Error loading orders. Please try again.</p>';
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #ff4d4f;">Error loading orders. Please try again.</p>';
  }
}

// Track Order with Live Visual Stepper Timeline
window.showShippingStatus = (status, orderId) => {
  const normStatus = (status || 'Processing').toLowerCase();
  
  let step1Active = true;
  let step2Active = normStatus.includes('processing') || normStatus.includes('confirmed') || normStatus.includes('shipped') || normStatus.includes('delivered') || normStatus.includes('completed');
  let step3Active = normStatus.includes('shipped') || normStatus.includes('in transit') || normStatus.includes('delivered') || normStatus.includes('completed');
  let step4Active = normStatus.includes('delivered') || normStatus.includes('completed');
  let isCancelled = normStatus.includes('cancelled');

  const modal = document.createElement('div');
  modal.id = 'track-order-modal';
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;`;
  
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:460px;width:100%;padding:2rem;text-align:left;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.2);animation:fadeIn 0.3s ease;">
      <button onclick="document.getElementById('track-order-modal').remove()" style="position:absolute;top:1.25rem;right:1.25rem;background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:1.1rem;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;">✕</button>
      
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;">
        <div style="width:48px;height:48px;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🚚</div>
        <div>
          <h2 style="margin:0;font-size:1.25rem;color:#0f172a;font-family:'Outfit',sans-serif;">Tracking Order</h2>
          <span style="font-size:0.9rem;font-weight:700;color:#16a34a;">${orderId}</span>
        </div>
      </div>

      ${isCancelled ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:1.25rem;color:#991b1b;text-align:center;margin-bottom:1.5rem;">
          <h4 style="margin:0 0 0.25rem 0;font-size:1rem;">Order Cancelled</h4>
          <p style="margin:0;font-size:0.85rem;">This order was cancelled. If you have questions, please contact support below.</p>
        </div>
      ` : `
        <!-- Visual Stepper Timeline -->
        <div style="position:relative;padding-left:2.5rem;margin-bottom:1.5rem;">
          
          <!-- Line -->
          <div style="position:absolute;left:13px;top:10px;bottom:25px;width:2px;background:#e2e8f0;"></div>

          <!-- Step 1: Order Placed -->
          <div style="position:relative;margin-bottom:1.5rem;">
            <div style="position:absolute;left:-2.5rem;top:0;width:28px;height:28px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;">✓</div>
            <div style="font-weight:700;font-size:0.95rem;color:#0f172a;">Order Placed</div>
            <div style="font-size:0.8rem;color:#64748b;">Order details received & registered</div>
          </div>

          <!-- Step 2: Payment / Order Confirmed -->
          <div style="position:relative;margin-bottom:1.5rem;">
            <div style="position:absolute;left:-2.5rem;top:0;width:28px;height:28px;border-radius:50%;background:${step2Active ? '#16a34a' : '#e2e8f0'};color:${step2Active ? '#fff' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;">${step2Active ? '✓' : '2'}</div>
            <div style="font-weight:700;font-size:0.95rem;color:${step2Active ? '#0f172a' : '#94a3b8'};">Order Confirmed</div>
            <div style="font-size:0.8rem;color:#64748b;">Inventory allocated & packed at warehouse</div>
          </div>

          <!-- Step 3: Shipped -->
          <div style="position:relative;margin-bottom:1.5rem;">
            <div style="position:absolute;left:-2.5rem;top:0;width:28px;height:28px;border-radius:50%;background:${step3Active ? '#16a34a' : '#e2e8f0'};color:${step3Active ? '#fff' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;">${step3Active ? '✓' : '3'}</div>
            <div style="font-weight:700;font-size:0.95rem;color:${step3Active ? '#0f172a' : '#94a3b8'};">Dispatched / In Transit</div>
            <div style="font-size:0.8rem;color:#64748b;">En route via courier (Delivery within 7 Days)</div>
          </div>

          <!-- Step 4: Delivered -->
          <div style="position:relative;">
            <div style="position:absolute;left:-2.5rem;top:0;width:28px;height:28px;border-radius:50%;background:${step4Active ? '#16a34a' : '#e2e8f0'};color:${step4Active ? '#fff' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;">${step4Active ? '✓' : '4'}</div>
            <div style="font-weight:700;font-size:0.95rem;color:${step4Active ? '#0f172a' : '#94a3b8'};">Delivered</div>
            <div style="font-size:0.8rem;color:#64748b;">Handed over at your delivery address</div>
          </div>

        </div>
      `}

      <!-- Quick Action Buttons -->
      <div style="border-top:1px solid #f1f5f9;padding-top:1.25rem;display:flex;flex-direction:column;gap:0.75rem;">
        <a href="https://wa.me/918088055223?text=Hi%2C+I+would+like+an+update+on+my+KAD+Multiplier+order+${orderId}" target="_blank" rel="noopener noreferrer" style="background:#25D366;color:#fff;text-decoration:none;padding:0.75rem 1.25rem;border-radius:10px;font-weight:600;font-size:0.92rem;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(37,211,102,0.25);">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
          Chat with Agronomist on WhatsApp
        </a>
        <a href="tel:+918088055223" style="background:#f1f5f9;color:#334155;text-decoration:none;padding:0.65rem;border-radius:10px;font-weight:600;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:6px;">
          📞 Helpline: +91 8088055223
        </a>
      </div>
    </div>`;
  document.body.appendChild(modal);
};

// Invoice
window.showInvoice = (ord) => {
  const dateStr = new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const orderId = ord.id.slice(-6).toUpperCase();

  let itemsHtml = '';
  let subtotal = 0;
  if (ord.items && Array.isArray(ord.items)) {
    ord.items.forEach(item => {
      const lineTotal = (item.price || 0) * (item.qty || 1);
      subtotal += lineTotal;
      itemsHtml += `
        <tr>
          <td style="padding:0.75rem;border-bottom:1px solid #e2e8f0;">${escapeHTML(item.title)}${item.sub ? ' ' + escapeHTML(item.sub) : ''}</td>
          <td style="padding:0.75rem;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
          <td style="padding:0.75rem;border-bottom:1px solid #e2e8f0;text-align:right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
          <td style="padding:0.75rem;border-bottom:1px solid #e2e8f0;text-align:right;">₹${lineTotal.toLocaleString('en-IN')}</td>
        </tr>`;
    });
  }

  const shipping = ord.shipping || 0;
  const total = ord.total ?? (subtotal + shipping);

  const addr = ord.shippingAddress;
  const addrStr = addr ? `${escapeHTML(addr.name || '')}<br>${escapeHTML(addr.house || '')}, ${escapeHTML(addr.area || '')}<br>${escapeHTML(addr.city || '')}, ${escapeHTML(addr.state || '')} - ${escapeHTML(addr.pin || '')}` : '—';

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice #${orderId} - KAD Multiplier</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:2rem;color:#1a202c;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;padding-bottom:1rem;border-bottom:2px solid #1a3c1a;}
  .logo{font-size:1.8rem;font-weight:700;color:#1a3c1a;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1a3c1a;color:#fff;padding:0.75rem;text-align:left;}
  th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right;}
  th:nth-child(2){text-align:center;}
  .totals td{padding:0.5rem 0.75rem;}
  @media print{button{display:none!important;}}
  </style></head><body>
  <div class="header">
    <div><div class="logo">KAD Multiplier</div><div style="color:#666;font-size:0.9rem;margin-top:0.25rem;">Organic India Mission</div></div>
    <div style="text-align:right;"><div style="font-size:1.3rem;font-weight:700;">INVOICE</div><div style="color:#666;">Date: ${dateStr}</div><div style="color:#666;">Order #${orderId}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem;">
    <div><strong>Shipped To:</strong><br>${addrStr}</div>
    <div><strong>Payment Method:</strong><br>${ord.paymentMethod === 'QR_CODE' ? 'QR Code / UPI' : 'Cash on Delivery'}${ord.utr ? `<br>UTR: ${ord.utr}` : ''}</div>
  </div>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>${itemsHtml}</tbody></table>
  <table style="margin-top:1rem;" class="totals">
    <tr><td colspan="3" style="text-align:right;padding:0.5rem 0.75rem;">Subtotal</td><td style="text-align:right;padding:0.5rem 0.75rem;">₹${subtotal.toLocaleString('en-IN')}</td></tr>
    <tr><td colspan="3" style="text-align:right;padding:0.5rem 0.75rem;">Shipping</td><td style="text-align:right;padding:0.5rem 0.75rem;">₹${shipping.toLocaleString('en-IN')}</td></tr>
    <tr style="font-size:1.1rem;font-weight:700;"><td colspan="3" style="text-align:right;padding:0.75rem;border-top:2px solid #1a3c1a;">Grand Total</td><td style="text-align:right;padding:0.75rem;border-top:2px solid #1a3c1a;color:#1a3c1a;">₹${total.toLocaleString('en-IN')}</td></tr>
  </table>
  <div style="margin-top:3rem;text-align:center;color:#666;font-size:0.85rem;border-top:1px solid #e2e8f0;padding-top:1rem;">
    Thank you for your order! | Contact: +91 8088055223 | organicindia.missions@gmail.com
  </div>
  <button onclick="window.print()" style="margin-top:1.5rem;display:block;padding:0.75rem 2rem;background:#1a3c1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;margin-left:auto;">🖨️ Print Invoice</button>
  </body></html>`);
  win.document.close();
};

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

// ==========================================
// WISHLIST (Firebase)
// ==========================================
async function loadWishlist() {
  const panel = document.getElementById('wishlist-panel');
  if (!panel || !currentUser) return;
  panel.innerHTML = '<p style="color:var(--text-muted);">Loading wishlist...</p>';
  try {
    const q = query(collection(db, "wishlist"), where("uid", "==", currentUser.uid));
    const snap = await getDocs(q);
    if (snap.empty) {
      panel.innerHTML = `
        <div style="text-align:center; padding: 4rem 1rem; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
          <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🤍</div>
          <h3 style="margin-bottom: 0.5rem;">Your wishlist is empty</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Save items you love here to easily find them later.</p>
          <a href="index.html#purchase" class="btn-primary" style="display:inline-block; text-decoration:none;">Explore Products</a>
        </div>
      `;
      return;
    }
    panel.innerHTML = '';
    snap.forEach(d => {
      const item = { id: d.id, ...d.data() };
      const card = document.createElement('div');
      card.className = 'card-box';
      card.innerHTML = `
        <h3 style="margin: 0 0 0.5rem 0;">${escapeHTML(item.title)} ${item.sub ? escapeHTML(item.sub) : ''}</h3>
        <p style="font-weight: 600; margin-bottom: 1rem; color: var(--color-primary);">₹${item.price.toLocaleString('en-IN')}</p>
        <div class="card-actions" style="margin-top: auto; display: flex; gap: 0.5rem;">
          <button class="btn-primary" style="flex: 1; padding: 0.5rem;" onclick='addToCartFromWishlist(${JSON.stringify(item).replace(/"/g, '&quot;')})'>Add to Cart</button>
          <button class="btn-outline danger" style="padding: 0.5rem; display: flex; align-items: center; justify-content: center;" onclick="removeFromWishlist('${item.id}')" aria-label="Remove">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      panel.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading wishlist:", err);
    panel.innerHTML = '<p style="color: #ff4d4f;">Failed to load wishlist.</p>';
  }
}

window.removeFromWishlist = async (docId) => {
  if (!confirm('Remove from wishlist?')) return;
  try {
    await deleteDoc(doc(db, "wishlist", docId));
    loadWishlist();
    showToast('Removed from wishlist.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to remove item.', 'error');
  }
};

window.addToCartFromWishlist = async (item) => {
  let cart = JSON.parse(localStorage.getItem('kadCart') || '[]');
  const existing = cart.find(c => c.variantId === item.variantId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      variantId: item.variantId,
      title: item.title,
      sub: item.sub || '',
      price: item.price,
      weight: item.weight || 0,
      qty: 1,
      image: item.weight === 5 ? '/5kg-20x250.png' : item.weight === 10 ? '/10kg-40x250.png' : '/kad-multiplier-cropped.png'
    });
  }
  localStorage.setItem('kadCart', JSON.stringify(cart));
  
  // Remove from wishlist automatically
  try {
    await deleteDoc(doc(db, "wishlist", item.id));
    loadWishlist();
  } catch(err) {
    console.error("Failed to remove from wishlist after adding to cart", err);
  }
  
  showToast('Added to cart!', 'success');
};
