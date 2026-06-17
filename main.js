import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'
import lenis from './lenis-init.js'

gsap.registerPlugin(ScrollTrigger)


lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

// Initialize all SplitType text globally
const splitTextElements = document.querySelectorAll('.split-text')
splitTextElements.forEach(element => {
  new SplitType(element, { types: 'chars, words' })
})

// --- 2. Canvas Video Frame Sequence & Cinematic Master Timeline ---
const canvas = document.getElementById('video-canvas')
const context = canvas.getContext('2d')
const frameCount = 534

canvas.width = 1280
canvas.height = 711

const currentFrame = index => `/frames/frame_${String(index).padStart(4, '0')}.jpg`
const images = []
const airpods = { frame: 1 }

for (let i = 1; i <= frameCount; i++) {
  const img = new Image()
  img.src = currentFrame(i)
  images.push(img)
}

  const preloaderText = new SplitType('.reveal-text', { types: 'chars' });
  const tl = gsap.timeline({ paused: true });

  function render() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(images[airpods.frame - 1], 0, 0)
  }

  // Animate video frames on scroll, locked to a perfect 950vh length!
  gsap.to(airpods, {
    frame: frameCount,
    snap: 'frame',
    ease: 'none',
    scrollTrigger: {
      trigger: '#smooth-content',
      start: 'top top',
      end: () => "+=" + (window.innerHeight * 9.5),
      scrub: 0.5
    },
    onUpdate: render
  })

  let preloaderStarted = false;
  function startPreloader() {
    if (preloaderStarted) return;
    preloaderStarted = true;
    tl.play();
  }

  images[0].onload = () => {
    render();
    startPreloader();
  };
  
  if (images[0].complete) {
    render();
    startPreloader();
  }

  // Fallback: If Vercel/network is extremely slow, reveal the site anyway after 4 seconds
  setTimeout(startPreloader, 4000);
  
  // Set initial states for Ripple Focus
  gsap.set(preloaderText.chars, { opacity: 0, scale: 1.5, filter: 'blur(20px)' });

  // 1. Draw the glowing line
  tl.to('.preloader-line', {
    width: '100%',
    duration: 1,
    ease: 'expo.inOut',
    delay: 0.2
  })
  // 2. Split the window open
  .to('.preloader-content', {
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    duration: 1.2,
    ease: 'power4.inOut'
  }, "-=0.2")
  // 3. Ripple Focus Reveal (Staggered de-blur and scale per character)
  .to(preloaderText.chars, {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    duration: 0.8,
    stagger: 0.03,
    ease: 'power3.out'
  }, "-=0.6")
  // 4. Gold sheen across characters
  .to(preloaderText.chars, {
    backgroundPosition: '-200% 0%',
    duration: 1.2,
    ease: 'power2.inOut'
  }, "-=0.6")
  // 5. Hide the line early
  .to('.preloader-line', {
    opacity: 0,
    duration: 0.3
  }, "-=1.5")
  // 6. Fade the text out instantly
  .to('.preloader-text', {
    opacity: 0,
    y: -20,
    duration: 0.5,
    ease: 'power2.inOut'
  }, "-=0.4")
  // 7. Reveal website fast
  .to('.preloader', {
    yPercent: -100,
    borderBottomLeftRadius: '50% 20%',
    borderBottomRightRadius: '50% 20%',
    duration: 0.8,
    ease: 'power4.inOut'
  }, "-=0.2")
  .set('.preloader', { display: 'none' })
    .to('.hero', { opacity: 1, duration: 0.5 }, "-=1") // Make hero visible
    .from('.hero-title .title-line', { y: 100, opacity: 0, duration: 1, stagger: 0.1, ease: 'power4.out' }, "-=0.5")
    .from('.hero-subtitle', { opacity: 0, y: 20, duration: 1, ease: 'power3.out' }, "-=0.8")


// --- 4. Scroll Animations (Text Split & Fade Up) ---

// Split text setup
const splitElements = document.querySelectorAll('.split-text')
splitElements.forEach(element => {
  // SplitType was already initialized at the top of the file
  gsap.from(element.querySelectorAll('.char'), {
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 50,
    rotateX: -90,
    stagger: 0.02,
    duration: 0.8,
    ease: 'back.out(1.7)'
  })
})

// Fade Up Elements
const fadeElements = document.querySelectorAll('.fade-up')
fadeElements.forEach(element => {
  gsap.from(element, {
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 30,
    duration: 1,
    ease: 'power3.out'
  })
})

