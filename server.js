const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://www.spellrightpro.org",
    "https://spellrightpro.org"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "stripe-signature"]
}));
app.options("*", cors());

// ── Stripe webhook MUST get raw body before express.json() parses it ─────────
app.use("/api/stripe-webhook", express.raw({ type: "application/json" }));

// ── General middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Stripe ────────────────────────────────────────────────────────────────────
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe initialized");
} catch (err) {
  console.error("❌ Stripe init error:", err.message);
}

// ── Firebase Admin ────────────────────────────────────────────────────────────
let admin, db;
try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(sa), projectId: "spellrightpro-firebase" });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: "spellrightpro-firebase" });
    }
  }
  db = admin.firestore();
  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.error("❌ Firebase Admin error:", err.message);
}

// ── Email ─────────────────────────────────────────────────────────────────────
let transporter;
try {
  if (!process.env.EMAIL_PASSWORD) throw new Error("EMAIL_PASSWORD not set");
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: "spellrightpro@gmail.com", pass: process.env.EMAIL_PASSWORD }
  });
  console.log("✅ Email configured");
} catch (err) {
  console.error("❌ Email config error:", err.message);
}

// ── Plan config ───────────────────────────────────────────────────────────────
const PLANS = {
  // Three plans: Monthly $5 · 6-month $26 · Annual $45 CAD (all modules included in all)
  monthly:  { name: "SpellRightPro Premium — Monthly",  amount: 500,  interval: "month", intervalCount: 1, priceId: process.env.STRIPE_PRICE_MONTHLY  || null },
  sixmonth: { name: "SpellRightPro Premium — 6 months", amount: 2600, interval: "month", intervalCount: 6, priceId: process.env.STRIPE_PRICE_SIXMONTH || null },
  annual:   { name: "SpellRightPro Premium — Annual",   amount: 4500, interval: "year",  intervalCount: 1, priceId: process.env.STRIPE_PRICE_ANNUAL   || null },
  // legacy keys — map old plan names to monthly for backward compatibility
  school:   { name: "SpellRightPro Premium — Monthly", amount: 500, interval: "month", intervalCount: 1, priceId: process.env.STRIPE_PRICE_MONTHLY || null },
  complete: { name: "SpellRightPro Premium — Monthly", amount: 500, interval: "month", intervalCount: 1, priceId: process.env.STRIPE_PRICE_MONTHLY || null },
  family:   { name: "SpellRightPro Premium — Monthly", amount: 500, interval: "month", intervalCount: 1, priceId: process.env.STRIPE_PRICE_MONTHLY || null },
};

const SITE = process.env.SITE_URL || "https://spellrightpro.org";


// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL HELPERS — Customer receipt & Admin notification
// Used by both the Stripe webhook and the manual send-confirmation fallback
// ═══════════════════════════════════════════════════════════════════════════════

