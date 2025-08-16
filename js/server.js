require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();

/* ---------- CORS ---------- */
const FRONTEND = process.env.FRONTEND_URL; // e.g. https://incandescent-kataifi-622903.netlify.app
if (!FRONTEND) {
  console.error('Error: FRONTEND_URL not set in environment.');
  process.exit(1);
}

app.use(cors({
  origin: FRONTEND,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.options('*', cors());

/* ---------- Stripe Setup ---------- */
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY not set in environment.');
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

/* ---------- Firebase Setup ---------- */
let serviceAccount;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set in environment.');
  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (e) {
  console.error('Error loading FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
  process.exit(1);
}

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('Firebase Admin initialization failed:', e.message);
  process.exit(1);
}

const db = admin.firestore();

/* ---------- Health ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------- Stripe Webhook (raw body required) ---------- */
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpointSecret) {
  console.error('Error: STRIPE_WEBHOOK_SECRET not set in environment.');
  process.exit(1);
}

// ⚠️ IMPORTANT: place this route BEFORE any app.use(express.json()) calls!
// Other routes can use express.json(), but Stripe needs raw body for signature verification
app.post(
  '/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      console.error('❌ Missing Stripe-Signature header');
      return res.status(400).send('Missing Stripe-Signature header');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handlePaymentSuccess(event.data.object);
          break;

        case 'invoice.paid':
        case 'invoice.payment_succeeded': // include alternate naming
          await handleSubscriptionRenewal(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object);
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      // Log any unexpected handler error but still acknowledge to Stripe
      console.error(`❌ Error processing event ${event.type}:`, err);
    }

    // Always respond 200 so Stripe doesn't keep retrying
    res.json({ received: true });
  }
);

app.use(express.json());

/* ---------- Auth Middleware ---------- */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('verifyIdToken failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ---------- Create Checkout Session ---------- */
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { priceId, plan, userId, sessionId } = req.body || {};

    // Basic input validation
    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' });
    }
    if (!userId || userId !== req.user.uid) {
      return res.status(403).json({ error: 'User ID missing or does not match token' });
    }

    console.log(`Creating checkout session for ${userId} [plan: ${plan}, session: ${sessionId}]`);

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND}/premium?payment_success=true`,
      cancel_url: `${FRONTEND}/premium?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: {
        plan: plan || 'unknown',
        userId,
        sessionId: sessionId || ''
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout creation error:', error);

    if (error && error.raw && error.raw.message) {
      return res.status(error.statusCode || 400).json({ error: error.raw.message });
    }

    res.status(500).json({
      error: 'Unable to create checkout session. Please try again later.'
    });
  }
});

/* ---------- Handlers ---------- */
async function handlePaymentSuccess(session) {
  try {
    const userId = session.client_reference_id;
    if (!userId) {
      console.error('PaymentSuccess: Missing client_reference_id in session');
      return;
    }
    const plan = session.metadata?.plan || 'unknown';

    await db.collection('users').doc(userId).set({
      isPremium: true,
      premiumSince: admin.firestore.FieldValue.serverTimestamp(),
      premiumPlan: plan,
      stripeCustomerId: session.customer || null
    }, { merge: true });

    console.log(`✅ Premium activated for user: ${userId} (${plan})`);
  } catch (err) {
    console.error('❌ Error in handlePaymentSuccess:', err);
  }
}

async function handleSubscriptionRenewal(invoice) {
  try {
    const customerId = invoice.customer;
    if (!customerId) {
      console.error('SubscriptionRenewal: Missing customer ID in invoice');
      return;
    }

    const userSnap = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userSnap.empty) {
      console.warn(`SubscriptionRenewal: No user found for customer ${customerId}`);
      return;
    }

    const userId = userSnap.docs[0].id;
    await db.collection('users').doc(userId).set({
      lastPayment: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`🔄 Subscription renewed for user: ${userId}`);
  } catch (err) {
    console.error('❌ Error in handleSubscriptionRenewal:', err);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    const customerId = subscription.customer;
    if (!customerId) {
      console.error('SubscriptionCancelled: Missing customer ID in subscription');
      return;
    }

    const userSnap = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (userSnap.empty) {
      console.warn(`SubscriptionCancelled: No user found for customer ${customerId}`);
      return;
    }

    const userId = userSnap.docs[0].id;
    await db.collection('users').doc(userId).set({
      isPremium: false,
      premiumCancelledAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`🚫 Premium cancelled for user: ${userId}`);
  } catch (err) {
    console.error('❌ Error in handleSubscriptionCancelled:', err);
  }
}

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