// --- 5. Full Page Bubble Cart Logic ---
const fpc = document.getElementById('full-page-cart')
const closeFpcBtn = document.getElementById('close-cart')

let lastCartOriginX = window.innerWidth / 2;
let lastCartOriginY = window.innerHeight / 2;

function openFullPageCart(buttonElement) {
  // Get button coordinates for the bubble origin
  const rect = buttonElement.getBoundingClientRect();
  lastCartOriginX = rect.left + rect.width / 2;
  lastCartOriginY = rect.top + rect.height / 2;
  
  fpc.classList.add('open');
  lenis.stop(); // Prevent background scrolling
  
  // Animate the bubble expanding from the clicked button
  gsap.fromTo(fpc, 
    { clipPath: `circle(0px at ${lastCartOriginX}px ${lastCartOriginY}px)` },
    { clipPath: `circle(150% at ${lastCartOriginX}px ${lastCartOriginY}px)`, duration: 0.8, ease: 'power3.inOut' }
  );
  
  // Stagger animate the cart content fading in
  gsap.fromTo('.fpc-inner > *', 
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
  );
}

function closeFullPageCart() {
  // Animate the circle shrinking back to the exact button that opened it!
  gsap.to(fpc, {
    clipPath: `circle(0px at ${lastCartOriginX}px ${lastCartOriginY}px)`,
    duration: 0.6,
    ease: 'power3.inOut',
    onComplete: () => {
      fpc.classList.remove('open');
      lenis.start(); // Resume scrolling
    }
  });
}

closeFpcBtn.addEventListener('click', closeFullPageCart)

// Make product images clickable to scroll to purchase section
const heroProductImg = document.getElementById('product-img');
const dynamicProductImg = document.getElementById('dynamic-product-image');

