'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.disable('x-powered-by');

/* -------------------- Env validation -------------------- */
const REQUIRED = [
  'FRONTEND_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_ANNUAL_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON', // remove if you switch to ADC (admin.initializeApp())
];
const missing = REQUIRED.filter(k => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  // In Cloud Run, throwing will fail the revision (good); logs show what's missing.
  throw new Error('Missing required environment variables');
}

/* -------------------- CORS (Netlify & previews) -------------------- */
const FRONTEND_URL = process.env.FRONTEND_URL.replace(/\/+$/, ''); // no trailing slash
// Allow your main site and Netlify preview domains.
// Example FRONTEND_URL: https://spellrightpro.netlify.app
const allowedHosts = [
  new URL(FRONTEND_URL).host,           // primary
  // Add any custom domains here if you have them:
  // 'app.spellrightpro.com',
];
const isAllowed = (origin) => {
  if (!origin) return true; // curl/postman
  try {
    const { host, protocol } = new URL(origin);
    if (!/^https:$/i.test(protocol)) return false; // force HTTPS
    if (allowedHosts.includes(host)) return true;
    // Netlify previews/branch subdomains:
    if (/\.netlify\.app$/i.test(host)) return true;
    return false;
  } catch {
    return false;
  }
};
app.use(cors({
  origin: (origin, cb) => cb(null, isAllowed(origin)),
  credentials: false, // we don't use cookies
}));
app.options('*', cors());

/* -------------------- Stripe & Firebase -------------------- */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Firebase Admin from ENV JSON (raw or base64)
let serviceAccount;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (e) {
  console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
  throw e;
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* -------------------- Health -------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* -------------------- Stripe Webhook -------------------- */
/* MUST be before express.json() and use raw body */
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleSubscriptionRenewal(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      default:
        // no-op for other events
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- JSON parser for all other routes -------------------- */
app.use(express.json());

/* -------------------- Auth middleware (Bearer idToken) -------------------- */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const idToken = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* -------------------- Create Checkout Session -------------------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const priceId = plan === 'annual'
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // force NO trial even if the price has one
      subscription_data: { trial_period_days: 0 },
      success_url: `${FRONTEND_URL}/premium.html?payment_success=true`,
      cancel_url: `${FRONTEND_URL}/premium.html?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan, userId: req.user.uid },
      // You can localize/collect fields here if needed:
      // customer_update: { address: 'auto' }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- Webhook handlers -------------------- */
async function handlePaymentSuccess(session) {
  const userId = session.client_reference_id;
  const plan = session.metadata?.plan || 'unknown';

  await db.collection('users').doc(userId).set({
    isPremium: true,
    premiumSince: admin.firestore.FieldValue.serverTimestamp(),
    premiumPlan: plan,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription || null,
  }, { merge: true });

  console.log(`Premium activated for user: ${userId} (${plan})`);
}

async function handleSubscriptionRenewal(invoice) {
  const customerId = invoice.customer;
  const userSnap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();

  if (!userSnap.empty) {
    const userId = userSnap.docs[0].id;
    await db.collection('users').doc(userId).set({
      lastPayment: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  const userSnap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();

  if (!userSnap.empty) {
    const userId = userSnap.docs[0].id;
    await db.collection('users').doc(userId).set({
      isPremium: active,
      premiumCancelledAt: active ? admin.firestore.FieldValue.delete() : admin.firestore.FieldValue.serverTimestamp(),
      stripeSubscriptionId: subscription.id
    }, { merge: true });
  }
}

async function handleSubscriptionCancelled(subscription) {
  const customerId = subscription.customer;
  const userSnap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();

  if (!userSnap.empty) {
    const userId = userSnap.docs[0].id;
    await db.collection('users').doc(userId).set({
      isPremium: false,
      premiumCancelledAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

/* -------------------- Start -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Allowed frontend: ${FRONTEND_URL}`);
});
