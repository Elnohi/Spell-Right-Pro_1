// js/ads-manager.js
// AdSense is loaded ONLY after the user explicitly accepts cookies.
// The <script src="pagead2..."> tag is never present in the HTML — this
// module injects it dynamically, which is the only GDPR-compliant approach.
(() => {
  'use strict';

  const AD_CLIENT = 'ca-pub-7632930282249669';

  // Real ad slot IDs from your AdSense account.
  // Replace placeholder values once AdSense approves your site.
  const AD_SLOTS = {
    horizontal: '1234567890',   // TODO: replace with real slot ID
    rectangle:  '0987654321'    // TODO: replace with real slot ID
  };

  const adManager = {

    // Ad placements — injected into the page after consent
    placements: [
      {
        id:        'header-ad',
        selector:  'header',
        position:  'afterend',
        format:    'horizontal',
        maxHeight: 90
      },
      {
        id:        'post-practice-ad',
        selector:  '.summary-area',
        position:  'beforebegin',
        format:    'rectangle',
        maxHeight: 250,
        // Only show after a practice session has ended
        condition: () => {
          const el = document.querySelector('.summary-area');
          return el && el.style.display !== 'none' && el.innerHTML.trim() !== '';
        }
      },
      {
        id:        'footer-ad',
        selector:  'footer',
        position:  'beforebegin',
        format:    'horizontal',
        maxHeight: 90
      }
    ],

    // ── Public API ────────────────────────────────────────────────────────

    // Called once on page load. Decides whether to activate ads now
    // or wait for the user to accept cookies.
    init() {
      if (this._isPremiumUser()) {
        console.log('🔕 Ads suppressed — premium user');
        return;
      }

      const consent = localStorage.getItem('cookieConsent');

      if (consent === 'true') {
        // User already accepted in a previous session — load immediately
        this._activate();
      } else if (consent === null) {
        // Consent decision not yet made — wait for the custom event
        // fired by the cookie consent banner's acceptCookies()
        window.addEventListener('cookieConsentAccepted', () => this._activate(), { once: true });
        console.log('⏳ Ads waiting for cookie consent...');
      } else {
        // consent === 'false' — user declined, never load ads
        console.log('🚫 Ads disabled — user declined cookies');
      }
    },

    // Called when a premium subscription is activated mid-session
    removeAds() {
      document.querySelectorAll('.ad-container').forEach(el => el.remove());
      // Also remove the AdSense script tag so it stops making requests
      const script = document.querySelector('script[src*="adsbygoogle"]');
      if (script) script.remove();
      console.log('🧹 Ads removed — premium activated');
    },

    // ── Private ───────────────────────────────────────────────────────────

    _isPremiumUser() {
      return window.tierManager?.currentTier === 'premium';
    },

    // Injects the AdSense <script> tag, then places ad slots once loaded.
    // This function must never be called before consent is confirmed.
    _activate() {
      if (this._isPremiumUser()) return;

      // Guard: if the script is somehow already present, just push slots
      if (document.querySelector('script[src*="adsbygoogle"]')) {
        this._pushAllSlots();
        return;
      }

      console.log('📢 Cookie consent confirmed — loading AdSense...');

      // Place the empty ad containers in the DOM first so layout is stable
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._placeContainers());
      } else {
        this._placeContainers();
      }

      // Inject the AdSense script — this is the first network call to Google
      const script = document.createElement('script');
      script.src         = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
      script.async       = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        console.log('✅ AdSense script loaded');
        this._pushAllSlots();
        if (typeof window.trackEvent === 'function') {
          window.trackEvent('ads_loaded', {
            ad_count: document.querySelectorAll('.adsbygoogle').length,
            page:     window.location.pathname
          });
        }
      };

      script.onerror = () => {
        console.warn('⚠️ AdSense script failed to load (ad blocker or network issue)');
      };

      document.head.appendChild(script);
    },

    // Builds and inserts ad container divs (without pushing to adsbygoogle yet)
    _placeContainers() {
      this.placements.forEach(placement => {
        // Skip if condition not met
        if (placement.condition && !placement.condition()) return;

        // Skip if already placed
        if (document.getElementById(`ad-${placement.id}`)) return;

        const target = document.querySelector(placement.selector);
        if (!target) return;

        // Outer container
        const container = document.createElement('div');
        container.id            = `ad-${placement.id}`;
        container.className     = 'ad-container';
        container.style.cssText = [
          'margin: 20px auto',
          'text-align: center',
          `min-height: ${placement.maxHeight}px`,
          'display: flex',
          'flex-direction: column',
          'align-items: center',
          'justify-content: center',
          'background: rgba(0,0,0,0.02)',
          'border-radius: 8px',
          'border: 1px dashed rgba(0,0,0,0.08)',
          'overflow: hidden'
        ].join(';');

        // "Advertisement" label
        const label        = document.createElement('div');
        label.className    = 'ad-label';
        label.textContent  = 'Advertisement';
        label.style.cssText = 'font-size:0.75em;color:#999;margin-bottom:4px;';
        container.appendChild(label);

        // The <ins> element AdSense writes into
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client',            AD_CLIENT);
        ins.setAttribute('data-ad-slot',              AD_SLOTS[placement.format] || AD_SLOTS.horizontal);
        ins.setAttribute('data-ad-format',            placement.format === 'rectangle' ? 'rectangle' : 'auto');
        ins.setAttribute('data-full-width-responsive','true');
        container.appendChild(ins);

        target.insertAdjacentElement(placement.position, container);
        console.log(`📦 Ad container placed: ${placement.id}`);
      });
    },

    // Calls adsbygoogle.push({}) for every uninitialized <ins> slot
    _pushAllSlots() {
      const adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle = adsbygoogle;

      document.querySelectorAll('ins.adsbygoogle').forEach(ins => {
        // AdSense marks initialized slots with data-adsbygoogle-status
        if (!ins.getAttribute('data-adsbygoogle-status')) {
          try {
            adsbygoogle.push({});
          } catch (err) {
            console.warn('Ad slot push error:', err);
          }
        }
      });
    }
  };

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => adManager.init());
  } else {
    adManager.init();
  }

  // Listen for tier upgrades mid-session so ads are removed immediately
  document.addEventListener('tierChange', e => {
    if (e.detail?.tier === 'premium') adManager.removeAds();
  });

  window.adManager = adManager;
})();