const scrollToBottom = () => {
  lenis.scrollTo('bottom', { duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
};

if (heroProductImg) {
  heroProductImg.addEventListener('click', () => {
    const specsSection = document.getElementById('specs');
    if (specsSection) {
      lenis.scrollTo(specsSection, { offset: -80, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    }
  });
}

if (dynamicProductImg) {
  dynamicProductImg.addEventListener('click', scrollToBottom);
}

// --- 6. Video Cart Button Animation Logic ---
const videoCartBtns = document.querySelectorAll('.video-cart-btn')

videoCartBtns.forEach(btn => {
  btn.addEventListener('click', function(e) {
    if (this.classList.contains('animating')) return;
    this.classList.add('animating');
    
    const icon = this.querySelector('.vcb-icon');
    const letters = this.querySelectorAll('.vcb-text span');
    const addedState = this.querySelector('.vcb-added');
    
    // Store original width for resetting
    const isNav = this.classList.contains('nav-video-cart');
    const origWidth = isNav ? 100 : 220;
    const openWidth = isNav ? 120 : 220; // Give it a bit more room for the longer "Opened!" text
    const circleSize = isNav ? 40 : 60;
    const greenColor = '#113c18'; // Matches the brand primary green
    
    const tl = gsap.timeline({
      onComplete: () => {
        // --- Premium UX: Confetti & Toast ---
        if (!isNav) {
          const rect = btn.getBoundingClientRect();
          const x = (rect.left + rect.width / 2) / window.innerWidth;
          const y = (rect.top + rect.height / 2) / window.innerHeight;
          
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { x, y },
            colors: ['#4ade80', '#fbbf24', '#ffffff']
          });

          const toast = document.getElementById('toast');
          gsap.to(toast, { top: 20, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' });
          setTimeout(() => {
            gsap.to(toast, { top: -100, opacity: 0, duration: 0.5, ease: 'power2.in' });
          }, 3000);
        }

        // Open the full-page bubble cart after animation completes
        openFullPageCart(this);
        
        // Reset button state after 2 seconds so they can do it again
        setTimeout(() => {
          gsap.set(this, { clearProps: "width,background" });
          gsap.set(icon, { x: 0, opacity: 1 });
          gsap.set(letters, { y: 0, opacity: 1, rotation: 0 });
          gsap.set(addedState, { opacity: 0, scale: 0.8 });
          this.classList.remove('animating');
        }, 2000);
      }
    });
    
    // Phase 1: Letters shoot up
    tl.to(letters, {
      y: -50,
      opacity: 0,
      rotation: () => gsap.utils.random(-45, 45),
      stagger: 0.02,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);
    
    // Phase 2: Cart icon drives away
    tl.to(icon, {
      x: origWidth,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);
    
    // Phase 3: Shrink to circle & turn green
    tl.to(this, {
      width: circleSize,
      background: greenColor,
      duration: 0.3,
      ease: 'back.in(1.5)'
    }, 0.3);
    
    // Phase 4: Expand and show Added state
    tl.to(this, {
      width: openWidth,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, "+=0.1");
    
    tl.to(addedState, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(2)'
    }, "<0.1");
  });
});

// --- 7. Live Calculator Logic ---
const weightBtns = document.querySelectorAll('.weight-btn');
const qtyDisplay = document.querySelector('.qty-display');
const btnMinus = document.querySelector('.qty-btn.minus');
const btnPlus = document.querySelector('.qty-btn.plus');

const displayAmount = document.getElementById('display-price');
const displayMrpWrap = document.getElementById('display-mrp');
const displayDiscount = document.getElementById('display-discount');
const mrpStrike = document.querySelector('.mrp-strike');
const shippingCostDisplay = document.getElementById('shipping-cost');

let currentQty = 1;
let activeBtn = document.querySelector('.weight-btn.active');

function formatCurrency(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

function updatePrice() {
  if (!activeBtn) return;
  const basePrice = parseInt(activeBtn.dataset.price);
  const baseMrp = parseInt(activeBtn.dataset.mrp);
  const discount = parseInt(activeBtn.dataset.discount);
  const weight = parseInt(activeBtn.dataset.weight);

  const totalPrice = basePrice * currentQty;
  const totalMrp = baseMrp * currentQty;
  const totalWeight = weight * currentQty;
  
  // Calculate Shipping: 100rs per 5kg (Math.ceil(totalWeight / 5) * 100)
  const shippingCost = Math.ceil(totalWeight / 5) * 100;
  shippingCostDisplay.innerHTML = '₹' + formatCurrency(shippingCost);

  // Animate number counting up/down using GSAP
  gsap.to(displayAmount, {
    innerHTML: totalPrice,
    duration: 0.5,
    snap: { innerHTML: 1 },
    onUpdate: function() {
      // Format with commas during animation
      displayAmount.innerHTML = formatCurrency(Math.round(this.targets()[0].innerHTML));
    }
  });

  if (discount > 0) {
    displayMrpWrap.style.display = 'block';
    displayDiscount.style.display = 'block';
    mrpStrike.innerHTML = '₹' + formatCurrency(totalMrp);
    displayDiscount.innerHTML = discount + '% OFF';
  } else {
    displayMrpWrap.style.display = 'none';
    displayDiscount.style.display = 'none';
  }
}

// Initial setup
if(activeBtn) updatePrice();

weightBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    weightBtns.forEach(b => {
      b.classList.remove('active');
      const val = b.querySelector('.fq-val');
      if(val) val.innerHTML = '1';
    });
    btn.classList.add('active');
    activeBtn = btn;
    currentQty = 1;
    if(qtyDisplay) qtyDisplay.innerHTML = '1';
    
    updatePrice();

    const productImage = document.getElementById('dynamic-product-image');
    if (productImage) {
      const newSrc = btn.getAttribute('data-image');
      if (newSrc && !productImage.src.endsWith(newSrc)) {
        gsap.to(productImage, { 
          opacity: 0, 
          scale: 0.9, 
          duration: 0.2, 
          ease: 'power2.in',
          onComplete: () => {
            productImage.src = newSrc;
            gsap.to(productImage, { 
              opacity: 1, 
              scale: 1, 
              duration: 0.4, 
              ease: 'back.out(1.5)' 
            });
          }
        });
      }
    }
  });
});

function updateAllQtyDisplays() {
  if (qtyDisplay) qtyDisplay.innerHTML = currentQty;
  if (activeBtn) {
    const val = activeBtn.querySelector('.fq-val');
    if (val) val.innerHTML = currentQty;
  }
}

if(btnPlus) {
  btnPlus.addEventListener('click', () => {
    currentQty++;
    updateAllQtyDisplays();
    updatePrice();
  });
}

if(btnMinus) {
  btnMinus.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      updateAllQtyDisplays();
      updatePrice();
    }
  });
}

// Bind mobile inline quantity selectors
document.querySelectorAll('.wb-fake-qty').forEach(fq => {
  const m = fq.querySelector('.minus');
  const p = fq.querySelector('.plus');
  
  if (m) {
    m.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = fq.closest('.weight-btn');
      if (activeBtn !== btn) btn.click();
      if (currentQty > 1) {
        currentQty--;
        updateAllQtyDisplays();
        updatePrice();
      }
    });
  }
  
  if (p) {
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = fq.closest('.weight-btn');
      if (activeBtn !== btn) btn.click();
      currentQty++;
      updateAllQtyDisplays();
      updatePrice();
    });
  }
});

