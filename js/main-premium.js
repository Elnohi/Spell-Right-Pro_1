// Premium page: Firebase auth + promo + checkout redirect (live endpoint)
(function(){
  const authBtn = document.getElementById('auth-btn');
  const statusLine = document.getElementById('status-line');
  const upgradeBtn = document.getElementById('upgrade-btn');
  const promoBanner = document.getElementById('promo-banner');
  const priceBadge = document.getElementById('price-badge');
  const priceLabel = document.getElementById('premium-price');

  /* ---------- Promo countdown ---------- */
  const promoEnd = new Date("2025-10-15T23:59:59");
  function updatePromo(){
    const diff = promoEnd - new Date();
    if (diff > 0){
      promoBanner.style.display = 'block';
      priceLabel.textContent = 'CAD $39.99/year';
      const hrs = Math.floor(diff / 1000 / 60 / 60);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      priceBadge.textContent = `CAD $39.99/year • ${hrs}h ${mins}m left`;
    } else {
      promoBanner.style.display = 'none';
      priceLabel.textContent = 'CAD $69.99/year';
    }
  }
  updatePromo();
  setInterval(updatePromo, 60000);

  /* ---------- Firebase Auth ---------- */
  let currentUser = null;

  function updateUI(){
    if (currentUser){
      authBtn.innerHTML = '<i class="fa fa-right-from-bracket"></i> Sign out';
      statusLine.innerHTML = `Signed in as <b>${currentUser.email || currentUser.displayName || 'user'}</b>. You can proceed to checkout.`;
      upgradeBtn.disabled = false;
    } else {
      authBtn.innerHTML = '<i class="fa fa-user"></i> Sign in';
      statusLine.textContent = 'Sign in to continue to checkout.';
      upgradeBtn.disabled = true;
    }
  }

  if (firebase?.auth) {
    firebase.auth().onAuthStateChanged(u => {
      currentUser = u;
      updateUI();
    });
  }

  authBtn.addEventListener('click', async () => {
    try {
      if (!firebase?.auth) return alert('Auth not available.');
      if (currentUser){
        await firebase.auth().signOut();
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (e) {
      alert('Sign-in failed. Please try again.');
    }
  });

  /* ---------- Stripe Checkout ---------- */
  const CHECKOUT_ENDPOINT = 'https://spellrightpro-api-798456641137.us-central1.run.app/create-checkout-session';

  upgradeBtn.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Please sign in first.');
      return;
    }

    upgradeBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Redirecting…';
    upgradeBtn.disabled = true;

    try {
      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          plan: 'annual',
          promoActive: promoEnd - new Date() > 0
        })
      });

      if (!res.ok) throw new Error('Checkout API error');
      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No URL returned from checkout.');
      }
    } catch (err) {
      alert('Could not start checkout. Please try again or contact support.');
      console.error(err);
      upgradeBtn.innerHTML = '<i class="fa fa-arrow-up-right-from-square"></i> Upgrade Now';
      upgradeBtn.disabled = false;
    }
  });
})();

