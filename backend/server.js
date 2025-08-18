'use strict';

require('dotenv').config();
const express = require('express');
// const cors = require('cors'); // not needed with custom CORS below
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.disable('x-powered-by');

/* ---------- Env validation (do this BEFORE using values) ---------- */
const REQUIRED = [
  'FRONTEND_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_ANNUAL_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
];
{
  const missing = REQUIRED.filter(k => !process.env[k] || !String(process.env[k]).trim());
  if (missing.length) {
    // Crash early with a clear message instead of throwing deep in CORS
    console.error('Missing env vars:', missing.join(', '));
    process.exit(1);
  }
}

/* ---------- CORS (defensive, preflight-safe) ---------- */
const RAW_FRONTEND = (process.env.FRONTEND_URL || '').trim();
let FRONTEND_ORIGIN = RAW_FRONTEND.replace(/\/+$/, ''); // remove trailing slashes

let allowedHosts = [];
try {
  allowedHosts = [ new URL(FRONTEND_ORIGIN).host ];
} catch (e) {
  console.error('Bad FRONTEND_URL:', RAW_FRONTEND, e.message);
  allowedHosts = []; // continue; preflight will 403 until fixed
}

const extraHosts = ['localhost:5173','localhost:3000']; // optional dev

function isOriginAllowed(origin) {
  if (!origin) return true; // same-origin or non-browser
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    if (allowedHosts.includes(u.host)) return true;
    if (/\.netlify\.app$/i.test(u.host)) return true;
    if (extraHosts.includes(u.host)) return true;
    return false;
  } catch { return false; }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin);

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Authorization, Content-Type'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(allowed ? 204 : 403);
  }
  next();
});

/* ---------- Stripe & Firebase ---------- */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

let serviceAccount;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (e) {
  console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ---------- Health ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Stripe webhook (must use raw body) ---------- */
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- JSON parser for normal routes (AFTER webhook) ---------- */
app.use(express.json());

/* ---------- Auth (Firebase ID token) ---------- */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const idToken = authHeader.split(' ')[1];
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* ---------- Create Checkout Session ---------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan, priceId: clientPriceId } = req.body;

    let priceId = null;
    if (typeof clientPriceId === 'string' && /^price_/.test(clientPriceId)) {
      priceId = clientPriceId;
    } else if (plan === 'annual') {
      priceId = process.env.STRIPE_ANNUAL_PRICE_ID;
    } else if (plan === 'monthly') {
      priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    } else {
      return res.status(400).json({ error: 'Invalid plan/price' });
    }

    // Optional sanity check
    await stripe.prices.retrieve(priceId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 0 },

      // 👇 Add this line (shows “Add promotion code” on Checkout)
      allow_promotion_codes: true,

      success_url: `${FRONTEND_URL}/premium?payment_success=true`,
      cancel_url: `${FRONTEND_URL}/premium?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan: plan || 'unknown', userId: req.user.uid }
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    const mode = (process.env.STRIPE_SECRET_KEY || '').includes('_test_') ? 'TEST' : 'LIVE';
    console.error('Checkout error:', error.message, `(API mode: ${mode})`);
    return res.status(400).json({ error: `${error.message} (API mode: ${mode})` });
  }
});

/* ---------- Handlers ---------- */
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
  const snap = await db.collection('users').where('stripeCustomerId','==',customerId).limit(1).get();
  if (!snap.empty) {
    const userId = snap.docs[0].id;
    await db.collection('users').doc(userId).set({
      lastPayment: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}
async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  const snap = await db.collection('users').where('stripeCustomerId','==',customerId).limit(1).get();
  if (!snap.empty) {
    const userId = snap.docs[0].id;
    await db.collection('users').doc(userId).set({
      isPremium: active,
      premiumCancelledAt: active ? admin.firestore.FieldValue.delete() : admin.firestore.FieldValue.serverTimestamp(),
      stripeSubscriptionId: subscription.id
    }, { merge: true });
  }
}
async function handleSubscriptionCancelled(subscription) {
  const customerId = subscription.customer;
  const snap = await db.collection('users').where('stripeCustomerId','==',customerId).limit(1).get();
  if (!snap.empty) {
    const userId = snap.docs[0].id;
    await db.collection('users').doc(userId).set({
      isPremium: false,
      premiumCancelledAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Allowed frontend origin: ${FRONTEND_ORIGIN}`);
});
