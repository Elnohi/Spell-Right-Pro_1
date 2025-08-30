'use strict';

require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.disable('x-powered-by');

/* ---------- CORS (strict, dynamic, with preflight) ---------- */
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
if (!FRONTEND_URL) throw new Error('Missing env var FRONTEND_URL');

const extraHosts = (process.env.EXTRA_FRONTEND_HOSTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const primaryHost = new URL(FRONTEND_URL).host;
const allowedHosts = new Set([primaryHost, ...extraHosts]);

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const host = new URL(origin).host;
      if (allowedHosts.has(host) || /\.netlify\.app$/i.test(host)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      }
    } catch {}
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
app.use(corsMiddleware);

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

// Optional path overrides
const SUCCESS_PATH = process.env.SUCCESS_PATH || '/premium.html?payment_success=true';
const CANCEL_PATH  = process.env.CANCEL_PATH  || '/premium.html?payment_cancelled=true';

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
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Stripe webhook (raw body) ---------- */
/**
 * IMPORTANT:
 * - This route must be registered BEFORE express.json()
 * - It verifies Stripe's signature using the raw request body
 * - It always returns 200 after verification to avoid endless retries
 *   (app logic errors are logged instead of surfacing as 500s)
 */
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
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
        console.log('[stripe-webhook] unhandled event:', event.type);
        break;
    }
  } catch (err) {
    // Never 500 back to Stripe; log and acknowledge so retries stop.
    console.error('[stripe-webhook] handler error:', err);
  }

  // Acknowledge receipt no matter what to prevent retries
  return res.status(200).json({ received: true });
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
    const code = (req.query.code || '').trim().toUpperCase();
    if (!code || code.length > 20) {
      return res.status(400).json({
        valid: false,
        reason: 'invalid_format',
        message: 'Please enter a valid promo code'
      });
    }

    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    });

    if (!list.data.length) {
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

    if (coupon?.redeem_by && coupon.redeem_by < Math.floor(Date.now() / 1000)) {
      return res.json({
        valid: false,
        reason: 'expired',
        message: 'This promo code has expired'
      });
    }

    if (promo.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
      return res.json({
        valid: false,
        reason: 'maxed_out',
        message: 'This promo code has reached its maximum redemptions'
      });
    }

    if (coupon && coupon.valid === false) {
      return res.json({
        valid: false,
        reason: 'coupon_invalid',
        message: 'This promo code is no longer valid'
      });
    }

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