async function sendCustomerReceipt({ email, customerName, plan, planLabel, amount, paymentDate, expiryStr, billingNote, txnId }) {
  if (!transporter) return;
  const SITE_URL = process.env.SITE_URL || 'https://spellrightpro.org';
  const safeName = customerName || email.split('@')[0];
  const safeAmount = parseFloat(amount || 0).toFixed(2);

  const html = `
  <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f4f0fc;">
    <div style="background:#fff;padding:30px 28px;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${SITE_URL}/assets/logo.png" alt="SpellRightPro" style="height:48px;border-radius:10px;" />
      </div>

      <h1 style="font-size:1.5rem;color:#7b2ff7;margin:0 0 8px;text-align:center;">
        🎉 Welcome to Premium!
      </h1>
      <p style="color:#444;line-height:1.6;margin:0 0 24px;text-align:center;font-size:0.95rem;">
        Hi ${safeName}, your payment was successful and your premium access is now active.
      </p>

      <!-- Receipt -->
      <div style="border:1px solid #e8e0f8;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <div style="background:linear-gradient(135deg,#7b2ff7,#f72585);padding:14px 20px;color:#fff;font-weight:700;font-size:0.95rem;">
          📄 PAYMENT RECEIPT
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr>
            <td style="padding:12px 20px;color:#888;border-bottom:1px solid #f0eaff;">Plan</td>
            <td style="padding:12px 20px;color:#1a0533;font-weight:600;text-align:right;border-bottom:1px solid #f0eaff;">${planLabel}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#888;border-bottom:1px solid #f0eaff;">Amount</td>
            <td style="padding:12px 20px;color:#1a0533;font-weight:600;text-align:right;border-bottom:1px solid #f0eaff;">CAD $${safeAmount}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#888;border-bottom:1px solid #f0eaff;">Payment date</td>
            <td style="padding:12px 20px;color:#1a0533;font-weight:600;text-align:right;border-bottom:1px solid #f0eaff;">${paymentDate}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#888;border-bottom:1px solid #f0eaff;">Active until</td>
            <td style="padding:12px 20px;color:#1a0533;font-weight:600;text-align:right;border-bottom:1px solid #f0eaff;">${expiryStr}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#888;border-bottom:1px solid #f0eaff;">Billing</td>
            <td style="padding:12px 20px;color:#1a0533;font-weight:600;text-align:right;border-bottom:1px solid #f0eaff;font-size:0.82rem;">${billingNote}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#888;">Transaction ID</td>
            <td style="padding:12px 20px;color:#1a0533;font-family:monospace;font-size:0.78rem;text-align:right;">…${txnId}</td>
          </tr>
        </table>
      </div>

      <!-- What you have access to -->
      <h2 style="font-size:1rem;color:#1a0533;margin:0 0 12px;">Your premium access includes:</h2>
      <ul style="padding-left:20px;color:#444;line-height:1.9;font-size:0.9rem;margin:0 0 24px;">
        <li><strong>School Practice</strong> — unlimited words &amp; custom lists</li>
        <li><strong>OET Medical</strong> — full 1,511-word vocabulary</li>
        <li><strong>Spelling Bee</strong> — voice-recognition mode</li>
        <li><strong>Progress Dashboard</strong> — streak, accuracy, mastered words</li>
        <li><strong>Mistake Review</strong> — spaced repetition for missed words</li>
        <li><strong>No ads</strong> — distraction-free practice</li>
      </ul>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${SITE_URL}/trainer"
           style="display:inline-block;background:linear-gradient(135deg,#7b2ff7,#f72585);
                  color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;
                  font-weight:700;font-size:0.95rem;box-shadow:0 4px 16px rgba(123,47,247,0.3);">
          Start Practising Now →
        </a>
      </div>

      <!-- Footer -->
      <hr style="border:none;border-top:1px solid #e8e0f8;margin:24px 0;" />
      <p style="color:#888;font-size:0.78rem;line-height:1.5;margin:0;text-align:center;">
        Need help or want to cancel? Reply to this email or visit
        <a href="${SITE_URL}/contact" style="color:#7b2ff7;">spellrightpro.org/contact</a>.<br/>
        Cancellations are processed within 24 hours. Access continues until your billing period ends.
      </p>

      <p style="color:#aaa;font-size:0.72rem;text-align:center;margin-top:18px;">
        SpellRightPro · ${SITE_URL}<br/>
        This is an automated receipt for your records.
      </p>
    </div>
  </div>`;

  const text = `Welcome to SpellRightPro Premium!\n\n` +
               `Hi ${safeName},\n\n` +
               `Your payment was successful. Receipt:\n\n` +
               `Plan:           ${planLabel}\n` +
               `Amount:         CAD $${safeAmount}\n` +
               `Payment date:   ${paymentDate}\n` +
               `Active until:   ${expiryStr}\n` +
               `Billing:        ${billingNote}\n` +
               `Transaction ID: ...${txnId}\n\n` +
               `Start practising: ${SITE_URL}/trainer\n\n` +
               `Questions? Reply to this email or visit ${SITE_URL}/contact`;

  await transporter.sendMail({
    from:    'SpellRightPro <spellrightpro@gmail.com>',
    to:      email,
    subject: `✅ SpellRightPro Premium — Payment receipt (CAD $${safeAmount})`,
    html, text
  });
  console.log(`📧 Receipt sent to ${email}`);
}

