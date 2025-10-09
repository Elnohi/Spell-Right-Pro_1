/* main-premium.js
   - Wires Upgrade buttons to Stripe Payment Links (70% promo)
   - Keeps Firebase/Analytics intact (loaded earlier)
   - Small stability guards for smoother UX
*/

// REAL Stripe Payment Links (Back-to-School 70% OFF)
const STRIPE_MONTHLY_URL = 'https://buy.stripe.com/cNi6oHbXE34ybVE4uq83C03';
const STRIPE_ANNUAL_URL  = 'https://buy.stripe.com/cNieVd9PwbB42l4aSO83C04';

// Buttons
const btnMonthly = document.getElementById('buy-monthly');
const btnAnnual  = document.getElementById('buy-annual');
const helpBtn    = document.getElementById('help-btn');

function openCheckout(url){
  try {
    // extra safety: stop any speech, which sometimes “sticks” on mobile
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch(e) {}
  // use top-level navigation (avoids sandboxing in some browsers)
  window.location.assign(url);
}

btnMonthly?.addEventListener('click', () => openCheckout(STRIPE_MONTHLY_URL));
btnAnnual?.addEventListener('click',  () => openCheckout(STRIPE_ANNUAL_URL));
helpBtn?.addEventListener('click',   () => window.location.href = 'contact.html');

// ---- Robustness: recover from hidden/visible changes (audio + timers) ----
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch(e){}
  }
});

// Guard: catch unhandled promise rejections (prevents silent hangs)
window.addEventListener('unhandledrejection', (e) => {
  // You could log to analytics if desired:
  // gtag('event', 'unhandled_rejection', { message: String(e.reason) });
  // avoid default console noise in production
});

// Note: login is intentionally removed from this page per your decision.
// If later needed, auth UI can be added on a separate settings/profile page.
