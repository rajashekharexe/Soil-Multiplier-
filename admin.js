import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { showToast } from './toast.js';

// ============================================================
// ADMIN WHITELIST
// ============================================================
const ADMIN_EMAIL = atob('a2FkbXVsdGlwbGllckBhZG1pbi5jb20=');
const ALLOWED_ADMIN_EMAILS = [
  ADMIN_EMAIL
];

const adminOverlay = document.getElementById('admin-login-overlay');
const adminEmailInput = document.getElementById('admin-email');
const adminPassInput = document.getElementById('admin-pass');
const adminSubmit = document.getElementById('admin-submit');
const adminError = document.getElementById('admin-error');

let allOrders = [];
let allLeads = [];
let allProducts = [];
let chartInstance = null;

// ============================================================
// AUTHENTICATION
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user && sessionStorage.getItem('adminVerified') === user.uid) {
    const email = user.email?.toLowerCase() || '';
    if (ALLOWED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
      adminOverlay.style.display = 'none';
      initDashboard();
    } else {
      signOut(auth);
      sessionStorage.removeItem('adminVerified');
    }
  }
});

adminSubmit.addEventListener('click', async () => {
  const email = adminEmailInput ? adminEmailInput.value.trim() : '';
  const password = adminPassInput.value.trim();

  if (!email || !password) {
    adminError.textContent = 'Please enter email and password.';
    adminError.style.display = 'block';
    return;
  }

  adminSubmit.textContent = 'Signing in...';
  adminError.style.display = 'none';

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const signedInEmail = cred.user.email?.toLowerCase() || '';
    
    if (!ALLOWED_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(signedInEmail)) {
      await signOut(auth);
      adminError.textContent = 'Access denied. This account is not authorized to access the admin panel.';
      adminError.style.display = 'block';
      adminSubmit.textContent = 'Sign In';
      return;
    }

    sessionStorage.setItem('adminVerified', cred.user.uid);
    adminOverlay.style.display = 'none';
    initDashboard();
  } catch (err) {
    let msg = 'Invalid credentials.';
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      msg = 'Wrong email or password.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many attempts. Please try again later.';
    } else if (err.code === 'auth/network-request-failed') {
      msg = 'No internet connection.';
    }
    adminError.textContent = msg;
    adminError.style.display = 'block';
    adminSubmit.textContent = 'Sign In';
  }
});

adminPassInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') adminSubmit.click();
});

// ============================================================
// INITIALIZATION & TAB SWITCHING
// ============================================================
function initDashboard() {
  fetchOrders();
  fetchLeads();
  fetchProducts();

  // Tab Switching
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.getElementById(target).classList.add('active');
    });
  });
}

// ============================================================
// ORDERS & DASHBOARD STATS
// ============================================================
async function fetchOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    allOrders = [];
    querySnapshot.forEach(docSnap => {
      allOrders.push({ id: docSnap.id, ...docSnap.data() });
    });

    document.getElementById('order-count').textContent = allOrders.length.toString();
    
    updateDashboardStats();
    renderOrders(allOrders);

  } catch (error) {
    console.error("Error fetching orders:", error);
    document.getElementById('orders-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ff6b6b;">Error loading orders: ${error.message}</td></tr>`;
  }
}

