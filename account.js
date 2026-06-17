// account.js - Account Dashboard Logic with Mock Backend

import './lenis-init.js';
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMockBackend();
  loadData();
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
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'index.html';
    });
  }
}

// --- Mock Backend Setup ---
// These functions return Promises to simulate a real backend fetch/API call.
const api = {
  getUser: async () => {
    return JSON.parse(localStorage.getItem('kadUser'));
  },
  saveUser: async (userObj) => {
    localStorage.setItem('kadUser', JSON.stringify(userObj));
    return true;
  },
  getFarmProfile: async () => {
    return JSON.parse(localStorage.getItem('kadFarm'));
  },
  saveFarmProfile: async (farmObj) => {
    localStorage.setItem('kadFarm', JSON.stringify(farmObj));
    return true;
  },
  getAddresses: async () => {
    return JSON.parse(localStorage.getItem('kadAddresses')) || [];
  },
  saveAddresses: async (addresses) => {
    localStorage.setItem('kadAddresses', JSON.stringify(addresses));
    return true;
  },
  getOrders: async () => {
    return JSON.parse(localStorage.getItem('kadOrders')) || [];
  }
};

function initMockBackend() {
  // Populate initial mock data if nothing exists
  if (!localStorage.getItem('kadUser')) {
    localStorage.setItem('kadUser', JSON.stringify({
      name: 'Ramesh Patel',
      email: 'ramesh.farmer@example.com',
      phone: '+91 9876543210'
    }));
  }
  if (!localStorage.getItem('kadFarm')) {
    localStorage.setItem('kadFarm', JSON.stringify({
      acres: 12,
      soil: 'Loamy',
      crops: 'Sugarcane, Wheat',
      irrigation: 'Drip'
    }));
  }
  if (!localStorage.getItem('kadAddresses')) {
    localStorage.setItem('kadAddresses', JSON.stringify([
      {
        id: 'addr_1',
        label: 'Main Farm',
        street: 'Survey No 42, Village Road, Near Old Banyan Tree',
        city: 'Nashik',
        pin: '422003',
        isDefault: true
      }
    ]));
  }
  if (!localStorage.getItem('kadOrders')) {
    localStorage.setItem('kadOrders', JSON.stringify([
      {
        id: 'ORD-2026-8891',
        date: 'May 28, 2026',
        total: '₹5,495',
        status: 'Delivered',
        items: '5x 1Kg KAD Multiplier'
      },
      {
        id: 'ORD-2026-9012',
        date: 'June 5, 2026',
        total: '₹10,499',
        status: 'Processing',
        items: '1x 10Kg KAD Multiplier'
      }
    ]));
  }
}

// --- Data Loading & Rendering ---
async function loadData() {
  const user = await api.getUser();
  if (user) {
    document.getElementById('prof-name').value = user.name || '';
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-phone').value = user.phone || '';
  }



  renderAddresses();
  renderOrders();
}

// Profile Save Event
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Saving...';
  
  await api.saveUser({
    name: document.getElementById('prof-name').value,
    email: document.getElementById('prof-email').value,
    phone: document.getElementById('prof-phone').value
  });

  setTimeout(() => {
    btn.textContent = 'Saved!';
    setTimeout(() => btn.textContent = 'Save Changes', 2000);
  }, 500);
});



// --- Address Logic ---
const addressFormContainer = document.getElementById('address-form-container');
const btnAddAddress = document.getElementById('btn-add-address');
const btnCancelAddress = document.getElementById('btn-cancel-address');
const addressForm = document.getElementById('address-form');

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
  const addresses = await api.getAddresses();
  
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
    addresses.forEach(a => a.isDefault = false); // Unset others
  }
  
  addresses.push(newAddress);
  await api.saveAddresses(addresses);
  
  addressForm.reset();
  addressFormContainer.style.display = 'none';
  btnAddAddress.style.display = 'block';
  renderAddresses();
});

async function renderAddresses() {
  const list = document.getElementById('address-list');
  const addresses = await api.getAddresses();
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

// Expose delete to window so inline onclick works
window.deleteAddress = async (id) => {
  if(!confirm('Are you sure you want to delete this address?')) return;
  let addresses = await api.getAddresses();
  addresses = addresses.filter(a => a.id !== id);
  await api.saveAddresses(addresses);
  renderAddresses();
};

// --- Orders Logic ---
async function renderOrders() {
  const list = document.getElementById('orders-list');
  const orders = await api.getOrders();
  list.innerHTML = '';

  orders.forEach(ord => {
    let statusClass = 'processing';
    if(ord.status === 'Delivered') statusClass = 'delivered';
    if(ord.status === 'Cancelled') statusClass = 'cancelled';

    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-header">
        <div class="order-meta">
          <div class="meta-block">
            <p>Order Placed</p>
            <span>${ord.date}</span>
          </div>
          <div class="meta-block">
            <p>Total</p>
            <span>${ord.total}</span>
          </div>
          <div class="meta-block">
            <p>Order ID</p>
            <span>${ord.id}</span>
          </div>
        </div>
        <div class="order-status status ${statusClass}">${ord.status}</div>
      </div>
      <div class="order-body">
        <div class="order-items">
          <p>${ord.items}</p>
        </div>
        <div class="order-actions">
          <button class="btn-outline">Track</button>
          <button class="btn-outline">Invoice</button>
          ${ord.status !== 'Cancelled' && ord.status !== 'Delivered' ? `<button class="btn-outline danger" onclick="cancelOrder('${ord.id}')">Cancel</button>` : ''}
          ${ord.status === 'Delivered' ? `<button class="btn-outline">Request Return</button>` : ''}
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

window.cancelOrder = async (id) => {
  if(!confirm('Are you sure you want to cancel this order?')) return;
  let orders = await api.getOrders();
  let order = orders.find(o => o.id === id);
  if(order) {
    order.status = 'Cancelled';
    await api.saveOrders?.(orders); // Optional save if we had it, but we can just set item
    localStorage.setItem('kadOrders', JSON.stringify(orders));
    renderOrders();
  }
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