async function sendAdminNotification({ email, customerName, plan, planLabel, amount, paymentDate, expiryStr, txnId, sessionId }) {
  if (!transporter) return;
  const ADMIN = 'spellrightpro@gmail.com';
  const safeAmount = parseFloat(amount || 0).toFixed(2);
  const safeName = customerName || '(not provided)';

  const html = `
  <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#00c57a,#0097db);color:#fff;padding:20px;border-radius:12px;margin-bottom:20px;">
      <h2 style="margin:0;font-size:1.3rem;">🎉 New Premium Subscriber!</h2>
      <p style="margin:6px 0 0;opacity:0.9;font-size:0.9rem;">SpellRightPro just received a new subscription</p>
    </div>

    <table style="width:100%;border-collapse:collapse;background:#f8f5ff;border-radius:12px;overflow:hidden;font-size:0.9rem;">
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Customer email</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e8e0f8;">${email}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Customer name</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e8e0f8;">${safeName}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Plan</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e8e0f8;color:#7b2ff7;">${planLabel}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Amount</td>
          <td style="padding:12px 16px;font-weight:700;text-align:right;border-bottom:1px solid #e8e0f8;color:#00c57a;">CAD $${safeAmount}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Payment date</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e8e0f8;">${paymentDate}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #e8e0f8;">Expires</td>
          <td style="padding:12px 16px;font-weight:600;text-align:right;border-bottom:1px solid #e8e0f8;">${expiryStr}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;">Stripe session</td>
          <td style="padding:12px 16px;font-family:monospace;font-size:0.78rem;text-align:right;color:#666;">${(sessionId||'').slice(0,30)}…</td></tr>
    </table>

    <div style="background:#fff8e1;border-left:3px solid #ffb800;padding:12px 16px;margin:20px 0;border-radius:6px;font-size:0.85rem;color:#1a0533;">
      💡 <strong>Action:</strong> Send a personal welcome email to ${email} within 24 hours.
      Personal contact from a founder dramatically improves retention and customer satisfaction.
    </div>

    <div style="text-align:center;margin-top:20px;">
      <a href="https://dashboard.stripe.com/customers" style="display:inline-block;background:#7b2ff7;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:0.85rem;margin:0 4px;">View in Stripe</a>
      <a href="https://spellrightpro.org/admin" style="display:inline-block;background:transparent;color:#7b2ff7;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:0.85rem;border:1px solid #7b2ff7;margin:0 4px;">Admin Dashboard</a>
    </div>
  </div>`;

  await transporter.sendMail({
    from:    'SpellRightPro Bot <spellrightpro@gmail.com>',
    to:      ADMIN,
    subject: `🛒 New ${planLabel} subscriber: ${email} — CAD $${safeAmount}`,
    html,
    text: `New SpellRightPro Premium subscriber!\n\n` +
          `Customer: ${email} (${safeName})\n` +
          `Plan: ${planLabel}\n` +
          `Amount: CAD $${safeAmount}\n` +
          `Payment date: ${paymentDate}\n` +
          `Expires: ${expiryStr}\n` +
          `Session: ${sessionId}\n\n` +
          `View in Stripe: https://dashboard.stripe.com/customers\n` +
          `Admin dashboard: https://spellrightpro.org/admin`
  });
  console.log(`📧 Admin notification sent for ${email}`);
}

