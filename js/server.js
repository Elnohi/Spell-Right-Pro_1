require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();

/* ---------- CORS ---------- */
const FRONTEND = process.env.FRONTEND_URL; // e.g. https://incandescent-kataifi-622903.netlify.app
app.use(cors({
  origin: FRONTEND,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));
app.options('*', cors()); // handle preflight

/* ---------- Stripe & Firebase ---------- */
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin from ENV JSON (raw or base64)
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

/* ---------- Webhook (raw body!) ---------- */
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
        await handleSubscriptionRenewal(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      default:
        // no-op
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- JSON body for normal routes ---------- */
app.use(express.json());

/* ---------- Auth middleware ---------- */
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
  } catch (err) {
    console.error('verifyIdToken failed:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* ---------- Create Checkout Session ---------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan (expected "monthly" or "annual")' });
    }

    const monthlyPrice = process.env.STRIPE_MONTHLY_PRICE_ID;
    const annualPrice  = process.env.STRIPE_ANNUAL_PRICE_ID;

    if (!monthlyPrice || !annualPrice) {
      return res.status(500).json({ error: 'Price IDs not configured on the server' });
    }

    const priceId = plan === 'annual' ? annualPrice : monthlyPrice;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND}/premium?payment_success=true`,
      cancel_url: `${FRONTEND}/premium?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan, userId: req.user.uid }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    // Surface Stripe errors clearly
    const msg = (error && error.raw && error.raw.message) || error.message || 'Unknown error';
    console.error('Checkout error:', msg);
    res.status(500).json({ error: msg });
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
    stripeCustomerId: session.customer
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

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
