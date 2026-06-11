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

images[0].onload = render
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
    end: () => "+=" + (window.innerHeight * 9.5), // Lock the video scroll length to exactly 950vh to permanently preserve perfect timing
    scrub: 0.5 // smooth scrubbing
  },
  onUpdate: render
})


// --- 3. Preloader Animation ---
  // --- Wow Factor Preloader ---
  const preloaderText = new SplitType('.reveal-text', { types: 'chars' });
  
  const tl = gsap.timeline()
  
  tl.from(preloaderText.chars, { 
      opacity: 0, 
      y: 100, 
      rotateX: -90, 
      stagger: 0.05, 
      duration: 1.2, 
      ease: 'expo.out',
      delay: 0.2
    })
    .to(preloaderText.chars, {
      color: '#c2f970',
      '-webkit-text-stroke': '1px #c2f970',
      textShadow: '0 0 30px rgba(194,249,112,0.8)',
      duration: 0.5,
      stagger: 0.03,
      ease: 'power2.inOut'
    }, "-=0.5")
    .to('.preloader-text', {
      scale: 1.5,
      opacity: 0,
      duration: 0.8,
      ease: 'power4.in'
    }, "+=0.4")
    .to('.preloader', { yPercent: -100, duration: 1, ease: 'power4.inOut' }, "-=0.4")
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
  heroProductImg.addEventListener('click', scrollToBottom);
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
        // Open the full-page bubble cart after animation completes
        openFullPageCart(this);
        
        // Reset button state after 2 seconds so they can do it again
        setTimeout(() => {
          gsap.set(this, { width: origWidth, background: 'white' });
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
    weightBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeBtn = btn;
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

if(btnPlus) {
  btnPlus.addEventListener('click', () => {
    currentQty++;
    qtyDisplay.innerHTML = currentQty;
    updatePrice();
  });
}

if(btnMinus) {
  btnMinus.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      qtyDisplay.innerHTML = currentQty;
      updatePrice();
    }
  });
}

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

// --- Navbar Color State (Dark Text on White Sections) ---
const lightSections = document.querySelectorAll('.bg-light, .purchase-section');
lightSections.forEach(sec => {
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 80px',
    end: 'bottom 80px',
    toggleClass: { targets: '.navbar', className: 'text-dark' }
  });
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

    // Hide cursor if we hover over navbar (top 80px) or if scrolled down
    if (e.clientY < 80 || window.scrollY > 50) {
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