// Helper: write premium record to Firestore
async function writePremiumRecord(uid, email, plan, sessionId, source) {
  if (!db || !email) return;
  const expiry = new Date();
  // Set expiry based on plan duration
  if (plan === 'annual')        expiry.setFullYear(expiry.getFullYear() + 1);
  else if (plan === 'sixmonth') expiry.setMonth(expiry.getMonth() + 6);
  else                          expiry.setDate(expiry.getDate() + 30);  // monthly / legacy
  const record = {
    email, plan, active: true,
    activatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    expiryDate:      admin.firestore.Timestamp.fromDate(expiry),
    stripeSessionId: sessionId || "",
    source
  };
  if (uid) {
    await db.collection("premiumUsers").doc(uid).set(record, { merge: true });
    console.log(`✅ Firestore premiumUsers/${uid} [${source}]`);
  }
  const safeEmail = email.replace(/[.#$[\]/]/g, "_");
  await db.collection("premiumByEmail").doc(safeEmail)
    .set({ ...record, firebaseUid: uid || null }, { merge: true });
  console.log(`✅ Firestore premiumByEmail/${safeEmail} [${source}]`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get("/",          (_, res) => res.json({ status: "ok", service: "SpellRightPro API" }));
app.get("/test",      (_, res) => res.json({ status: "ok" }));
app.get("/api/health",(_, res) => res.json({
  status: "healthy", stripe: !!stripe, firebase: !!db, email: !!transporter,
  plans: {
    monthly:  { amount: 500,  priceId: PLANS.monthly.priceId  },
    sixmonth: { amount: 2600, priceId: PLANS.sixmonth.priceId },
    annual:   { amount: 4500, priceId: PLANS.annual.priceId   }
  },
  timestamp: new Date().toISOString()
}));

// ── CREATE CHECKOUT SESSION ──────────────────────────────────────────────────
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured on server" });

    const { plan = "complete", email, firebaseUid = "" } = req.body;
    const planInfo = PLANS[plan] || PLANS.complete;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const lineItems = planInfo.priceId
      ? [{ price: planInfo.priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: "cad", unit_amount: planInfo.amount,
            recurring: { interval: planInfo.interval || "month" },
            product_data: {
              name: planInfo.name,
              description: planInfo.interval === "year"
                ? "Annual subscription — CAD $45/yr (save 25%) — cancel anytime"
                : "Monthly subscription — CAD $5/mo — cancel anytime"
            }
          },
          quantity: 1
        }];

    const session = await stripe.checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: ["card"],
      customer_email:       email,
      line_items:           lineItems,
      metadata:             { plan, email, firebaseUid },
      subscription_data:    { metadata: { plan, email, firebaseUid } },
      success_url: `${SITE}/thank-you.html?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planInfo.name)}`,
      cancel_url:  `${SITE}/premium.html?cancelled=1`,
      allow_promotion_codes: true
    });

    console.log(`✅ Checkout session: ${session.id} | ${email} | ${plan}`);
    // Return both url and sessionUrl/sessionId for compatibility with different frontend versions
    res.json({ url: session.url, sessionUrl: session.url, sessionId: session.id, success: true });

  } catch (err) {
    console.error("❌ create-checkout-session:", err.message);
    res.status(500).json({ error: err.message, success: false });
  }
});

// ── VERIFY SESSION ────────────────────────────────────────────────────────────
app.get("/api/verify-session", async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ paid: false, error: "Stripe not configured" });

    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ paid: false, error: "session_id required" });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid    = session.payment_status === "paid";
    const email   = session.customer_email || session.customer_details?.email || "";
    const plan    = session.metadata?.plan || "complete";
    const uid     = session.metadata?.firebaseUid || "";

    console.log(`🔍 verify-session: ${session_id} paid=${paid} ${email}`);

    if (paid) {
      await writePremiumRecord(uid, email, plan, session_id, "verify_session").catch(e =>
        console.error("Firestore write failed (non-critical):", e.message)
      );
    }

    res.json({ paid, email, plan, sessionId: session_id });

  } catch (err) {
    console.error("❌ verify-session:", err.message);
    res.status(500).json({ paid: false, error: err.message });
  }
});

// ── STRIPE WEBHOOK ────────────────────────────────────────────────────────────
app.post("/api/stripe-webhook", async (req, res) => {
  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  if (secret) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).json({ error: "Signature verification failed" });
    }
  } else {
    // No secret set yet — parse without verification (dev mode)
    try { event = JSON.parse(req.body.toString()); } catch { event = {}; }
    console.warn("⚠️  Webhook running without signature verification — set STRIPE_WEBHOOK_SECRET");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email   = session.customer_email || session.customer_details?.email || "";
    const uid     = session.metadata?.firebaseUid || "";
    const plan    = session.metadata?.plan || "complete";
    const amount  = (session.amount_total || 0) / 100;

    console.log(`💳 Webhook: ${event.type} | ${email} | ${plan} | $${amount}`);

    await writePremiumRecord(uid, email, plan, session.id, "webhook").catch(e =>
      console.error("Webhook Firestore write failed:", e.message)
    );

    // ── Send 3 emails on successful subscription ────────────────────────────
    //  1. Customer welcome + receipt
    //  2. Admin notification
    if (transporter && email) {
      // Calculate plan-specific values
      const expiry = new Date();
      if (plan === 'annual')        expiry.setFullYear(expiry.getFullYear() + 1);
      else if (plan === 'sixmonth') expiry.setMonth(expiry.getMonth() + 6);
      else                          expiry.setDate(expiry.getDate() + 30);
      const expiryStr = expiry.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      const paymentDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      const planLabel = plan === 'annual'   ? 'Annual (12 months)'
                      : plan === 'sixmonth' ? '6 months'
                      : 'Monthly (1 month)';
      const billingNote = plan === 'annual'   ? 'Renews yearly until cancelled'
                        : plan === 'sixmonth' ? 'Renews every 6 months until cancelled'
                        : 'Renews monthly until cancelled';
      const txnId = (session.id || '').slice(-12);
      const customerName = (session.customer_details && session.customer_details.name) || email.split('@')[0];

      // ── EMAIL 1: Customer welcome + receipt ────────────────────────────────
      sendCustomerReceipt({
        email, customerName, plan, planLabel, amount,
        paymentDate, expiryStr, billingNote, txnId
      }).catch(e => console.error('Customer email failed:', e.message));

      // ── EMAIL 2: Admin notification ────────────────────────────────────────
      sendAdminNotification({
        email, customerName, plan, planLabel, amount,
        paymentDate, expiryStr, txnId, sessionId: session.id
      }).catch(e => console.error('Admin email failed:', e.message));
    }
  }

  res.json({ received: true });
});