// --- 8. Cart Data Engine ---
function getCart() {
  const cart = localStorage.getItem('kadCart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('kadCart', JSON.stringify(cart));
}

const bottomCartBtn = document.getElementById('bottom-cart-btn');
if (bottomCartBtn) {
  bottomCartBtn.addEventListener('click', () => {
    if (!activeBtn) return;
    
    // Build item object
    const title = activeBtn.querySelector('.wb-title').innerText;
    const subEl = activeBtn.querySelector('.wb-sub');
    const sub = subEl ? subEl.innerText : '';
    const basePrice = parseInt(activeBtn.dataset.price);
    const weight = parseInt(activeBtn.dataset.weight);
    
    const cart = getCart();
    
    // Check if item already exists in cart to update qty, else push new
    const existingIndex = cart.findIndex(item => item.title === title && item.sub === sub);
    if (existingIndex > -1) {
      cart[existingIndex].qty += currentQty;
    } else {
      cart.push({ title, sub, price: basePrice, weight, qty: currentQty });
    }
    
    saveCart(cart);
    renderCart();
  });
}

const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartShippingEl = document.getElementById('cart-shipping');
const cartTotalEl = document.getElementById('cart-total');

function renderCart() {
  if (!cartItemsContainer) return;
  const cart = getCart();
  cartItemsContainer.innerHTML = '';
  
  let subtotal = 0;
  let totalWeight = 0;
  let totalItemsCount = 0;
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p style="padding: 2rem; color: #666;">Your cart is empty.</p>';
  }
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    totalWeight += (item.weight * item.qty);
    totalItemsCount += item.qty;
    
    const itemHtml = `
      <div class="fpc-item">
        <div class="fpc-item-img" style="background: #f4f6f8; display: flex; align-items: center; justify-content: center;">
          <img src="/kad-multiplier-cropped.png" alt="KAD Multiplier" style="width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));" />
        </div>
        <div class="fpc-item-details">
          <h4>KAD Multiplier</h4>
          <p>${item.title} ${item.sub}</p>
          <div class="fpc-item-price">\u20B9 ${formatCurrency(itemTotal)}</div>
        </div>
        <div class="fpc-item-actions">
          <div class="fpc-qty-selector">
            <button class="cart-minus" data-index="${index}">-</button>
            <span>${item.qty}</span>
            <button class="cart-plus" data-index="${index}">+</button>
          </div>
          <button class="fpc-delete-btn cart-remove" data-index="${index}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
  });
  
  const shipping = totalWeight > 0 ? Math.ceil(totalWeight / 5) * 100 : 0;
  const grandTotal = subtotal + shipping;
  
  cartSubtotalEl.innerHTML = '\u20B9 ' + formatCurrency(subtotal);
  cartShippingEl.innerHTML = shipping > 0 ? '\u20B9 ' + formatCurrency(shipping) : 'Free';
  cartTotalEl.innerHTML = '\u20B9 ' + formatCurrency(grandTotal);

  const cartBadge = document.getElementById('cart-badge');
  if (cartBadge) {
    if (totalItemsCount > 0) {
      cartBadge.style.display = 'inline-block';
      cartBadge.innerHTML = totalItemsCount;
    } else {
      cartBadge.style.display = 'none';
    }
  }
  
  const navCartBtns = document.querySelectorAll('.nav-video-cart');
  if (totalItemsCount > 0) {
    navCartBtns.forEach(btn => btn.classList.add('has-items'));
  } else {
    navCartBtns.forEach(btn => btn.classList.remove('has-items'));
  }
  
  // Attach event listeners to new buttons
  document.querySelectorAll('.cart-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      if (cart[idx].qty > 1) {
        cart[idx].qty--;
        saveCart(cart);
        renderCart();
      }
    });
  });
  document.querySelectorAll('.cart-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      cart[idx].qty++;
      saveCart(cart);
      renderCart();
    });
  });
  document.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      cart.splice(idx, 1);
      saveCart(cart);
      renderCart();
    });
  });
}

// Render on load if we're on index
if (cartItemsContainer) {
  renderCart();
}

// --- Navbar Color State removed (Handled flawlessly by CSS mix-blend-mode: difference) ---

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

// --- 9. Custom Scroll Cursor Logic ---
const scrollCursor = document.getElementById('scroll-cursor');
if (scrollCursor) {
  // Only show custom cursor if at the very top initially
  if (window.scrollY < 50) {
    document.body.classList.add('has-scroll-cursor');
  }

  // Track mouse
  window.addEventListener('mousemove', (e) => {
    // Hide if full page cart is open
    const fpc = document.getElementById('full-page-cart');
    if (fpc && fpc.classList.contains('open')) {
      document.body.classList.remove('has-scroll-cursor');
      return;
    }

    // Hide cursor if we hover over navbar (top 80px), the dropdown itself, or if scrolled down
    if (e.clientY < 80 || window.scrollY > 50 || e.target.closest('.navbar')) {
      document.body.classList.remove('has-scroll-cursor');
    } else {
      document.body.classList.add('has-scroll-cursor');
    }

    // We only animate the cursor position if it's active to save performance
    if (document.body.classList.contains('has-scroll-cursor')) {
      gsap.to(scrollCursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15, // Slight lag for smooth premium feel
        ease: 'power2.out'
      });
    } else {
      // Keep it instantly updated while hidden so it doesn't jump when reappearing
      gsap.set(scrollCursor, {
        x: e.clientX,
        y: e.clientY
      });
    }
  });

  // Toggle cursor visibility based on scroll position
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      document.body.classList.remove('has-scroll-cursor');
    }
  });
}

// --- 11. Premium UX: Magnetic Buttons ---
const magneticElements = document.querySelectorAll('.nav-links a, .nav-actions a, .nav-actions button, .bottom-video-cart');

magneticElements.forEach((elem) => {
  elem.addEventListener('mousemove', (e) => {
    const rect = elem.getBoundingClientRect();
    const h = rect.width / 2;
    const w = rect.height / 2;
    const x = e.clientX - rect.left - h;
    const y = e.clientY - rect.top - w;
    
    // Smoothly move the element towards the cursor, max distance 15px
    gsap.to(elem, {
      x: x * 0.3,
      y: y * 0.3,
      duration: 0.4,
      ease: 'power2.out'
    });
  });

  elem.addEventListener('mouseleave', () => {
    // Snap back instantly
    gsap.to(elem, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: 'elastic.out(1, 0.3)'
    });
  });
});

// --- 12. Premium UX: 3D Holographic Tilt ---
const tiltImages = document.querySelectorAll('.product-placeholder, .purchase-center');

tiltImages.forEach((container) => {
  const img = container.querySelector('img');
  if(!img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (-15 to +15 degrees)
    const xPct = (x / rect.width) - 0.5;
    const yPct = (y / rect.height) - 0.5;
    
    gsap.to(img, {
      rotateY: xPct * 30,
      rotateX: -yPct * 30,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 1000
    });
  });

  container.addEventListener('mouseleave', () => {
    // Reset based on which image it is
    const isHero = img.id === 'product-img';
    gsap.to(img, {
      rotateY: isHero ? -10 : 0,
      rotateX: isHero ? 5 : 0,
      duration: 1,
      ease: 'elastic.out(1, 0.3)'
    });
  });
});

// --- Short Pause Pin for Purchase Section ---
// Pins for exactly 150px (approx 1 scroll tick)
ScrollTrigger.create({
  trigger: ".purchase-section",
  start: "top top", 
  end: "+=150", 
  pin: true,
  pinSpacing: true
});

// --- Navbar Color Toggle for Purchase Section ---
ScrollTrigger.create({
  trigger: ".purchase-section",
  start: "top 5%", // Switch to black when the purchase section reaches the navbar
  end: "bottom 5%", // Switch back to white when leaving the purchase section
  toggleClass: {targets: ".navbar", className: "nav-dark"}
});

// --- Mobile Hamburger Menu Logic ---
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const navLinksContainer = document.querySelector(".nav-links");

if(mobileMenuBtn && navLinksContainer) {
  mobileMenuBtn.addEventListener("click", () => {
    navLinksContainer.classList.toggle("mobile-active");
  });
}

// --- Mock Authentication Logic ---
function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const authOutState = document.getElementById('auth-out-state');
  const authInState = document.getElementById('auth-in-state');
  
  if (authOutState && authInState) {
    if (isLoggedIn) {
      authOutState.style.display = 'none';
      authInState.style.display = 'block';
    } else {
      authOutState.style.display = 'block';
      authInState.style.display = 'none';
    }
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);

// Handle Log Out
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('isLoggedIn');
    updateAuthUI();
  });
}
