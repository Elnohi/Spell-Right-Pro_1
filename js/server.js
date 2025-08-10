require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Stripe = require('stripe');

const app = express();
app.use(cors({ origin: [process.env.FRONTEND_URL], credentials: false }));
app.use(express.json());

// Initialize Firebase Admin (env JSON or application default)
const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccount = serviceJson ? JSON.parse(serviceJson) : null;
admin.initializeApp({
  credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
});

const db = admin.firestore();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to verify Firebase token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create Stripe Checkout Session
app.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const priceId = plan === 'annual'
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/?payment_success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/?payment_cancelled=true`,
      client_reference_id: req.user.uid,
      metadata: { plan, userId: req.user.uid }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook Handler
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
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
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handlers
async function handlePaymentSuccess(session) {
  const userId = session.client_reference_id;
  const plan = session.metadata.plan;
  await db.collection('users').doc(userId).set({
    isPremium: true,
    premiumSince: admin.firestore.FieldValue.serverTimestamp(),
    premiumPlan: plan,
    stripeCustomerId: session.customer
  }, { merge: true });
  console.log(`Premium activated for user: ${userId}`);
}

async function handleSubscriptionRenewal(invoice) {
  const customerId = invoice.customer;
  const userSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (!userSnapshot.empty) {
    const userId = userSnapshot.docs[0].id;
    await db.collection('users').doc(userId).update({
      lastPayment: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function handleSubscriptionCancelled(subscription) {
  const customerId = subscription.customer;
  const userSnapshot = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (!userSnapshot.empty) {
    const userId = userSnapshot.docs[0].id;
    await db.collection('users').doc(userId).update({
      isPremium: false,
      premiumCancelledAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
