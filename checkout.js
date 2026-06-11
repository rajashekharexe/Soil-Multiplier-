import './lenis-init.js';
document.addEventListener('DOMContentLoaded', () => {
  const methodOnline = document.getElementById('method-online');
  const methodCod = document.getElementById('method-cod');
  
  const radioOnline = document.getElementById('pay-online');
  const radioCod = document.getElementById('pay-cod');
  
  const contentOnline = methodOnline.querySelector('.method-content');
  const contentCod = methodCod.querySelector('.method-content');

  function updatePaymentMethods() {
    if (radioOnline.checked) {
      methodOnline.classList.add('active');
      methodCod.classList.remove('active');
      contentOnline.style.display = 'block';
      contentCod.style.display = 'none';
    } else {
      methodCod.classList.add('active');
      methodOnline.classList.remove('active');
      contentCod.style.display = 'block';
      contentOnline.style.display = 'none';
    }
  }

  // Click on the box to select
  methodOnline.addEventListener('click', (e) => {
    // Prevent double firing if clicking input
    if (e.target.tagName !== 'INPUT') radioOnline.checked = true;
    updatePaymentMethods();
  });

  methodCod.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT') radioCod.checked = true;
    updatePaymentMethods();
  });
  
  updatePaymentMethods();

  // --- Cart Summary Rendering ---
  function getCart() {
    const cart = localStorage.getItem('kadCart');
    return cart ? JSON.parse(cart) : [];
  }

  function formatCurrency(num) {
    return new Intl.NumberFormat('en-IN').format(num);
  }

  const checkoutItemsContainer = document.getElementById('checkout-items-container');
  const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
  const checkoutShippingEl = document.getElementById('checkout-shipping');
  const checkoutTotalEl = document.getElementById('checkout-total');

  function renderCheckoutSummary() {
    if (!checkoutItemsContainer) return;
    const cart = getCart();
    checkoutItemsContainer.innerHTML = '';
    
    let subtotal = 0;
    let totalWeight = 0;
    
    if (cart.length === 0) {
      checkoutItemsContainer.innerHTML = '<p style="padding: 1rem 0; color: #666;">Your cart is empty.</p>';
    }
    
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      subtotal += itemTotal;
      totalWeight += (item.weight * item.qty);
      
      const itemHtml = `
        <div class="summary-item">
          <div class="item-img-wrapper">
            <div class="item-img" style="background: #f4f6f8; display: flex; align-items: center; justify-content: center;">
              <img src="/kad-multiplier-cropped.png" alt="KAD Multiplier" style="width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
            </div>
            <span class="item-badge">${item.qty}</span>
          </div>
          <div class="item-details">
            <span class="item-name">KAD Multiplier</span>
            <span class="item-variant">${item.title} ${item.sub}</span>
          </div>
          <div class="item-price">\u20B9 ${formatCurrency(itemTotal)}</div>
        </div>
      `;
      checkoutItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
    
    const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
    const grandTotal = subtotal + shipping;
    
    checkoutSubtotalEl.innerHTML = '\u20B9 ' + formatCurrency(subtotal);
    checkoutShippingEl.innerHTML = shipping > 0 ? '\u20B9 ' + formatCurrency(shipping) : 'Free';
    checkoutTotalEl.innerHTML = '\u20B9 ' + formatCurrency(grandTotal);
  }

  renderCheckoutSummary();

  // --- Form Submission & Validation ---
  const checkoutForm = document.querySelector('.checkout-form');
  const chkUtr = document.getElementById('chk-utr');
  const successModal = document.getElementById('success-modal');
  const submitBtn = document.querySelector('.checkout-submit-btn');

  // Check empty cart on load
  if (getCart().length === 0) {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.innerText = 'Cart is Empty';
    }
  }

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      window.location.href = 'index.html';
      return;
    }

    if (radioOnline.checked) {
      if (!chkUtr.value || chkUtr.value.trim().length < 8) {
        alert("Please enter your valid UTR or Transaction ID to confirm payment.");
        chkUtr.focus();
        return;
      }
    }

    // Simulate successful order
    successModal.classList.add('show');
    localStorage.removeItem('kadCart');
  });

  // --- QR Zoom Logic ---
  const qrImg = document.getElementById('qr-img');
  const qrZoomModal = document.getElementById('qr-zoom-modal');
  if (qrImg && qrZoomModal) {
    qrImg.addEventListener('click', () => {
      qrZoomModal.classList.add('show');
    });
    qrZoomModal.addEventListener('click', () => {
      qrZoomModal.classList.remove('show');
    });
  }
});

// --- Auth State Navbar Update ---
const navLoginLinks = document.querySelectorAll('.nav-login-link, .nav-signup-btn');
if (localStorage.getItem('kadUser') || localStorage.getItem('kadOrders')) {
  navLoginLinks.forEach(link => {
    if (link.classList.contains('nav-login-link')) {
      link.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: 2px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> My Account`;
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.href = 'account.html';
    } else {
      link.style.display = 'none'; // Hide Sign Up if logged in
    }
  });
}
