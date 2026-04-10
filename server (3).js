const express = require('express');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
require('dotenv').config();

// ── Firebase Admin init (for writing to Firestore from server) ──────────────
// Credentials come from an env variable — never commit the JSON file.
// On Google Cloud Run: set GOOGLE_APPLICATION_CREDENTIALS or use Workload Identity.
// Locally: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
if (!admin.apps.length) {
  try {
    // Prefer explicit JSON credential from env (works everywhere)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'spellrightpro-firebase'
      });
    } else {
      // Fall back to Application Default Credentials (Cloud Run / local ADC)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'spellrightpro-firebase'
      });
    }
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
    console.error('   Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS');
  }
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
const PORT = process.env.PORT || 3801;

// ── Stripe webhook raw body MUST come before express.json() ───────────────
// Stripe sends a raw body and a signature header; if express.json() parses
// it first, the signature check fails with a 400 every time.
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Middleware (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email Configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'spellrightpro@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'sgaxkhlzmytzfnbp'
  }
};

// Create email transporter
let transporter;
try {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('✅ Email service configured for: spellrightpro@gmail.com');
} catch (error) {
  console.log('⚠️  Running in mock email mode');
  transporter = {
    sendMail: async (options) => {
      console.log('📧 Mock email:', options.to, options.subject);
      return { messageId: 'mock-' + Date.now() };
    }
  };
}

// Premium Plans
const premiumPlans = {
  school: {
    name: 'School Premium',
    price: 4.99,
    features: ['Unlimited school words', 'Save 50 custom lists']
  },
  complete: {
    name: 'Complete Premium',
    price: 8.99,
    features: ['All features', 'Unlimited custom word lists']
  },
  family: {
    name: 'Family Plan',
    price: 14.99,
    features: ['Up to 5 users', 'Family dashboard']
  }
};

// ========== API ENDPOINTS ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SpellRightPro Premium API',
    version: '1.0.0',
    email: 'spellrightpro@gmail.com',
    timestamp: new Date().toISOString()
  });
});

// Get all premium plans
app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    plans: premiumPlans,
    currency: 'USD'
  });
});

// Test email configuration
app.get('/api/test-email-config', (req, res) => {
  res.json({
    success: true,
    email: 'spellrightpro@gmail.com',
    status: 'configured',
    mode: emailConfig.auth.pass ? 'REAL' : 'MOCK'
  });
});

// Send welcome email
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { customerEmail, customerName, plan } = req.body;
    
    // Validate input
    if (!customerEmail || !plan) {
      return res.status(400).json({
        success: false,
        message: 'customerEmail and plan are required'
      });
    }
    
    const planDetails = premiumPlans[plan] || premiumPlans.complete;
    
    // Create email
    const mailOptions = {
      from: 'SpellRightPro <spellrightpro@gmail.com>',
      to: customerEmail,
      subject: `🎉 Welcome to SpellRightPro ${planDetails.name}!`,
      html: `
        <h1>Welcome to SpellRightPro Premium!</h1>
        <p>Hello ${customerName || 'Valued Customer'},</p>
        <p>Thank you for choosing <strong>${planDetails.name}</strong>!</p>
        <p><strong>Price:</strong> $${planDetails.price}/month</p>
        <p><strong>Features:</strong></p>
        <ul>
          ${planDetails.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <p>Start learning at: <a href="https://spellrightpro.org">spellrightpro.org</a></p>
        <p>Need help? Email: spellrightpro@gmail.com</p>
      `,
      text: `Welcome to SpellRightPro ${planDetails.name}!\n\nPrice: $${planDetails.price}/month\n\nStart: https://spellrightpro.org\n\nSupport: spellrightpro@gmail.com`
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent to ${customerEmail}`);
    
    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      details: {
        from: 'spellrightpro@gmail.com',
        to: customerEmail,
        plan: planDetails.name,
        emailId: info.messageId
      }
    });
    
  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process payment
app.post('/api/process-payment', async (req, res) => {
  try {
    const { plan, customerEmail, customerName } = req.body;
    
    if (!plan || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'plan and customerEmail are required'
      });
    }
    
    const planDetails = premiumPlans[plan] || premiumPlans.complete;
    const transactionId = `SRP-${Date.now()}`;
    
    // Send welcome email automatically
    try {
      const mailOptions = {
        from: 'SpellRightPro <spellrightpro@gmail.com>',
        to: customerEmail,
        subject: `🎉 Payment Confirmed - ${planDetails.name}`,
        text: `Your payment for ${planDetails.name} ($${planDetails.price}) was successful!\nTransaction ID: ${transactionId}\n\nStart learning now!`
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Payment email sent to ${customerEmail}`);
    } catch (emailError) {
      console.error('⚠️  Payment succeeded but email failed:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        id: transactionId,
        amount: planDetails.price,
        plan: planDetails.name,
        customerEmail,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'SpellRightPro Premium API',
    version: '1.0.0',
    email: 'spellrightpro@gmail.com',
    endpoints: {
      health: 'GET /api/health',
      plans: 'GET /api/plans',
      testEmail: 'GET /api/test-email-config',
      welcomeEmail: 'POST /api/send-welcome-email',
      payment: 'POST /api/process-payment'
    }
  });
});



