// js/promo.js — Back-to-School 70% OFF for 10 days
(function () {
  // Fixed promo window + code
  const START_UTC = '2025-09-22T00:00:00Z';
  const DAYS = 10;
  const CODE = 'BACK2SCHOOL70';

  const start = new Date(START_UTC).getTime();
  const end = start + DAYS * 86400 * 1000;

  // Payment link behaviour:
  // If you have a Stripe Payment Link that ALREADY has the 70% discount applied,
  // place it here and it will be used whenever the promo is active.
  // Otherwise, we pass ?promo=BACK2SCHOOL70 to premium/checkout and your backend (or Stripe) can apply it.
  const PROMO_CHECKOUT_URL = ''; // keep blank if using your normal premium flow

  // Public API for other pages (premium/pricing)
  window.PROMO = {
    active: () => Date.now() >= start && Date.now() < end,
    endsAt: () => end,
    code: CODE,
    checkoutUrl: PROMO_CHECKOUT_URL
  };

  // Index banner hookup
  document.addEventListener('DOMContentLoaded', function () {
    const banner = document.getElementById('promo-banner');
    const codeEl = document.getElementById('promo-code-badge');
    const timerEl = document.getElementById('promo-timer');
    const link = document.getElementById('promo-upgrade-link');

    if (!banner) return;

    if (!window.PROMO.active()) { banner.hidden = true; return; }
    banner.hidden = false;

    if (codeEl) codeEl.textContent = CODE;

    if (link) {
      if (PROMO_CHECKOUT_URL) {
        link.href = PROMO_CHECKOUT_URL;
      } else {
        const u = new URL(link.getAttribute('href'), location.href);
        u.searchParams.set('promo', CODE);
        link.setAttribute('href', u.toString());
      }
    }

    if (!timerEl) return;
    function tick() {
      const now = Date.now();
      const left = Math.max(0, end - now);
      const d = Math.floor(left / 86400000);
      const h = Math.floor((left % 86400000) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      timerEl.textContent = `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (left <= 0) { banner.hidden = true; clearInterval(iv); }
    }
    tick();
    const iv = setInterval(tick, 1000);
  });
})();
