'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.disable('x-powered-by');

/* ---------- CORS (strict, with proper preflight) ---------- */
const FRONTEND_URL = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const allowedHosts = [];
try { if (FRONTEND_URL) allowedHosts.push(new URL(FRONTEND_URL).host); } catch {}

const extraHosts = ['localhost:5173','localhost:3000']; // dev

function isOriginAllowed(origin) {
  if (!origin) return true; // curl / same-origin
  try {
    const u = new URL(origin);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (allowedHosts.includes(u.host)) return true;
    if (/\.netlify\.app$/i.test(u.host)) return true;
    if (extraHosts.includes(u.host)) return true;
    return false;
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin);

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    const reqHdrs = req.headers['access-control-request-headers'];
    res.setHeader('Access-Control-Allow-Headers', reqHdrs || 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(allowed ? 204 : 403);
  return next();
});

/* ---------- Env validation ---------- */
const REQUIRED = [
  'FRONTEND_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_MONTHLY_PRICE_ID',
  'STRIPE_ANNUAL_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
];
const missing = REQUIRED.filter(k => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);

/* ---------- Stripe & Firebase ---------- */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Firebase Service Account (JSON or base64)
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

/* ---------- Health ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Webhook (raw body) ---------- */
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
        await handlePaymentSuccess(event.data.object); break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleSubscriptionRenewal(event.data.object); break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object); break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object); break;
      default: break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- JSON for other routes ---------- */
app.use(express.json());

// --- validate promo code (public) ---
app.get('/validate-promo', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const list = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const pc = list.data[0];
    if (!pc) return res.status(404).json({ valid: false });

    const c = pc.coupon;
    res.json({
      valid: true,
      code: pc.code,
      percent_off: c.percent_off || null,
      amount_off: c.amount_off || null,
      currency: c.currency || null,
      duration: c.duration,              // once | repeating | forever
      duration_in_months: c.duration_in_months || null,
    });
  } catch (e) {
    console.error('validate-promo error:', e);
    res.status(500).json({ error: 'Unable to validate promo' });
  }
});

/* ---------- Auth (Firebase ID token) ---------- */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const idToken = authHeader.split(' ')[1];
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* ---------- Tiny in-memory cache for /prices ---------- */
let pricesCache = null;
let pricesCacheAt = 0;
const PRICES_TTL_MS = 10 * 60 * 1000;

/* ---------- GET /prices  (for displaying amounts on the page) ---------- */
app.get('/prices', async (_req, res) => {
  try {
    const now = Date.now();
    if (pricesCache && now - pricesCacheAt < PRICES_TTL_MS) {
      return res.json(pricesCache);
    }

    const [m, a] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_ANNUAL_PRICE_ID),
    ]);

    const payload = {
      monthly: {
        id: m.id,
        unit_amount: m.unit_amount,
        currency: m.currency,
        interval: m.recurring?.interval || null,
      },
      annual: {
        id: a.id,
        unit_amount: a.unit_amount,
        currency: a.currency,
        interval: a.recurring?.interval || null,
      }
    };
    pricesCache = payload;
    pricesCacheAt = now;
    res.json(payload);
  } catch (e) {
    console.error('Error fetching Stripe prices:', e);
    res.status(500).json({ error: 'Unable to fetch prices' });
  }
});

/* ---------- Create Checkout Session (supports promo codes) ---------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const {
      plan,                 // "monthly" | "annual"
      priceId: clientPriceId,
      promoCode,            // optional string like "FRIENDS20"
      allowPromotionCodes,  // optional boolean
    } = req.body || {};

    // Choose price ID (client override or env)
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

    // ✅ Sanity check: ensure the price exists in THIS key’s mode (TEST vs LIVE)
    await stripe.prices.retrieve(priceId);

    const params = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 0 },
      success_url: `${FRONTEND_URL}/premium?payment_success=true`,
      cancel_url: `${FRONTEND_URL}/premium?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan: plan || 'unknown', userId: req.user.uid }
    };

        // ✅ Always show the "Add promotion code" input in Stripe Checkout
    allow_promotion_codes: true,
  };

    // Allow user-entered promotion code, if provided
    if (promoCode && String(promoCode).trim()) {
      const list = await stripe.promotionCodes.list({
        code: String(promoCode).trim(),
        active: true,
        limit: 1
      });
      if (!list.data[0]) {
        return res.status(400).json({ error: 'Invalid or inactive promo code.' });
      }
      params.discounts = [{ promotion_code: list.data[0].id }];
    } else if (allowPromotionCodes === true) {
      // Or allow users to enter a code at Checkout
      params.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(params);

    // Prefer returning the URL (more robust with strict CSP)
    return res.json({ id: session.id, url: session.url, sessionId: session.id });
  } catch (error) {
    const mode = (process.env.STRIPE_SECRET_KEY || '').includes('_test_') ? 'TEST' : 'LIVE';
    console.error('Checkout error:', error.message, `(API mode: ${mode})`);
    return res.status(400).json({ error: `${error.message} (API mode: ${mode})` });
  }
});

/* ---------- Handlers (Firestore) ---------- */
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
  console.log(`Allowed frontend: ${FRONTEND_URL}`);
});
