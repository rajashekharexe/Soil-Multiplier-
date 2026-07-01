import { db } from './firebase.js';
import { collection, query, orderBy, getDocs } from "firebase/firestore";

const adminOverlay = document.getElementById('admin-login-overlay');
const adminPassInput = document.getElementById('admin-pass');
const adminSubmit = document.getElementById('admin-submit');
const adminError = document.getElementById('admin-error');
const tbody = document.getElementById('orders-tbody');
const orderCountEl = document.getElementById('order-count');

// Basic hardcoded protection (Not bank-level secure, but prevents random public access)
const MASTER_PASS = "KADADMIN2026";

if (sessionStorage.getItem('adminUnlocked') === 'true') {
  adminOverlay.style.display = 'none';
  fetchOrders();
}

adminSubmit.addEventListener('click', () => {
  if (adminPassInput.value === MASTER_PASS) {
    sessionStorage.setItem('adminUnlocked', 'true');
    adminOverlay.style.display = 'none';
    fetchOrders();
  } else {
    adminError.style.display = 'block';
  }
});

adminPassInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') adminSubmit.click();
});

async function fetchOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    tbody.innerHTML = '';
    
    if (querySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No orders found yet.</td></tr>';
      orderCountEl.textContent = '0';
      return;
    }

    orderCountEl.textContent = querySnapshot.size.toString();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      
      const dateObj = new Date(data.createdAt);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const customerHtml = `
        <strong>${data.shippingAddress?.firstName || ''} ${data.shippingAddress?.lastName || ''}</strong><br>
        <div style="margin-top:4px; font-size:0.85rem; color:#aaa;">
          📞 ${data.contactPhone || data.customerPhone || 'N/A'}<br>
          ✉️ ${data.contactEmail || 'N/A'}
        </div>
      `;

      const paymentHtml = `
        <div>Method: <strong>${data.paymentMethod === 'QR_CODE' ? 'QR Code' : 'Cash on Delivery'}</strong></div>
        ${data.utr ? `<div style="margin-top:4px; color:#fbbf24; font-family:monospace;">UTR: ${data.utr}</div>` : ''}
      `;

      const addressHtml = data.shippingAddress ? `
        <div class="address-box">
          ${data.shippingAddress.address}<br>
          ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pin}
        </div>
      ` : '';

      let itemsHtml = '';
      if (data.items && Array.isArray(data.items)) {
        itemsHtml = data.items.map(item => `<div>${item.qty}x ${item.title} ${item.sub || ''}</div>`).join('');
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#aaa; font-size:0.85rem;">${dateStr}<br><span style="font-size:0.7rem;">ID: ${id.slice(-6).toUpperCase()}</span></td>
        <td>${customerHtml}</td>
        <td>${paymentHtml}</td>
        <td>
          ${itemsHtml}
          ${addressHtml}
        </td>
        <td style="font-weight:600; font-size:1.1rem; color:#10b981;">₹ ${data.total.toLocaleString('en-IN')}</td>
        <td>
          <span class="status-badge ${data.status === 'Completed' ? 'success' : ''}">${data.status || 'Pending'}</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ff6b6b;">Error loading orders: ${error.message}</td></tr>`;
  }
}
