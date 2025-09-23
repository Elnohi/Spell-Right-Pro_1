// js/promo.js — Back-to-School 70% OFF for 10 days
(function () {
  // Configure once here:
  const START_UTC = '2025-09-22T00:00:00Z';      // promo start
  const DAYS = 10;                               // duration in days
  const CODE = 'BACK2SCHOOL70';                  // shown to users
  // If you have a Stripe Payment Link that already includes the discount, place it here:
  const PROMO_CHECKOUT_URL = '';                 // optional; leave empty to use your normal premium.html flow

  const start = new Date(START_UTC).getTime();
  const end = start + DAYS * 86400 * 1000;

  // public API
  window.PROMO = {
    active: () => Date.now() >= start && Date.now() < end,
    endsAt: () => end,
    code: CODE,
    checkoutUrl: PROMO_CHECKOUT_URL
  };

  // index page banner
  document.addEventListener('DOMContentLoaded', function () {
    const banner = document.getElementById('promo-banner');
    if (!banner) return;
    if (!window.PROMO.active()) { banner.hidden = true; return; }
    banner.hidden = false;

    // show code
    const codeEl = document.getElementById('promo-code-badge');
    if (codeEl) codeEl.textContent = CODE;

    // upgrade link override
    const link = document.getElementById('promo-upgrade-link');
    if (link) {
      if (PROMO_CHECKOUT_URL) {
        link.href = PROMO_CHECKOUT_URL;
      } else {
        // pass promo hint via querystring to premium page
        const u = new URL(link.href, location.href);
        u.searchParams.set('promo', CODE);
        link.href = u.toString();
      }
    }

    // countdown
    const timerEl = document.getElementById('promo-timer');
    function tick() {
      const now = Date.now();
      const left = Math.max(0, end - now);
      const d = Math.floor(left / 86400000);
      const h = Math.floor((left % 86400000) / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      if (timerEl) timerEl.textContent = `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (left <= 0) { banner.hidden = true; clearInterval(iv); }
    }
    tick();
    const iv = setInterval(tick, 1000);
  });
})();