// ── SEND CONFIRMATION (fallback) ──────────────────────────────────────────────
// Called by thank-you.html as a backup if the Stripe webhook doesn't fire.
// Uses the same helpers as the webhook so the receipt format is identical.
app.post("/api/send-confirmation", async (req, res) => {
  try {
    const { email, customerName, plan = 'monthly', planName, amount, sessionId } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "email required" });

    if (transporter) {
      // Compute the same plan-specific values as the webhook handler
      const expiry = new Date();
      if (plan === 'annual')        expiry.setFullYear(expiry.getFullYear() + 1);
      else if (plan === 'sixmonth') expiry.setMonth(expiry.getMonth() + 6);
      else                          expiry.setDate(expiry.getDate() + 30);
      const expiryStr   = expiry.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      const paymentDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      const planLabel = plan === 'annual'   ? 'Annual (12 months)'
                      : plan === 'sixmonth' ? '6 months'
                      : 'Monthly (1 month)';
      const billingNote = plan === 'annual'   ? 'Renews yearly until cancelled'
                        : plan === 'sixmonth' ? 'Renews every 6 months until cancelled'
                        : 'Renews monthly until cancelled';
      const txnId = (sessionId || '').slice(-12) || 'pending';
      const name = customerName || email.split('@')[0];

      // Send both emails — receipt to customer, notification to admin
      sendCustomerReceipt({
        email, customerName: name, plan, planLabel, amount,
        paymentDate, expiryStr, billingNote, txnId
      }).catch(e => console.error('Customer email failed:', e.message));

      sendAdminNotification({
        email, customerName: name, plan, planLabel, amount,
        paymentDate, expiryStr, txnId, sessionId: sessionId || ''
      }).catch(e => console.error('Admin email failed:', e.message));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ send-confirmation:", err.message);
    res.json({ success: true, note: "order noted" });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SEQUENCES
// Three automated emails:
//   1. POST /api/email/welcome      — sent at signup (call from thank-you.html or webhook)
//   2. POST /api/email/reengage     — day-3 nudge for free users (call from a daily Cloud Scheduler job)
//   3. POST /api/email/renewal      — 7-day expiry reminder for premium users (call from Cloud Scheduler)
//
// Cloud Scheduler setup (Google Cloud Console → Cloud Scheduler → Create job):
//   Schedule: 0 9 * * *  (daily at 09:00 UTC)
//   Target:   HTTP POST https://spellrightpro-api-.../api/email/reengage  (no body needed)
//   Target:   HTTP POST https://spellrightpro-api-.../api/email/renewal   (no body needed)
//   Auth:     Add SCHEDULER_SECRET env var; pass as header X-Scheduler-Secret
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Welcome email ──────────────────────────────────────────────────────────
// Call this right after a user pays: POST /api/email/welcome { email, plan }
app.post('/api/email/welcome', async (req, res) => {
  try {
    const { email, plan = 'premium' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email required' });
    if (!transporter) return res.json({ success: false, message: 'email not configured' });

    const planLabel = plan === 'annual'   ? 'Complete Premium — Annual (CAD $45/yr)'
                    : plan === 'sixmonth' ? 'Complete Premium — 6 months (CAD $26)'
                    : 'Complete Premium — Monthly (CAD $5/mo)';

    await transporter.sendMail({
      from:    'SpellRightPro <spellrightpro@gmail.com>',
      to:      email,
      subject: "🎉 Welcome to SpellRightPro Premium — you're all set!",
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
          <img src="https://spellrightpro.org/assets/logo.png" alt="SpellRightPro"
               style="height:48px;border-radius:12px;margin-bottom:20px;" />

          <h1 style="font-size:1.5rem;color:#7b2ff7;margin:0 0 8px;">
            Welcome to Premium! 🎉
          </h1>
          <p style="color:#444;line-height:1.6;margin:0 0 20px;">
            Your subscription is active and all three practice modules are now unlocked.
          </p>

          <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;"><strong>Plan:</strong> ${planLabel}</p>
            <p style="margin:0;">Your premium features are active immediately.</p>
          </div>

          <h2 style="font-size:1.1rem;color:#1a0533;margin:0 0 12px;">What you now have access to:</h2>
          <ul style="padding-left:20px;color:#444;line-height:2;">
            <li><strong>School Practice</strong> — unlimited words, custom lists</li>
            <li><strong>OET Medical</strong> — 1,511 curated medical terms</li>
            <li><strong>Spelling Bee</strong> — voice recognition mode</li>
            <li><strong>Progress Dashboard</strong> — streak, accuracy, words mastered</li>
            <li><strong>Mistake Review</strong> — spaced repetition for words you miss</li>
          </ul>

          <a href="https://spellrightpro.org/trainer"
             style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#7b2ff7,#f72585);
                    color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;
                    font-weight:700;font-size:1rem;">
            Start Practising Now →
          </a>

          <p style="color:#888;font-size:0.82rem;margin-top:32px;line-height:1.5;">
            Questions? Reply to this email or visit
            <a href="https://spellrightpro.org/contact" style="color:#7b2ff7;">spellrightpro.org/contact</a>.<br/>
            To cancel your subscription at any time, email us and we will handle it within 24 hours.
          </p>
        </div>`,
      text: `Welcome to SpellRightPro Premium!\n\nPlan: ${planLabel}\n\nAll three modules are now unlocked.\n\nStart practising: https://spellrightpro.org/trainer\n\nQuestions? spellrightpro@gmail.com`
    });

    console.log(`📧 Welcome email sent to ${email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Welcome email error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. Day-3 re-engagement email for free users ───────────────────────────────
// Called daily by Cloud Scheduler. Reads Firestore for users who signed up
// 3 days ago and have NOT yet upgraded (no record in premiumUsers).
// Falls back to a manual trigger if Firestore/Admin is not available.
app.post('/api/email/reengage', async (req, res) => {
  // Protect from public calls — only Cloud Scheduler should hit this
  const secret = req.headers['x-scheduler-secret'];
  if (process.env.SCHEDULER_SECRET && secret !== process.env.SCHEDULER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Manual single-user trigger (for testing or manual sends)
  if (req.body && req.body.email) {
    const { email, name } = req.body;
    try {
      await sendReengageEmail(email, name || email.split('@')[0]);
      return res.json({ success: true, sent: 1 });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Automated: scan Firestore for day-3 free users
  if (!db) return res.json({ success: false, message: 'Firestore not available', sent: 0 });

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStart = new Date(threeDaysAgo); threeDaysAgoStart.setHours(0,0,0,0);
    const threeDaysAgoEnd   = new Date(threeDaysAgo); threeDaysAgoEnd.setHours(23,59,59,999);

    // Get users who registered around 3 days ago
    const usersSnap = await db.collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(threeDaysAgoStart))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(threeDaysAgoEnd))
      .get();

    let sent = 0;
    for (const doc of usersSnap.docs) {
      const user = doc.data();
      if (!user.email) continue;

      // Skip if already premium
      const premSnap = await db.collection('premiumUsers').doc(doc.id).get();
      if (premSnap.exists && premSnap.data().active) continue;

      // Skip if already sent this email
      if (user.reengageSent) continue;

      await sendReengageEmail(user.email, user.displayName || user.email.split('@')[0]);

      // Mark as sent so we don't send again
      await db.collection('users').doc(doc.id).update({ reengageSent: true });
      sent++;
    }

    console.log(`📧 Re-engage: sent to ${sent} users`);
    res.json({ success: true, sent });
  } catch (err) {
    console.error('❌ Re-engage batch error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function sendReengageEmail(email, name) {
  if (!transporter) throw new Error('Email not configured');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  await transporter.sendMail({
    from:    'SpellRightPro <spellrightpro@gmail.com>',
    to:      email,
    subject: `${displayName}, your spelling practice is waiting 📚`,
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <img src="https://spellrightpro.org/assets/logo.png" alt="SpellRightPro"
             style="height:48px;border-radius:12px;margin-bottom:20px;" />

        <h1 style="font-size:1.4rem;color:#7b2ff7;margin:0 0 8px;">
          Ready to keep improving, ${displayName}?
        </h1>
        <p style="color:#444;line-height:1.6;margin:0 0 20px;">
          You tried SpellRightPro a few days ago — your free practice sessions are still waiting.
          Even 5 minutes a day makes a real difference over time.
        </p>

        <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h2 style="font-size:1rem;color:#7b2ff7;margin:0 0 10px;">Free practice — no account needed:</h2>
          <ul style="padding-left:18px;color:#444;line-height:2;margin:0;">
            <li><strong>School Practice</strong> — academic word lists</li>
            <li><strong>OET Medical</strong> — healthcare vocabulary</li>
            <li><strong>Spelling Bee</strong> — voice recognition spelling</li>
          </ul>
        </div>

        <a href="https://spellrightpro.org"
           style="display:inline-block;background:linear-gradient(135deg,#7b2ff7,#f72585);
                  color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;
                  font-weight:700;font-size:1rem;">
          Continue Practising — Free →
        </a>

        <div style="margin-top:28px;padding:16px;background:#fef9ee;border-radius:10px;border-left:3px solid #ffb800;">
          <p style="margin:0;font-size:0.9rem;color:#444;">
            <strong>Want to go further?</strong> Premium unlocks unlimited words, your full progress history,
            mistake review and more — starting from just <strong>CAD $5/month</strong>.
          </p>
          <a href="https://spellrightpro.org/premium"
             style="display:inline-block;margin-top:10px;color:#7b2ff7;font-weight:700;font-size:0.9rem;text-decoration:none;">
            See Premium Plans →
          </a>
        </div>

        <p style="color:#888;font-size:0.8rem;margin-top:28px;">
          You received this because you tried SpellRightPro.
          <a href="https://spellrightpro.org/contact" style="color:#7b2ff7;">Unsubscribe</a>
        </p>
      </div>`,
    text: `Hi ${displayName},\n\nYour SpellRightPro practice sessions are still waiting.\n\nStart free: https://spellrightpro.org\n\nWant full access? Premium from CAD $5/mo: https://spellrightpro.org/premium`
  });
  console.log(`📧 Re-engage email sent to ${email}`);
}

// ── 3. Renewal reminder — 7 days before premium expires ──────────────────────
// Called daily by Cloud Scheduler. Scans premiumUsers for accounts expiring
// in exactly 7 days and sends a renewal reminder.
app.post('/api/email/renewal', async (req, res) => {
  const secret = req.headers['x-scheduler-secret'];
  if (process.env.SCHEDULER_SECRET && secret !== process.env.SCHEDULER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Manual single-user trigger
  if (req.body && req.body.email) {
    const { email, plan, expiryDate } = req.body;
    try {
      await sendRenewalEmail(email, plan || 'premium', expiryDate || 'soon');
      return res.json({ success: true, sent: 1 });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (!db) return res.json({ success: false, message: 'Firestore not available', sent: 0 });

  try {
    const sevenDaysFromNow    = new Date(); sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const windowStart = new Date(sevenDaysFromNow); windowStart.setHours(0,0,0,0);
    const windowEnd   = new Date(sevenDaysFromNow); windowEnd.setHours(23,59,59,999);

    const snap = await db.collection('premiumUsers')
      .where('active',     '==', true)
      .where('expiryDate', '>=', admin.firestore.Timestamp.fromDate(windowStart))
      .where('expiryDate', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
      .get();

    let sent = 0;
    for (const doc of snap.docs) {
      const user = doc.data();
      if (!user.email) continue;
      if (user.renewalReminderSent) continue;

      const expiryStr = user.expiryDate.toDate().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      await sendRenewalEmail(user.email, user.plan || 'premium', expiryStr);

      await db.collection('premiumUsers').doc(doc.id).update({ renewalReminderSent: true });
      sent++;
    }

    console.log(`📧 Renewal reminders sent to ${sent} users`);
    res.json({ success: true, sent });
  } catch (err) {
    console.error('❌ Renewal reminder error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

async function sendRenewalEmail(email, plan, expiryStr) {
  if (!transporter) throw new Error('Email not configured');
  const planLabel = plan === 'annual' ? 'Annual' : plan === 'sixmonth' ? '6 months' : 'Monthly';
  const siteUrl   = process.env.SITE_URL || 'https://spellrightpro.org';

  await transporter.sendMail({
    from:    'SpellRightPro <spellrightpro@gmail.com>',
    to:      email,
    subject: '⏰ Your SpellRightPro Premium expires in 7 days',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <img src="${siteUrl}/assets/logo.png" alt="SpellRightPro"
             style="height:48px;border-radius:12px;margin-bottom:20px;" />

        <h1 style="font-size:1.4rem;color:#7b2ff7;margin:0 0 8px;">
          Your Premium access expires on ${expiryStr}
        </h1>
        <p style="color:#444;line-height:1.6;margin:0 0 20px;">
          Your SpellRightPro ${planLabel} subscription expires in 7 days.
          If your subscription renews automatically (Stripe recurring billing), no action is needed.
          If you cancelled and would like to resubscribe, you can do so any time below.
        </p>

        <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;"><strong>Current plan:</strong> ${planLabel} Premium</p>
          <p style="margin:0;"><strong>Expires:</strong> ${expiryStr}</p>
        </div>

        <a href="${siteUrl}/premium"
           style="display:inline-block;background:linear-gradient(135deg,#7b2ff7,#f72585);
                  color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;
                  font-weight:700;font-size:1rem;">
          Renew Premium →
        </a>

        <div style="margin-top:28px;padding:16px;background:#fff8f0;border-radius:10px;border-left:3px solid #ff9800;">
          <p style="margin:0;font-size:0.9rem;color:#444;">
            <strong>What you'll lose access to when it expires:</strong>
            unlimited words, progress dashboard, mistake review, adaptive drills,
            and all 1,511 OET medical terms.
          </p>
        </div>

        <p style="color:#888;font-size:0.8rem;margin-top:28px;line-height:1.5;">
          Questions about your subscription? Email us at
          <a href="mailto:spellrightpro@gmail.com" style="color:#7b2ff7;">spellrightpro@gmail.com</a>.
        </p>
      </div>`,
    text: `Your SpellRightPro ${planLabel} Premium expires on ${expiryStr}.\n\nRenew: ${siteUrl}/premium\n\nQuestions? spellrightpro@gmail.com`
  });
  console.log(`📧 Renewal reminder sent to ${email}`);
}

// ── START ─────────────────────────────────────────────────────────────────────

// ── Daily email checks — self-triggered, no Cloud Scheduler needed ────────────
// Runs once on startup and every 24 hours after that.
// Cloud Run stays warm as long as users are active — if the server restarts,
// the interval resets, which is fine (checks just run again on next startup).
function runDailyEmailChecks() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Scheduler-Secret': process.env.SCHEDULER_SECRET || 'internal'
  };
  const base = `http://localhost:${process.env.PORT || 8080}`;

  // Small stagger so both don't fire at the exact same millisecond
  setTimeout(() => {
    fetch(base + '/api/email/reengage', { method: 'POST', headers })
      .then(r => r.json())
      .then(d => console.log('✅ Re-engage check:', d.sent || 0, 'emails sent'))
      .catch(e => console.error('Re-engage check error:', e.message));
  }, 2000);

  setTimeout(() => {
    fetch(base + '/api/email/renewal', { method: 'POST', headers })
      .then(r => r.json())
      .then(d => console.log('✅ Renewal reminder check:', d.sent || 0, 'emails sent'))
      .catch(e => console.error('Renewal check error:', e.message));
  }, 5000);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {

  // Start daily email checks (runs on startup + every 24h)
  setTimeout(runDailyEmailChecks, 10000); // 10s delay to let server fully start
  setInterval(runDailyEmailChecks, 24 * 60 * 60 * 1000);

  console.log(`
╔═══════════════════════════════════════════════════════╗
║        SpellRightPro API — Port ${PORT}                ║
╠═══════════════════════════════════════════════════════╣
║  GET  /                           health              ║
║  GET  /api/health                 detailed health     ║
║  POST /api/create-checkout-session Stripe checkout    ║
║  Env: STRIPE_PRICE_MONTHLY, _SIXMONTH, _ANNUAL        ║
║  GET  /api/verify-session         confirm payment     ║
║  POST /api/stripe-webhook         Stripe events       ║
║  POST /api/send-confirmation      email fallback      ║
╚═══════════════════════════════════════════════════════╝`);
});