// ── Create Payment Intent (called from premium.html after Stripe.js tokenises card) ─
// The client never sends raw card numbers — only a PaymentMethod ID from Stripe.js.
// This endpoint creates the charge on Stripe and returns success/requiresAction.
app.post('/api/create-payment', async (req, res) => {
  try {
    const { paymentMethodId, email, plan, planName, amount, currency, firebaseUid } = req.body;

    if (!paymentMethodId || !email || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Create a PaymentIntent and attempt to confirm it immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               amount,         // in cents
      currency:             currency || 'cad',
      payment_method:       paymentMethodId,
      confirmation_method:  'manual',
      confirm:              true,
      receipt_email:        email,
      description:          `SpellRightPro ${planName || plan}`,
      metadata: {
        plan:        plan || 'complete',
        email,
        firebaseUid: firebaseUid || '',
        source:      'spellrightpro_checkout'
      },
      // Return the URL to redirect to after 3DS (not needed for automatic flow but good practice)
      return_url: 'https://spellrightpro.org/thank-you.html'
    });

    // Payment succeeded immediately (no 3D Secure required)
    if (paymentIntent.status === 'succeeded') {
      console.log(`✅ Payment succeeded: ${paymentIntent.id} | ${email} | ${plan}`);
      return res.json({
        success:       true,
        transactionId: paymentIntent.id,
        status:        paymentIntent.status
      });
    }

    // 3D Secure required — send clientSecret back so browser can handle it
    if (paymentIntent.status === 'requires_action' ||
        paymentIntent.status === 'requires_source_action') {
      return res.json({
        success:        false,
        requiresAction: true,
        clientSecret:   paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    }

    // Any other status = failure
    return res.json({
      success:  false,
      message:  `Payment status: ${paymentIntent.status}. Please try again.`
    });

  } catch (err) {
    console.error('❌ create-payment error:', err.message);
    // Stripe errors have a user-safe .message we can forward
    return res.status(400).json({
      success:  false,
      message:  err.message || 'Payment failed. Please check your card details.'
    });
  }
});

// ── Confirm Payment Intent (called after 3D Secure completes) ───────────────
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, firebaseUid, email, plan } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId required' });
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      console.log(`✅ Payment confirmed after 3DS: ${paymentIntentId}`);
      return res.json({ success: true, transactionId: paymentIntentId });
    }

    return res.json({
      success: false,
      message: `Confirmation status: ${paymentIntent.status}`
    });
  } catch (err) {
    console.error('❌ confirm-payment error:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ── Stripe Webhook ──────────────────────────────────────────────────────────
// Stripe calls this URL after every successful payment.
// It verifies the event signature, then writes the user to Firestore.
//
// HOW IT WORKS END-TO-END:
//  1. User completes Stripe Checkout on premium.html
//  2. Stripe charges the card
//  3. Stripe POSTs a signed JSON event to this endpoint
//  4. We verify the signature with STRIPE_WEBHOOK_SECRET
//  5. We write the user to Firestore premiumUsers/{uid}
//  6. Next time user logs into trainer.html, checkPremiumStatus() finds the doc
//
// REQUIRED ENV VARS (add to Cloud Run and local .env):
//   STRIPE_SECRET_KEY      — from Stripe Dashboard → Developers → API keys (secret key)
//   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Developers → Webhooks → signing secret

app.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  // ── 1. Verify Stripe signature ───────────────────────────────────────────
  // req.body is a raw Buffer here (thanks to the express.raw middleware above)
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('✅ Stripe webhook verified:', event.type);
  } catch (err) {
    console.error('❌ Stripe webhook signature failed:', err.message);
    // Must return 400 so Stripe knows to retry
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // ── 2. Handle the event ──────────────────────────────────────────────────
  // We only care about successful payments. Other event types are acknowledged
  // with 200 but otherwise ignored (Stripe expects a fast 200 response).

  if (event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded') {

    const session = event.data.object;

    // Extract metadata we embed when creating the Checkout Session on the client.
    // If using Payment Intents directly, adjust these field names.
    // Extract metadata — Hosted Checkout puts it on session.metadata
    // Subscription events put it on subscription_data.metadata
    const customerEmail = session.customer_email ||
                          session.customer_details?.email ||
                          session.metadata?.email;
    const firebaseUid   = session.metadata?.firebaseUid ||
                          session.subscription_data?.metadata?.firebaseUid || '';
    const planName      = session.metadata?.plan ||
                          session.subscription_data?.metadata?.plan || 'complete';
    // amount_total is in cents for checkout.session.completed
    const amountPaid    = session.amount_total
                          ? session.amount_total / 100
                          : session.amount_subtotal
                          ? session.amount_subtotal / 100
                          : 0;

    console.log(`💳 Payment confirmed: ${customerEmail} | plan: ${planName} | £${amountPaid}`);

    // ── 3. Write premium status to Firestore ─────────────────────────────
    if (db && (firebaseUid || customerEmail)) {
      try {
        // Calculate expiry date (30 days from now — adjust for annual plans)
        const isAnnual = planName.toLowerCase().includes('annual');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (isAnnual ? 365 : 30));

        const premiumData = {
          email:       customerEmail,
          plan:        planName,
          active:      true,
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiryDate:  admin.firestore.Timestamp.fromDate(expiryDate),
          amountPaid,
          stripeSessionId: session.id,
          source: 'stripe_webhook'
        };

        if (firebaseUid) {
          // Best path: we have the UID, write directly
          await db.collection('premiumUsers').doc(firebaseUid).set(premiumData, { merge: true });
          console.log(`✅ Firestore: premium set for UID ${firebaseUid}`);
        }

        if (customerEmail) {
          // Also store by email as a lookup index (some users may not be logged in)
          const safeEmail = customerEmail.replace(/[.#$[\]/]/g, '_');
          await db.collection('premiumByEmail').doc(safeEmail).set({
            ...premiumData,
            firebaseUid: firebaseUid || null
          }, { merge: true });
          console.log(`✅ Firestore: premium indexed for email ${customerEmail}`);
        }

      } catch (fsErr) {
        console.error('❌ Firestore write failed:', fsErr.message);
        // Still return 200 so Stripe doesn't retry — log for manual follow-up
      }
    }

    // ── 4. Send confirmation email ────────────────────────────────────────
    if (customerEmail && transporter) {
      const planLabels = {
        school:   'School Premium ($4.99/mo)',
        complete: 'Complete Premium ($8.99/mo)',
        family:   'Family Plan ($14.99/mo)',
        annual:   'Complete Premium Annual ($89.99/yr)',
      };
      const planLabel = planLabels[planName] || planName;

      const expiryStr = new Date(Date.now() + (planName.includes('annual') ? 365 : 30) * 86400000)
        .toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

      const mailOptions = {
        from:    'SpellRightPro <spellrightpro@gmail.com>',
        to:      customerEmail,
        subject: '🎉 Your SpellRightPro Premium is now active!',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:30px;">
            <img src="https://spellrightpro.org/assets/logo.png"
                 alt="SpellRightPro" style="height:60px;margin-bottom:20px;" />
            <h1 style="color:#7b2ff7;margin:0 0 10px;">Welcome to Premium!</h1>
            <p style="color:#444;font-size:1rem;line-height:1.6;">
              Your payment was successful and your premium access is now active.
            </p>
            <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:0;"><strong>Plan:</strong> ${planLabel}</p>
              <p style="margin:8px 0;"><strong>Amount paid:</strong> CAD $${amountPaid.toFixed(2)}</p>
              <p style="margin:0;"><strong>Active until:</strong> ${expiryStr}</p>
            </div>
            <a href="https://spellrightpro.org/trainer"
               style="display:inline-block;background:#7b2ff7;color:#fff;text-decoration:none;
                      padding:14px 28px;border-radius:10px;font-weight:700;margin:10px 0;">
              Start Practising Now →
            </a>
            <p style="color:#888;font-size:0.85rem;margin-top:30px;">
              Questions? Reply to this email or visit
              <a href="https://spellrightpro.org/contact">spellrightpro.org/contact</a>
            </p>
          </div>`,
        text: `Welcome to SpellRightPro Premium!\n\nPlan: ${planLabel}\nActive until: ${expiryStr}\n\nStart now: https://spellrightpro.org/trainer\n\nQuestions? spellrightpro@gmail.com`
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Confirmation email sent to ${customerEmail}`);
      } catch (mailErr) {
        console.error('❌ Confirmation email failed:', mailErr.message);
      }
    }
  }

  // ── 5. Always return 200 quickly ─────────────────────────────────────────
  // Stripe retries if it doesn't get a 2xx within 30 seconds.
  res.json({ received: true });
});


// ── Send Order Confirmation Email ────────────────────────────────────────────
// Called from premium.html when a user submits the checkout form.
// Sends them a confirmation email and notifies spellrightpro@gmail.com.
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { email, customerName, plan, planName, amount } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const displayName = customerName || email.split('@')[0];
    const displayPlan = planName || plan || 'Premium';
    const displayAmt  = parseFloat(amount || 0).toFixed(2);

    // ── Email to the customer ─────────────────────────────────────────────
    const customerMail = {
      from:    'SpellRightPro <spellrightpro@gmail.com>',
      to:      email,
      subject: `✅ Your SpellRightPro ${displayPlan} order received`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:30px;">
          <h1 style="color:#7b2ff7;margin:0 0 10px;">Order Received!</h1>
          <p>Hi ${displayName},</p>
          <p>Thank you for choosing <strong>SpellRightPro ${displayPlan}</strong>.</p>
          <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0;"><strong>Plan:</strong> ${displayPlan}</p>
            <p style="margin:8px 0 0;"><strong>Amount:</strong> CAD $${displayAmt}/month</p>
          </div>
          <p>We will process your payment and send your access link to this email address within a few hours.</p>
          <p>To start practising now with the free version while you wait:</p>
          <a href="https://spellrightpro.org" 
             style="display:inline-block;background:#7b2ff7;color:#fff;
                    text-decoration:none;padding:12px 24px;border-radius:10px;
                    font-weight:700;margin:10px 0;">
            Visit SpellRightPro →
          </a>
          <p style="color:#888;font-size:0.85rem;margin-top:24px;">
            Questions? Reply to this email or visit
            <a href="https://spellrightpro.org/contact">our contact page</a>.
          </p>
        </div>`,
      text: `Hi ${displayName},\n\nThank you for choosing SpellRightPro ${displayPlan} (CAD $${displayAmt}/month).\n\nWe will send your access link to this email shortly.\n\nQuestions? spellrightpro@gmail.com`
    };

    // ── Notification to owner ─────────────────────────────────────────────
    const ownerMail = {
      from:    'SpellRightPro <spellrightpro@gmail.com>',
      to:      'spellrightpro@gmail.com',
      subject: `🛒 New order: ${displayPlan} — ${email}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>New Premium Order</h2>
          <p><strong>Customer:</strong> ${displayName} (${email})</p>
          <p><strong>Plan:</strong> ${displayPlan}</p>
          <p><strong>Amount:</strong> CAD $${displayAmt}/month</p>
          <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
          <hr/>
          <p>Action required: process payment and activate premium access for this user.</p>
        </div>`,
      text: `New order\nCustomer: ${email}\nPlan: ${displayPlan}\nAmount: CAD $${displayAmt}/month\nTime: ${new Date().toUTCString()}`
    };

    // Send both emails (don't fail if owner email fails)
    const customerResult = await transporter.sendMail(customerMail);
    console.log(`✅ Confirmation sent to ${email}`);

    try {
      await transporter.sendMail(ownerMail);
      console.log('✅ Owner notification sent');
    } catch (ownerErr) {
      console.warn('⚠️  Owner notification failed:', ownerErr.message);
    }

    res.json({
      success:   true,
      message:   'Confirmation email sent',
      messageId: customerResult.messageId
    });

  } catch (err) {
    console.error('❌ send-confirmation error:', err.message);
    // Still return success — the order is noted in logs even if email fails
    res.json({
      success: true,
      message: 'Order received (email delivery pending)',
      error:   process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});



// ── Verify Stripe Checkout Session ───────────────────────────────────────────
// Called by thank-you.html immediately after redirect.
// Confirms the session was paid and returns email + plan.
// This gives the user instant access even before the webhook fires.
app.get('/api/verify-session', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ paid: false, message: 'session_id required' });
    }

    // Retrieve session from Stripe — this is a real server-side check
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid  = session.payment_status === 'paid';
    const email = session.customer_email ||
                  session.customer_details?.email || '';
    const plan  = session.metadata?.plan || 'complete';

    console.log(`🔍 Session verify: ${sessionId} | paid=${paid} | ${email}`);

    // If paid and we have a firebaseUid in metadata, write to Firestore immediately
    // (don't wait for webhook — this gives instant access)
    if (paid && db) {
      const firebaseUid = session.metadata?.firebaseUid || '';
      const safeEmail   = email.replace(/[.#$[\]/]/g, '_');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const premiumData = {
        email,
        plan,
        active:          true,
        activatedAt:     admin.firestore.FieldValue.serverTimestamp(),
        expiryDate:      admin.firestore.Timestamp.fromDate(expiryDate),
        stripeSessionId: sessionId,
        source:          'verify_session'
      };

      // Write by UID if available
      if (firebaseUid) {
        await db.collection('premiumUsers').doc(firebaseUid)
          .set(premiumData, { merge: true });
        console.log(`✅ verify-session: Firestore written for UID ${firebaseUid}`);
      }

      // Always write by email (the trainer checks this as fallback)
      if (safeEmail) {
        await db.collection('premiumByEmail').doc(safeEmail)
          .set({ ...premiumData, firebaseUid: firebaseUid || null }, { merge: true });
        console.log(`✅ verify-session: Firestore written for email ${email}`);
      }
    }

    res.json({
      paid,
      email,
      plan,
      sessionId
    });

  } catch (err) {
    console.error('❌ verify-session error:', err.message);
    res.status(500).json({ paid: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRIPE HOSTED CHECKOUT  
// Creates a Stripe Checkout Session and returns the redirect URL.
// The browser redirects the user to Stripe's own HTTPS payment page.
// Card data never touches your server — 100% PCI compliant.
//
// REQUIRED ENV VARS:
//   STRIPE_SECRET_KEY       — sk_live_... (or sk_test_... for testing)
//   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe Dashboard → Webhooks)
// ═══════════════════════════════════════════════════════════════════════════════

// Price IDs — create these once in your Stripe Dashboard:
//   Dashboard → Products → Add product → Add price (recurring, monthly)
//   Then paste the price ID (price_...) here.
//   Until you create them, the server falls back to inline price_data.
const STRIPE_PRICE_IDS = {
  school:   process.env.STRIPE_PRICE_SCHOOL   || null,  // e.g. 'price_1AbcXYZ...'
  complete: process.env.STRIPE_PRICE_COMPLETE || null,  // e.g. 'price_1DefABC...'
  family:   process.env.STRIPE_PRICE_FAMILY   || null,  // e.g. 'price_1GhiDEF...'
};

const PLAN_DETAILS = {
  school:   { name: 'SpellRightPro School Premium',   amount: 499,  currency: 'cad' },
  complete: { name: 'SpellRightPro Complete Premium', amount: 899,  currency: 'cad' },
  family:   { name: 'SpellRightPro Family Plan',      amount: 1499, currency: 'cad' },
};

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plan, email, firebaseUid } = req.body;

    // Validate
    if (!plan || !PLAN_DETAILS[plan]) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan: "${plan}". Valid options: school, complete, family`
      });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const planInfo = PLAN_DETAILS[plan];
    const origin   = process.env.SITE_URL || 'https://spellrightpro.org';

    // Build line_items — use Stripe Price ID if available, otherwise inline price_data
    let lineItems;
    if (STRIPE_PRICE_IDS[plan]) {
      lineItems = [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }];
    } else {
      lineItems = [{
        price_data: {
          currency:    planInfo.currency,
          unit_amount: planInfo.amount,          // in cents (499 = CAD $4.99)
          recurring:   { interval: 'month' },
          product_data: {
            name:        planInfo.name,
            description: 'Monthly subscription — cancel anytime',
          }
        },
        quantity: 1
      }];
    }

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode:               'subscription',         // recurring monthly billing
      payment_method_types: ['card'],
      customer_email:     email,
      line_items:         lineItems,
      
      // Pass data through so the webhook can read it
      metadata: {
        plan,
        email,
        firebaseUid: firebaseUid || '',
        source: 'spellrightpro_checkout'
      },
      subscription_data: {
        metadata: {
          plan,
          email,
          firebaseUid: firebaseUid || ''
        }
      },

      // Where Stripe sends the user after payment
      success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `${origin}/premium.html?cancelled=1`,

      // Pre-fill email on the Stripe checkout page
      allow_promotion_codes: true,
    });

    console.log(`✅ Checkout session created: ${session.id} | ${email} | ${plan}`);

    res.json({
      success:    true,
      sessionId:  session.id,
      sessionUrl: session.url       // redirect the browser here
    });

  } catch (err) {
    console.error('❌ create-checkout-session error:', err.message);
    res.status(500).json({
      success:  false,
      message:  err.message || 'Could not create checkout session'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/plans',
      'GET /api/test-email-config',
      'POST /api/send-welcome-email',
      'POST /api/process-payment'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server - ONLY ONCE!
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║             SPELLRIGHT PRO PREMIUM SERVER           ║
║                                                      ║
║     🚀  Server: http://localhost:${PORT}           ║
║     📧  Email:  spellrightpro@gmail.com            ║
║     ⏰  Time:   ${new Date().toLocaleTimeString()}  ║
╚══════════════════════════════════════════════════════╝
  
📋 Available endpoints:
   • GET  /                      - Server info
   • GET  /api/health           - Health check
   • GET  /api/plans            - Premium plans
   • GET  /api/test-email-config- Test email system
   • POST /api/send-welcome-email - Send welcome email
   • POST /api/process-payment  - Process payment
   • POST /api/stripe-webhook   - Stripe payment confirmation (called by Stripe)
  
🔧 Email status: ${emailConfig.auth.pass ? '✅ REAL' : '⚠️  MOCK'}
  `);
});
