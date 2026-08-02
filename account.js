import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where } from "firebase/firestore";
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
    tab.addEventListener('click', () => {
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
    }, 2000);
  } catch (err) {
    errorBox.textContent = "Failed to save. Please check your connection and try again.";
    errorBox.style.display = 'block';
    btn.textContent = 'Save Changes';
    console.error(err);
  }
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
        <h3 style="margin: 0;">${addr.label || ''}</h3>
      </div>
      ${addr.name ? `<p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-color);">${addr.name}${addr.phone ? ' | ' + addr.phone : ''}</p>` : ''}
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${addr.house || ''}, ${addr.area || ''}</p>
      <p style="margin-bottom: 0.2rem; color: #718096; font-size: 0.95rem;">${addr.city || ''}, ${addr.state || ''}</p>
      <p style="color: #718096; font-size: 0.95rem;">PIN: ${addr.pin || ''}</p>
      <div class="card-actions">
        <button class="btn-outline" onclick="editAddress('${addr.id}')">Edit</button>
        <button class="btn-outline" onclick="deleteAddress('${addr.id}')">Delete</button>
        ${!addr.isDefault ? `<button class="btn-outline" onclick="setDefaultAddress('${addr.id}')">Set Default</button>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
}

// Add Address
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
async function renderOrders() {
  const list = document.getElementById('orders-list');
  if (!list) return;

  list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading orders...</p>';

  if (!currentUser) return;

  try {
    const q = query(collection(db, "orders"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">You have no past orders yet.</p>';
      return;
    }

    list.innerHTML = '';
    const orders = [];
    querySnapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));
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
        itemsStr = ord.items.map(i => `${i.qty}x ${i.title}`).join(', ');
      }

      const orderId = ord.id.slice(-6).toUpperCase();

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
              <span>₹${ord.total?.toLocaleString('en-IN') || 0}</span>
            </div>
            <div class="meta-block">
              <p>Order ID</p>
              <span>#${orderId}</span>
            </div>
          </div>
          <div class="order-status status ${statusClass}">${ord.status || 'Processing'}</div>
        </div>
        <div class="order-body">
          <div class="order-items">
            <p>${itemsStr}</p>
          </div>
          <div class="order-actions">
            <button class="btn-outline" onclick="showShippingStatus('${ord.status || 'Processing'}', '#${orderId}')">Track Order</button>
            <button class="btn-primary" onclick="showInvoice(${JSON.stringify(ord).replace(/"/g, '&quot;')})">Invoice</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    list.innerHTML = '<p style="padding: 2rem; text-align: center; color: #ff4d4f;">Error loading orders. Please try again.</p>';
  }
}

// Track Order
window.showShippingStatus = (status, orderId) => {
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:2rem;text-align:center;position:relative;">
      <button onclick="this.closest('[style*=position:fixed]').remove()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666;">✕</button>
      <div style="font-size:3rem;margin-bottom:1rem;">📦</div>
      <h2 style="margin-bottom:0.5rem;font-size:1.3rem;">Order ${orderId}</h2>
      <div style="display:inline-block;padding:0.4rem 1rem;border-radius:50px;background:#fef3c7;color:#92400e;font-weight:600;margin-bottom:1.5rem;">${status}</div>
      <div style="background:#fff8e1;border:1px solid #fde68a;border-radius:12px;padding:1.2rem;margin-bottom:1.5rem;">
        <p style="margin:0;font-size:0.95rem;color:#78350f;">🚚 <strong>This feature will be available soon.</strong></p>
        <p style="margin:0.5rem 0 0;font-size:0.9rem;color:#92400e;">Till then you can call our resource person to ask where is your order:</p>
        <a href="tel:+918088775223" style="display:inline-block;margin-top:0.75rem;padding:0.6rem 1.5rem;background:#1a3c1a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">📞 +91 8088775223</a>
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
  const total = ord.total || subtotal + shipping;

  const addr = ord.shippingAddress;
  const addrStr = addr ? `${escapeHTML(addr.firstName || '')} ${escapeHTML(addr.lastName || '')}<br>${escapeHTML(addr.address || '')}, ${escapeHTML(addr.city || '')}, ${escapeHTML(addr.state || '')} - ${escapeHTML(addr.pin || '')}` : '—';

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
      panel.innerHTML = '<p style="color: var(--text-muted); padding: 1rem 0;">Your wishlist is empty.</p>';
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

window.addToCartFromWishlist = (item) => {
  let cart = JSON.parse(localStorage.getItem('kadCart') || '[]');
  const existing = cart.find(c => c.id === item.variantId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: item.variantId,
      title: item.title,
      sub: item.sub || '',
      price: item.price,
      weight: item.weight || 0,
      qty: 1
    });
  }
  localStorage.setItem('kadCart', JSON.stringify(cart));
  showToast('Added to cart!', 'success');
};