function renderOrders(ordersToRender) {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '';

  if (ordersToRender.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No orders found.</td></tr>';
    return;
  }

  ordersToRender.forEach(data => {
    const dateObj = new Date(data.createdAt);
    const dateStr = dateObj.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Security: Escape user inputs to prevent XSS (Cross-Site Scripting) attacks
    const escapeHTML = (str) => {
      if (!str) return '';
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[tag] || tag));
    };

    const customerHtml = `
      <strong>${escapeHTML(data.shippingAddress?.firstName)} ${escapeHTML(data.shippingAddress?.lastName)}</strong><br>
      <div style="margin-top:4px; font-size:0.85rem; color:#aaa;">
        📞 ${escapeHTML(data.contactPhone || data.customerPhone || 'N/A')}<br>
        ✉️ ${escapeHTML(data.contactEmail || 'N/A')}
      </div>
    `;

    const paymentHtml = `
      <div>Method: <strong>${data.paymentMethod === 'QR_CODE' ? 'QR Code' : 'Cash on Delivery'}</strong></div>
      ${data.utr ? `<div style="margin-top:4px; color:#fbbf24; font-family:monospace;">UTR: ${escapeHTML(data.utr)}</div>` : ''}
    `;

    const addressHtml = data.shippingAddress ? `
      <div class="address-box" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; margin-top: 8px;">
        <strong>Delivery Address:</strong><br>
        ${escapeHTML(data.shippingAddress.address)}<br>
        ${escapeHTML(data.shippingAddress.city)}, ${escapeHTML(data.shippingAddress.state)} - ${escapeHTML(data.shippingAddress.pin)}
      </div>
    ` : '';

    const notesHtml = data.orderNotes ? `
      <div style="background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 0.85rem;">
        <strong style="color: #eab308;">Note:</strong> ${escapeHTML(data.orderNotes)}
      </div>
    ` : '';

    let itemsHtml = '';
    if (data.items && Array.isArray(data.items)) {
      itemsHtml = data.items.map(item => `<div>${item.qty}x ${escapeHTML(item.title)} ${escapeHTML(item.sub || '')}</div>`).join('');
    }

    const currentStatus = data.status || 'Pending';
    const statusOptions = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
      .map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`)
      .join('');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#aaa; font-size:0.85rem;">${dateStr}<br><span style="font-size:0.7rem;">ID: ${data.id.slice(-6).toUpperCase()}</span></td>
      <td>${customerHtml}</td>
      <td>${paymentHtml}</td>
      <td>
        ${itemsHtml}
        ${addressHtml}
        ${notesHtml}
      </td>
      <td style="font-weight:600; font-size:1.1rem; color:#10b981;">₹ ${data.total?.toLocaleString('en-IN') || 0}</td>
      <td>
        <select class="status-select" data-id="${data.id}" style="padding:0.4rem 0.6rem;border-radius:8px;border:1px solid #444;background:#1e293b;color:#fff;cursor:pointer;">
          ${statusOptions}
        </select>
      </td>
    `;

    const select = tr.querySelector('.status-select');
    select.addEventListener('change', async () => {
      try {
        await updateDoc(doc(db, "orders", data.id), { status: select.value });
        select.style.borderColor = '#10b981';
        setTimeout(() => select.style.borderColor = '#444', 2000);
        data.status = select.value;
        showToast('Status updated successfully.', 'success');
      } catch (err) {
        showToast('Failed to update status.', 'error');
        console.error(err);
      }
    });

    tbody.appendChild(tr);
  });
}

// Filtering and Searching Orders
document.getElementById('order-search').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filterStat = document.getElementById('order-filter').value;
  filterOrders(term, filterStat);
});

document.getElementById('order-filter').addEventListener('change', (e) => {
  const filterStat = e.target.value;
  const term = document.getElementById('order-search').value.toLowerCase();
  filterOrders(term, filterStat);
});

function filterOrders(searchTerm, statusFilter) {
  let filtered = allOrders;
  
  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => (o.status || 'Pending') === statusFilter);
  }
  
  if (searchTerm) {
    filtered = filtered.filter(o => {
      const phone = (o.contactPhone || o.customerPhone || '').toLowerCase();
      const email = (o.contactEmail || '').toLowerCase();
      const name = (o.shippingAddress?.firstName || '').toLowerCase();
      return phone.includes(searchTerm) || email.includes(searchTerm) || name.includes(searchTerm);
    });
  }
  
  renderOrders(filtered);
}

