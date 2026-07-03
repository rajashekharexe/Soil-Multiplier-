import './lenis-init.js';
import { auth, db } from './firebase.js';
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;

  // Protect the checkout page
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      const chkPhone = document.getElementById('chk-phone');
      // Extract phone from fake email (e.g. +919876543210@kad-multiplier.com)
      if (chkPhone && user.email) {
        let phone = user.email.split('@')[0];
        if (phone.startsWith('+91')) {
          phone = phone.substring(3); // Remove +91 for the input field
        }
        chkPhone.value = phone;
      }
    } else {
      // Redirect to login if they try to checkout without an account
      window.location.href = 'login.html';
    }
  });

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
  if (methodOnline) {
    methodOnline.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') radioOnline.checked = true;
      updatePaymentMethods();
    });
  }

  if (methodCod) {
    methodCod.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') radioCod.checked = true;
      updatePaymentMethods();
    });
  }
  
  if (radioOnline && radioCod) updatePaymentMethods();

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
    
    cart.forEach((item) => {
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
          <div class="item-price">₹ ${formatCurrency(itemTotal)}</div>
        </div>
      `;
      checkoutItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
    
    const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
    const grandTotal = subtotal + shipping;
    
    checkoutSubtotalEl.innerHTML = '₹ ' + formatCurrency(subtotal);
    checkoutShippingEl.innerHTML = shipping > 0 ? '₹ ' + formatCurrency(shipping) : 'Free';
    checkoutTotalEl.innerHTML = '₹ ' + formatCurrency(grandTotal);
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

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        alert("Please log in to complete your order.");
        window.location.href = 'login.html';
        return;
      }

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

      submitBtn.innerText = 'Processing Order...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      // Recalculate totals securely
      let subtotal = 0;
      let totalWeight = 0;
      cart.forEach(item => {
        subtotal += (item.price * item.qty);
        totalWeight += (item.weight * item.qty);
      });
      const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
      const grandTotal = subtotal + shipping;

      const orderData = {
        uid: currentUser.uid,
        customerAuthPhone: currentUser.email ? currentUser.email.split('@')[0] : null,
        contactEmail: document.getElementById('chk-email').value.trim(),
        contactPhone: document.getElementById('chk-phone').value.trim(),
        shippingAddress: {
          firstName: document.getElementById('chk-fname').value.trim(),
          lastName: document.getElementById('chk-lname').value.trim(),
          address: document.getElementById('chk-address').value.trim(),
          city: document.getElementById('chk-city').value.trim(),
          state: document.getElementById('chk-state').value.trim(),
          pin: document.getElementById('chk-pin').value.trim(),
        },
        paymentMethod: radioOnline.checked ? 'QR_CODE' : 'COD',
        utr: radioOnline.checked ? chkUtr.value.trim() : null,
        items: cart,
        subtotal: subtotal,
        shipping: shipping,
        total: grandTotal,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, "orders"), orderData);
        
        // Show success modal
        successModal.classList.add('show');
        localStorage.removeItem('kadCart');
      } catch (error) {
        console.error("Error creating order: ", error);
        alert("There was an error processing your order. Please try again.");
        submitBtn.innerText = 'Confirm & Pay';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    });
  }

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
