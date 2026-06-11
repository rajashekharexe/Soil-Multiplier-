import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  lerp: 0.06, // Physics-based dampening for ultra-smooth organic feel
  wheelMultiplier: 1.2, // Slightly more scroll per wheel tick
  smoothWheel: true,
  smoothTouch: false, // Native mobile touch is already perfectly hardware accelerated
  syncTouch: true // Syncs touch scroll with JS to prevent desync on mobile
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

export default lenis;

// Smooth anchor scrolling interception
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if(targetId === '#') return;
      
      if(targetId === '#purchase') {
        // Scroll to the absolute bottom to ensure full cart is visible
        lenis.scrollTo('bottom', { duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      } else {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          lenis.scrollTo(targetElement, { offset: -80, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        }
      }
    });
  });
});
