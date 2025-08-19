'use strict';

require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.disable('x-powered-by');

/* ---------- CORS (strict, with proper preflight) ---------- */
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
if (!FRONTEND_URL) throw new Error('Missing env var FRONTEND_URL');

const allowedHosts = [new URL(FRONTEND_URL).host];
const extraHosts = ['localhost:5173', 'localhost:3000']; // dev allowance

function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser or same-origin
  try {
    const u = new URL(origin);
    if (!/^https?:$/i.test(u.protocol)) return false;
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

  if (req.method === 'OPTIONS') {
    return res.sendStatus(allowed ? 204 : 403);
  }
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
if (missing.length) {
  throw new Error(`Missing env vars: ${missing.join(', ')}`);
}

/* ---------- Stripe & Firebase ---------- */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

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

/* ---------- Utilities ---------- */
function slimPrice(p) {
  return {
    id: p.id,
    currency: p.currency,
    unit_amount: p.unit_amount,
    recurring_interval: p.recurring?.interval || null,
    product: p.product,
    active: p.active,
    nickname: p.nickname || null,
  };
}

/* ---------- Health ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Stripe webhook (raw body) ---------- */
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

/* ---------- Prices (public) ---------- */
app.get('/prices', async (_req, res) => {
  try {
    const [m, a] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID),
      stripe.prices.retrieve(process.env.STRIPE_ANNUAL_PRICE_ID),
    ]);
    res.json({ monthly: slimPrice(m), annual: slimPrice(a) });
  } catch (e) {
    console.error('prices error:', e);
    res.status(500).json({ error: 'prices_failed', message: e.message });
  }
});

/* ---------- Validate promo (public) ---------- */
async function validatePromoHandler(req, res) {
  try {
    const code = (req.query.code || '').trim().toUpperCase(); // Normalize case
    if (!code || code.length > 20) {
      return res.status(400).json({ 
        valid: false, 
        reason: 'invalid_format', 
        message: 'Please enter a valid promo code' 
      });
    }

    console.log('Validating promo:', code, 'for origin:', req.headers.origin);

    // Check active codes first
    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    });

    if (!list.data.length) {
      // Check if code exists but is inactive
      const inactiveList = await stripe.promotionCodes.list({
        code,
        active: false,
        limit: 1,
      });
      
      if (inactiveList.data.length) {
        return res.json({ 
          valid: false, 
          reason: 'code_inactive',
          message: 'This promo code is no longer active'
        });
      }
      return res.json({ 
        valid: false, 
        reason: 'not_found',
        message: 'Promo code not found'
      });
    }

    const promo = list.data[0];
    const coupon = promo.coupon;

    // Check expiration
    if (coupon?.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return res.json({ 
        valid: false, 
        reason: 'expired',
        message: 'This promo code has expired'
      });
    }

    // Check max redemptions
    if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
      return res.json({ 
        valid: false, 
        reason: 'maxed_out',
        message: 'This promo code has reached its maximum redemptions'
      });
    }

    // Check coupon validity
    if (coupon && coupon.valid === false) {
      return res.json({ 
        valid: false, 
        reason: 'coupon_invalid',
        message: 'This promo code is no longer valid'
      });
    }

    console.log('Promo code valid:', code, 'Discount:', coupon?.percent_off || coupon?.amount_off);

    return res.json({
      valid: true,
      promotion_code_id: promo.id,
      coupon_id: coupon?.id ?? null,
      percent_off: coupon?.percent_off ?? null,
      amount_off: coupon?.amount_off ?? null,
      currency: coupon?.currency ?? null,
      message: 'Promo code applied successfully'
    });
  } catch (e) {
    console.error('validate-promo error:', e.type || 'Unknown', e.code || 'No code', e.message);
    res.status(500).json({ 
      valid: false, 
      reason: 'server_error', 
      message: 'Error validating promo code' 
    });
  }
}

// Mount on a few common paths to avoid 404s from earlier links
app.get(['/validate-promo', '/promo/validate', '/api/validate-promo', '/api/promo/validate'], validatePromoHandler);

/* ---------- Create Checkout Session (auth required) ---------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan, priceId: clientPriceId, promoCode } = req.body;

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

    // Sanity check price exists for this key's mode (TEST/LIVE)
    await stripe.prices.retrieve(priceId);

    // Optional: apply a promotion code if one was validated client-side
    let discounts;
    if (promoCode && typeof promoCode === 'string') {
      try {
        const pcs = await stripe.promotionCodes.list({ 
          code: promoCode.trim(), 
          active: true, 
          limit: 1 
        });
        if (pcs.data[0]) discounts = [{ promotion_code: pcs.data[0].id }];
      } catch (e) {
        console.warn('Promo code supplied but not usable:', promoCode, e.message);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts, // may be undefined
      // also allow entering codes directly on the Stripe page
      allow_promotion_codes: true,

      subscription_data: { trial_period_days: 0 },
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

/* ---------- Webhook handlers ---------- */
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
  const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
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
  const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
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
  const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
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
