document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth >= 768) return; // Only run on mobile

  const variants = document.querySelectorAll('.mp-variant-btn');
  const priceMain = document.querySelector('.mp-current-price');
  const mrpMain = document.querySelector('.mp-mrp');
  const qtyMinus = document.querySelector('.mp-qty-btn.minus');
  const qtyPlus = document.querySelector('.mp-qty-btn.plus');
  const qtyVal = document.querySelector('.mp-qty-val');
  
  // Sticky bar elements
  const stickyBar = document.querySelector('.mobile-sticky-bar');
  const stickyPrice = document.querySelector('.msb-price');
  const stickyMrp = document.querySelector('.msb-mrp');
  const stickyWeight = document.querySelector('.msb-weight');
  
  let currentQty = 1;
  let currentPrice = 1099;
  let currentMrp = 1099;

  const mpDiscount = document.querySelector('.mp-discount');
  const stickyDiscount = document.querySelector('.msb-discount');

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
  const addToCartBtns = document.querySelectorAll('.mp-add-cart-btn, .msb-add-btn, .mp-buy-now-btn');
  const headerCartBtn = document.querySelector('.mh-cart-btn');

  function proceedToCheckout() {
    // Save current selection to localStorage
    const stickyWeightText = stickyWeight.textContent || '1 Kg';
    let parsedWeight = 1;
    if (stickyWeightText.includes('5')) parsedWeight = 5;
    if (stickyWeightText.includes('10')) parsedWeight = 10;
    
    const cartData = {
      title: stickyWeightText, // using the title we track for the sticky bar
      sub: '',
      price: currentPrice,
      mrp: currentMrp,
      qty: currentQty,
      weight: parsedWeight,
      total: currentPrice * currentQty,
      image: '/kad-multiplier-cropped.png'
    };
    
    localStorage.setItem('kadCart', JSON.stringify([cartData]));
    window.location.href = '/checkout.html';
  }

  addToCartBtns.forEach(btn => {
    btn.addEventListener('click', proceedToCheckout);
  });

  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', () => {
      window.location.href = '/checkout.html';
    });
  }

});
