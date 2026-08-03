import { db } from './firebase.js';
import { collection, addDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth >= 768) return; // Only run on mobile

  // Mobile Navigation Drawer Logic
  const hamburgerBtn = document.getElementById('mobile-hamburger-btn');
  const navOverlay = document.getElementById('mobile-nav-overlay');
  const navDrawer = document.getElementById('mobile-nav-drawer');
  const navCloseBtn = document.getElementById('mobile-nav-close');
  const navLinks = document.querySelectorAll('.mob-nav-link');

  function openMobNav() {
    if(navOverlay) { navOverlay.style.display = 'block'; setTimeout(() => navOverlay.style.opacity = '1', 10); }
    if(navDrawer) navDrawer.style.left = '0';
  }

  function closeMobNav() {
    if(navDrawer) navDrawer.style.left = '-300px';
    if(navOverlay) {
      navOverlay.style.opacity = '0';
      setTimeout(() => navOverlay.style.display = 'none', 300);
    }
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobNav);
  if (navCloseBtn) navCloseBtn.addEventListener('click', closeMobNav);
  if (navOverlay) navOverlay.addEventListener('click', closeMobNav);
  navLinks.forEach(link => link.addEventListener('click', closeMobNav));

  const variants = document.querySelectorAll('.mp-variant-btn');
  const priceMain = document.querySelector('.mp-current-price');
  const mrpMain = document.querySelector('.mp-mrp');
  const qtyMinus = document.querySelector('.mp-qty-btn.minus');
  const qtyPlus = document.querySelector('.mp-qty-btn.plus');
  const qtyVal = document.querySelector('.mp-qty-val');

  // Sticky bar elements — use IDs set in HTML
  const stickyBar = document.querySelector('.mobile-sticky-bar');
  const stickyPrice = document.getElementById('msb-price-display');
  const stickyMrp = document.getElementById('msb-mrp-display');
  const stickyWeight = document.querySelector('.msb-weight');
  const stickyDiscount = document.getElementById('msb-discount-display');
  
  let currentQty = 1;
  let currentPrice = 1099;
  let currentMrp = 1099;

  const mpDiscount = document.querySelector('.mp-discount');

  function updatePrices() {
    const formattedPrice = '₹' + (currentPrice * currentQty).toLocaleString('en-IN');
    const formattedMrp = '₹' + (currentMrp * currentQty).toLocaleString('en-IN');
    
    priceMain.textContent = formattedPrice;
    stickyPrice.textContent = formattedPrice;
    qtyVal.textContent = currentQty;

    // Handle MRP and Discount visibility
    if (currentPrice < currentMrp) {
      mrpMain.textContent = formattedMrp;
      mrpMain.style.display = 'inline-block';
      stickyMrp.textContent = formattedMrp;
      stickyMrp.style.display = 'inline-block';

      const discountPercent = Math.round(((currentMrp - currentPrice) / currentMrp) * 100);
      mpDiscount.textContent = `Save ${discountPercent}%`;
      mpDiscount.style.display = 'inline-block';
      if(stickyDiscount) {
        stickyDiscount.textContent = `Save ${discountPercent}%`;
        stickyDiscount.style.display = 'inline-block';
      }
    } else {
      mrpMain.style.display = 'none';
      stickyMrp.style.display = 'none';
      mpDiscount.style.display = 'none';
      if(stickyDiscount) stickyDiscount.style.display = 'none';
    }
  }

  variants.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      variants.forEach(v => v.classList.remove('active'));
      // Add active to clicked
      btn.classList.add('active');
      
      // Update values
      currentPrice = parseInt(btn.dataset.price);
      currentMrp = parseInt(btn.dataset.mrp);
      currentQty = 1; // Reset qty on variant change
      
      stickyWeight.textContent = btn.dataset.title || btn.querySelector('.mp-v-title').textContent;
      
      updatePrices();
    });
  });

  qtyMinus.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      updatePrices();
    }
  });

  qtyPlus.addEventListener('click', () => {
    if (currentQty < 10) {
      currentQty++;
      updatePrices();
    }
  });

  // Scroll listener for sticky bar
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      stickyBar.classList.add('visible');
    } else {
      stickyBar.classList.remove('visible');
    }
  });

  // FAQ Accordion Logic
  const faqItems = document.querySelectorAll('.mfaq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.mfaq-q');
    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all others
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.mfaq-icon').textContent = '+';
      });

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
        item.querySelector('.mfaq-icon').textContent = '−';
      }
    });
  });

  // -----------------------------------------
  // Action Buttons (Cart, Buy Now)
  // -----------------------------------------
  const addToCartBtns = document.querySelectorAll('.mp-add-cart-btn, .msb-add-btn');
  const buyNowBtns = document.querySelectorAll('.mp-buy-now-btn');
  const headerCartBtn = document.querySelector('.mh-cart-btn');

  function getCartItem() {
    const activeVariant = document.querySelector('.mp-variant-btn.active');
    const stickyWeightText = stickyWeight.textContent || '1 Kg';
    let parsedWeight = 1;
    if (stickyWeightText.includes('5')) parsedWeight = 5;
    if (stickyWeightText.includes('10')) parsedWeight = 10;
    
    const subtitle = activeVariant && activeVariant.dataset.subtitle ? activeVariant.dataset.subtitle : '';
    
    return {
      title: stickyWeightText,
      sub: subtitle,
      price: currentPrice,
      mrp: currentMrp,
      qty: currentQty,
      weight: parsedWeight,
      total: currentPrice * currentQty,
      image: 'kad-multiplier-cropped.png'
    };
  }

  function addToCart(redirect = false) {
    const cartData = getCartItem();
    let currentCart = JSON.parse(localStorage.getItem('kadCart') || '[]');
    const existingIndex = currentCart.findIndex(item => item.title === cartData.title && item.sub === cartData.sub);
    
    if (existingIndex >= 0) {
      currentCart[existingIndex].qty += cartData.qty;
      currentCart[existingIndex].total = currentCart[existingIndex].qty * currentCart[existingIndex].price;
    } else {
      currentCart.push(cartData);
    }
    
    localStorage.setItem('kadCart', JSON.stringify(currentCart));
    
    if (redirect) {
      window.location.href = 'checkout.html';
    } else {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    }
  }

  addToCartBtns.forEach(btn => {
    btn.addEventListener('click', () => addToCart(false));
  });

  buyNowBtns.forEach(btn => {
    btn.addEventListener('click', () => addToCart(true));
  });

  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  // ---- Lead Form → Firebase ----
  const leadForm = document.getElementById('mobile-lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('lead-name').value.trim();
      const phoneVal = document.getElementById('lead-phone').value.trim();
      const cropVal = document.getElementById('lead-crop').value.trim();
      const errEl = document.getElementById('lead-error');
      const successEl = document.getElementById('lead-success');
      const submitBtn = document.getElementById('lead-submit-btn');

      errEl.style.display = 'none';
      if (!nameVal || nameVal.length < 2) { errEl.textContent = 'Please enter your name.'; errEl.style.display = 'block'; return; }
      if (!/^[6-9]\d{9}$/.test(phoneVal)) { errEl.textContent = 'Please enter a valid 10-digit mobile number.'; errEl.style.display = 'block'; return; }

      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        await addDoc(collection(db, 'leads'), {
          name: nameVal,
          phone: phoneVal,
          crop: cropVal || 'Not specified',
          source: 'mobile_lead_form',
          createdAt: new Date().toISOString()
        });
        successEl.style.display = 'block';
        leadForm.reset();
        submitBtn.textContent = 'Submitted ✓';
      } catch (err) {
        errEl.textContent = 'Failed to submit. Please call us at +91 8088775223.';
        errEl.style.display = 'block';
        submitBtn.textContent = 'Request Free Consultation';
        submitBtn.disabled = false;
        console.error(err);
      }
    });
  }

});
