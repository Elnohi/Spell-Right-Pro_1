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
    const customerEmail = session.customer_email ||
                          session.customer_details?.email ||
                          session.metadata?.email;
    const firebaseUid   = session.metadata?.firebaseUid;  // we send this from the client
    const planName      = session.metadata?.plan || 'complete';
    const amountPaid    = (session.amount_total || 0) / 100; // Stripe amounts are in cents

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
