// js/config.js
// ------------------------------
// Frontend runtime configuration
// ------------------------------

window.appConfig = {
  // Your backend base URL (no trailing slash)
  apiBaseUrl: "https://spellrightpro-api-798456641137.us-central1.run.app",

  // AdSense client (used only on freemium pages)
  adClient: "ca-pub-7632930282249669",

  // Optional: trial days (server can also enforce)
  trialDays: 0,

  // Where Stripe should send users after checkout
  // (Use https://yourdomain/premium.html?payment_success=1 for success)
  successUrl: "https://yourdomain.com/premium.html?payment_success=1",
  cancelUrl:  "https://yourdomain.com/premium.html"
};

window.stripeConfig = {
  // Publishable key (TEST in dev, LIVE in prod)
  publicKey: "pk_live_51RuKs1El99zwdEZr9wjVF3EhADOk4c9x8JjvjPLH8Y16cCPwykZRFVtC1Fr0hSJesStbqcvfvvNOy4NHRaV0GPvg004IIcPfC8"
};