// ============================================================
// DASHBOARD ANALYTICS & CHARTS
// ============================================================
function updateDashboardStats() {
  let totalRevenue = 0;
  let nonCancelledOrders = 0;
  const salesByDate = {};

  allOrders.forEach(o => {
    if (o.status !== 'Cancelled') {
      totalRevenue += (o.total || 0);
      nonCancelledOrders++;
      
      const dateStr = new Date(o.createdAt).toLocaleDateString('en-IN');
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + (o.total || 0);
    }
  });

  document.getElementById('stat-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
  document.getElementById('stat-orders').textContent = nonCancelledOrders;
  
  const convRate = (nonCancelledOrders / 1000) * 100;
  document.getElementById('stat-conversion').textContent = `${convRate.toFixed(1)}%`;

  drawChart(salesByDate);
}

function drawChart(salesByDate) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const sortedDates = Object.keys(salesByDate).sort((a, b) => {
    const [d1,m1,y1] = a.split('/');
    const [d2,m2,y2] = b.split('/');
    return new Date(`${m1}/${d1}/${y1}`) - new Date(`${m2}/${d2}/${y2}`);
  });
  
  const labels = sortedDates.slice(-7);
  const data = labels.map(d => salesByDate[d]);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: data,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ============================================================
// EXPORT CSV
// ============================================================
function sanitizeCSV(val) {
  let s = String(val || '');
  // Prevent CSV/formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

document.getElementById('export-csv').addEventListener('click', () => {
  if (allOrders.length === 0) return showToast("No orders to export.", 'warning');
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Order ID,Customer Name,Phone,Email,Address,City,State,PIN,Total(INR),Status,Payment Method,UTR\\n";
  
  allOrders.forEach(o => {
    const date = new Date(o.createdAt).toLocaleString('en-IN').replace(/,/g, '');
    const id = o.id.slice(-6).toUpperCase();
    const name = `"${sanitizeCSV(o.shippingAddress?.firstName || '')} ${sanitizeCSV(o.shippingAddress?.lastName || '')}"`;
    const phone = sanitizeCSV(o.contactPhone || o.customerPhone || '');
    const email = sanitizeCSV(o.contactEmail || '');
    const addr = `"${sanitizeCSV(o.shippingAddress?.address || '').replace(/"/g, '""')}"`;
    const city = o.shippingAddress?.city || '';
    const state = o.shippingAddress?.state || '';
    const pin = o.shippingAddress?.pin || '';
    const total = o.total || 0;
    const status = o.status || 'Pending';
    const pMethod = o.paymentMethod || '';
    const utr = o.utr || '';

    csvContent += `${date},${id},${name},${phone},${email},${addr},${city},${state},${pin},${total},${status},${pMethod},${utr}\\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `kad_orders_${new Date().toLocaleDateString('en-IN')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ============================================================
// LEADS TAB
// ============================================================
async function fetchLeads() {
  const tbody = document.getElementById('leads-tbody');
  try {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    tbody.innerHTML = '';
    
    if (querySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888;">No leads found.</td></tr>';
      return;
    }

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : 'N/A';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#aaa;">${dateStr}</td>
        <td style="font-weight:600;">${data.name || 'Unknown'}</td>
        <td><a href="tel:${data.phone}" style="color:var(--primary); text-decoration:none;">📞 ${data.phone || 'N/A'}</a></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#ff6b6b;">Error loading leads.</td></tr>';
  }
}

// ============================================================
// PRODUCTS TAB
// ============================================================
async function fetchProducts() {
  const tbody = document.getElementById('products-tbody');
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    
    tbody.innerHTML = '';
    
    if (querySnapshot.empty) {
      // Auto-seed default products
      const defaultProducts = [
        { id: 'variant-1kg', title: '1Kg KAD Multiplier (4x250g)', mrp: 1099, price: 1099 },
        { id: 'variant-5kg', title: '5Kg KAD Multiplier (20x250g)', mrp: 4099, price: 4099 },
        { id: 'variant-10kg', title: '10Kg KAD Multiplier (40x250g)', mrp: 7799, price: 7799 },
        { id: 'variant-10kg-1kg-packs', title: '10Kg KAD Multiplier (10x1Kg)', mrp: 7499, price: 7499 }
      ];
      for (const p of defaultProducts) {
        await setDoc(doc(db, "products", p.id), { title: p.title, mrp: p.mrp, price: p.price });
      }
      return fetchProducts(); // Re-fetch after seeding
    }

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      const inStockChecked = data.inStock !== false ? 'checked' : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#aaa; font-family:monospace;">${id}</td>
        <td><input type="text" value="${data.title || ''}" id="prod-title-${id}" style="width:100%; padding:0.4rem; background:transparent; border:1px solid #444; color:#fff;"></td>
        <td><input type="number" value="${data.mrp || 0}" id="prod-mrp-${id}" style="width:80px; padding:0.4rem; background:transparent; border:1px solid #444; color:#fff;"></td>
        <td><input type="number" value="${data.price || 0}" id="prod-price-${id}" style="width:80px; padding:0.4rem; background:transparent; border:1px solid #444; color:#fff;"></td>
        <td style="text-align: center;"><input type="checkbox" id="prod-stock-${id}" ${inStockChecked} style="width:18px; height:18px; cursor:pointer;"></td>
        <td><button class="btn-primary" onclick="window.saveProduct('${id}')" style="padding:0.4rem 1rem; border-radius:4px; font-size:0.85rem;">Save</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ff6b6b;">Error loading products.</td></tr>';
  }
}

window.saveProduct = async (id) => {
  const btn = event.target;
  const title = document.getElementById(`prod-title-${id}`).value;
  const mrp = parseInt(document.getElementById(`prod-mrp-${id}`).value);
  const price = parseInt(document.getElementById(`prod-price-${id}`).value);
  const inStock = document.getElementById(`prod-stock-${id}`).checked;

  btn.textContent = "Saving...";
  try {
    await updateDoc(doc(db, "products", id), { title, mrp, price, inStock });
    btn.style.background = '#10b981';
    btn.textContent = "Saved!";
    setTimeout(() => {
      btn.style.background = '';
      btn.textContent = "Save";
    }, 2000);
    showToast('Product saved successfully.', 'success');
  } catch (err) {
    console.error("Failed to save product:", err);
    showToast("Failed to save product.", 'error');
    btn.textContent = "Save";
  }
};
