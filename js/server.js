require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();

/* ---------- CORS: lock to your Netlify domain ---------- */
app.use(cors({
  origin: process.env.FRONTEND_URL, // e.g. https://your-site.netlify.app
  credentials: false
}));

/* ---------- JSON body parser (but NOT for the webhook route) ---------- */
app.use(express.json());

/* ---------- Firebase Admin from ENV JSON ---------- */
let serviceAccount;
try {
  // Allow either raw JSON or base64-encoded JSON
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (e) {
  console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ---------- Stripe ---------- */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/* ---------- Health check ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Create Checkout Session ---------- */
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
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/premium?payment_success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/premium?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan, userId: req.user.uid }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ---------- Stripe Webhook (raw body!) ---------- */
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
        // No-op
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
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
