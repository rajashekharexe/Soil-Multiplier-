import './lenis-init.js';
import { auth, db } from './firebase.js';
import { showToast } from './toast.js';
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;

  // Protect checkout - redirect to login, remembering to come back
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await prefillUserData(user);
    } else {
      sessionStorage.setItem('loginReturnTo', 'checkout.html');
      window.location.href = 'login.html';
    }
  });

  // ---- Pre-fill user data from Firebase ----
  async function prefillUserData(user) {
    const chkPhone = document.getElementById('chk-phone');
    const chkEmail = document.getElementById('chk-email');
    const chkFname = document.getElementById('chk-fname');
    const chkLname = document.getElementById('chk-lname');

    // Pre-fill email from Google Auth
    if (user.email && !user.email.endsWith('@kad-multiplier.com')) {
      chkEmail.value = user.email;
    }

    // Pre-fill phone from fake email
    if (user.email && user.email.endsWith('@kad-multiplier.com')) {
      chkPhone.value = user.email.split('@')[0];
    }

    // Get richer data from Firestore
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.name) {
          const parts = data.name.split(' ');
          chkFname.value = parts[0] || '';
          chkLname.value = parts.slice(1).join(' ') || '';
        }
        if (data.phone) {
          let p = data.phone.startsWith('+91') ? data.phone.substring(3) : data.phone;
          chkPhone.value = p;
        }
      }
    } catch (err) {
      console.error("Error prefilling from Firestore:", err);
    }

    // Load saved addresses for selection
    await loadSavedAddresses(user);
  }

  // ---- Load saved addresses dropdown ----
  async function loadSavedAddresses(user) {
    try {
      const q = query(collection(db, "addresses"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;

      const addresses = [];
      snap.forEach(d => addresses.push({ id: d.id, ...d.data() }));

      // Insert address selector above the address fields
      const addrGroup = document.getElementById('chk-address').closest('.form-group');
      if (!addrGroup) return;

      const selector = document.createElement('div');
      selector.className = 'form-group full-width';
      selector.style.marginBottom = '1rem';
      selector.innerHTML = `
        <label style="font-weight:600; font-size:0.9rem; color:#444; margin-bottom:0.5rem; display:block;">Use Saved Address</label>
        <select id="saved-addr-select" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.95rem;background:#fff;">
          <option value="">— Enter address manually —</option>
          ${addresses.map(a => `<option value="${a.id}">${a.label}: ${a.house}, ${a.city}</option>`).join('')}
        </select>
      `;
      addrGroup.parentElement.insertBefore(selector, addrGroup);

      document.getElementById('saved-addr-select').addEventListener('change', async (e) => {
        if (!e.target.value) return;
        const chosen = addresses.find(a => a.id === e.target.value);
        if (!chosen) return;
        document.getElementById('chk-address').value = `${chosen.house}, ${chosen.area}`;
        document.getElementById('chk-city').value = chosen.city || '';
        document.getElementById('chk-state').value = chosen.state || '';
        document.getElementById('chk-pin').value = chosen.pin || '';
        if (chosen.phone) document.getElementById('chk-phone').value = chosen.phone;
      });

      // Auto-fill default address
      const def = addresses.find(a => a.isDefault);
      if (def) {
        document.getElementById('saved-addr-select').value = def.id;
        document.getElementById('chk-address').value = `${def.house}, ${def.area}`;
        document.getElementById('chk-city').value = def.city || '';
        document.getElementById('chk-state').value = def.state || '';
        document.getElementById('chk-pin').value = def.pin || '';
        if (def.phone) document.getElementById('chk-phone').value = def.phone;
      }
    } catch (err) {
      console.error("Error loading saved addresses:", err);
    }
  }

  // ---- Payment Method Toggle ----
  const methodOnline = document.getElementById('method-online');
  const methodCod = document.getElementById('method-cod');
  const radioOnline = document.getElementById('pay-online');
  const radioCod = document.getElementById('pay-cod');
  const contentOnline = methodOnline?.querySelector('.method-content');
  const contentCod = methodCod?.querySelector('.method-content');

  function updatePaymentMethods() {
    if (radioOnline.checked) {
      methodOnline.classList.add('active'); methodCod.classList.remove('active');
      contentOnline.style.display = 'block'; contentCod.style.display = 'none';
    } else {
      methodCod.classList.add('active'); methodOnline.classList.remove('active');
      contentCod.style.display = 'block'; contentOnline.style.display = 'none';
    }
  }

  if (methodOnline) methodOnline.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') radioOnline.checked = true; updatePaymentMethods(); });
  if (methodCod) methodCod.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') radioCod.checked = true; updatePaymentMethods(); });
  if (radioOnline && radioCod) updatePaymentMethods();

  // ---- Cart Summary ----
  function getCart() { return JSON.parse(localStorage.getItem('kadCart') || '[]'); }
  function formatCurrency(num) { return new Intl.NumberFormat('en-IN').format(num); }

  const checkoutItemsContainer = document.getElementById('checkout-items-container');
  const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
  const checkoutShippingEl = document.getElementById('checkout-shipping');
  const checkoutTotalEl = document.getElementById('checkout-total');

  function renderCheckoutSummary() {
    if (!checkoutItemsContainer) return;
    const cart = getCart();
    checkoutItemsContainer.innerHTML = '';
    let subtotal = 0, totalWeight = 0;

    if (cart.length === 0) {
      showToast('Your cart is empty! Please add products before checking out.', 'warning');
      window.location.href = "index.html";
      return;
    }

    cart.forEach((item) => {
      const itemTotal = item.price * item.qty;
      subtotal += itemTotal;
      totalWeight += (item.weight * item.qty);
      checkoutItemsContainer.insertAdjacentHTML('beforeend', `
        <div class="summary-item">
          <div class="item-img-wrapper">
            <div class="item-img" style="background:#f4f6f8;display:flex;align-items:center;justify-content:center;">
              <img src="/kad-multiplier-cropped.png" alt="KAD Multiplier" style="width:80%;height:80%;object-fit:contain;" />
            </div>
            <span class="item-badge">${item.qty}</span>
          </div>
          <div class="item-details">
            <span class="item-name">KAD Multiplier</span>
            <span class="item-variant">${item.title} ${item.sub}</span>
          </div>
          <div class="item-price">₹ ${formatCurrency(itemTotal)}</div>
        </div>`);
    });

    const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
    const grandTotal = subtotal + shipping;
    checkoutSubtotalEl.innerHTML = '₹ ' + formatCurrency(subtotal);
    checkoutShippingEl.innerHTML = shipping > 0 ? '₹ ' + formatCurrency(shipping) : 'Free';
    checkoutTotalEl.innerHTML = '₹ ' + formatCurrency(grandTotal);
  }

  renderCheckoutSummary();

  // ---- Form Validation Helpers ----
  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function isValidPhone(phone) { return /^[6-9]\d{9}$/.test(phone); }
  function isValidPin(pin) { return /^\d{6}$/.test(pin); }
  function isValidUTR(utr) { return utr && utr.trim().length >= 12; }

  // ---- Form Submission ----
  const checkoutForm = document.querySelector('.checkout-form');
  const chkUtr = document.getElementById('chk-utr');
  const successModal = document.getElementById('success-modal');
  const submitBtn = document.querySelector('.checkout-submit-btn');

  if (getCart().length === 0 && submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.innerText = 'Cart is Empty';
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        sessionStorage.setItem('loginReturnTo', 'checkout.html');
        window.location.href = 'login.html';
        return;
      }

      const cart = getCart();
      if (cart.length === 0) { window.location.href = 'index.html'; return; }

      // Validate all fields
      const emailVal = document.getElementById('chk-email').value.trim();
      const phoneVal = document.getElementById('chk-phone').value.trim();
      const fnameVal = document.getElementById('chk-fname').value.trim();
      const lnameVal = document.getElementById('chk-lname').value.trim();
      const addressVal = document.getElementById('chk-address').value.trim();
      const cityVal = document.getElementById('chk-city').value.trim();
      const stateVal = document.getElementById('chk-state').value.trim();
      const pinVal = document.getElementById('chk-pin').value.trim();

      if (!isValidEmail(emailVal)) { showToast('Please enter a valid email address.', 'error'); document.getElementById('chk-email').focus(); return; }
      if (!isValidPhone(phoneVal)) { showToast('Please enter a valid 10-digit phone number starting with 6–9.', 'error'); document.getElementById('chk-phone').focus(); return; }
      if (!fnameVal) { showToast('Please enter your first name.', 'error'); document.getElementById('chk-fname').focus(); return; }
      if (!lnameVal) { showToast('Please enter your last name.', 'error'); document.getElementById('chk-lname').focus(); return; }
      if (!addressVal) { showToast('Please enter your delivery address.', 'error'); document.getElementById('chk-address').focus(); return; }
      if (!cityVal) { showToast('Please enter your city.', 'error'); document.getElementById('chk-city').focus(); return; }
      if (!stateVal) { showToast('Please enter your state.', 'error'); document.getElementById('chk-state').focus(); return; }
      if (!isValidPin(pinVal)) { showToast('Please enter a valid 6-digit PIN code.', 'error'); document.getElementById('chk-pin').focus(); return; }

      if (radioOnline.checked) {
        if (!isValidUTR(chkUtr?.value)) {
          showToast('Please enter a valid UTR / Transaction ID (at least 12 characters).', 'error');
          chkUtr?.focus();
          return;
        }
      }

      submitBtn.innerText = 'Processing Order...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      try {
        // Fetch real prices from Firestore
        const productsSnap = await getDocs(collection(db, 'products'));
        const priceMap = {};
        productsSnap.forEach(doc => {
          if (doc.data().price) {
            priceMap[doc.id] = doc.data().price;
          }
        });

        let subtotal = 0, totalWeight = 0;
        cart.forEach(item => {
          let realPrice = item.price;
          if (item.variantId && priceMap[item.variantId]) {
            realPrice = priceMap[item.variantId];
          } else if (item.weight) {
            const fallbackId = `variant-${item.weight}kg`;
            if (priceMap[fallbackId]) {
              realPrice = priceMap[fallbackId];
            }
          }
          item.price = realPrice;
          subtotal += (realPrice * item.qty);
          totalWeight += (item.weight * item.qty);
        });
        const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
        const grandTotal = subtotal + shipping;

        const notesVal = document.getElementById('chk-notes')?.value.trim() || '';

        const orderData = {
          uid: currentUser.uid,
          contactEmail: emailVal,
          contactPhone: phoneVal,
          shippingAddress: {
            firstName: fnameVal,
            lastName: lnameVal,
            address: addressVal,
            city: cityVal,
            state: stateVal,
            pin: pinVal,
          },
          paymentMethod: radioOnline.checked ? 'QR_CODE' : 'COD',
          utr: radioOnline.checked ? chkUtr.value.trim() : null,
          orderNotes: notesVal,
          items: cart,
          subtotal,
          shipping,
          total: grandTotal,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };

        const orderRef = await addDoc(collection(db, "orders"), orderData);

        // Save new address to Firebase if no saved address was selected
        const savedSelect = document.getElementById('saved-addr-select');
        if (!savedSelect || !savedSelect.value) {
          try {
            await addDoc(collection(db, "addresses"), {
              uid: currentUser.uid,
              name: `${fnameVal} ${lnameVal}`,
              phone: phoneVal,
              house: addressVal,
              area: '',
              city: cityVal,
              state: stateVal,
              pin: pinVal,
              label: 'Delivery Address',
              isDefault: true,
              createdAt: new Date().toISOString()
            });
          } catch (addrErr) {
            console.warn("Could not auto-save address:", addrErr);
          }
        }

        successModal.classList.add('show');
        localStorage.removeItem('kadCart');
      } catch (error) {
        console.error("Error creating order:", error);
        showToast('Network error. Please check your connection and try again.', 'error');
        submitBtn.innerText = 'Complete Order';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    });
  }

  // QR Zoom
  const qrImg = document.getElementById('qr-img');
  const qrZoomModal = document.getElementById('qr-zoom-modal');
  if (qrImg && qrZoomModal) {
    qrImg.addEventListener('click', () => qrZoomModal.classList.add('show'));
    qrZoomModal.addEventListener('click', () => qrZoomModal.classList.remove('show'));
  }
});
