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
  school:   { name: "SpellRightPro School Premium",   amount: 499,  priceId: process.env.STRIPE_PRICE_SCHOOL   || null },
  complete: { name: "SpellRightPro Complete Premium", amount: 899,  priceId: process.env.STRIPE_PRICE_COMPLETE || null },
  family:   { name: "SpellRightPro Family Plan",      amount: 1499, priceId: process.env.STRIPE_PRICE_FAMILY   || null }
};

const SITE = process.env.SITE_URL || "https://spellrightpro.org";

// Helper: write premium record to Firestore
async function writePremiumRecord(uid, email, plan, sessionId, source) {
  if (!db || !email) return;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
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
  plans: Object.fromEntries(Object.entries(PLANS).map(([k,v]) => [k, { priceId: v.priceId, amount: v.amount }])),
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
            recurring: { interval: "month" },
            product_data: { name: planInfo.name, description: "Monthly — cancel anytime" }
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

    // Send confirmation email
    if (transporter && email) {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      const expiryStr = expiry.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
      transporter.sendMail({
        from:    "SpellRightPro <spellrightpro@gmail.com>",
        to:      email,
        subject: "✅ Your SpellRightPro Premium is now active!",
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:30px;">
          <h1 style="color:#7b2ff7;">Welcome to Premium!</h1>
          <p>Your payment was successful. Your premium access is now active.</p>
          <div style="background:#f4f0fc;border-radius:12px;padding:20px;margin:20px 0;">
            <p><strong>Plan:</strong> ${plan}</p>
            <p><strong>Amount:</strong> CAD $${amount.toFixed(2)}/month</p>
            <p><strong>Active until:</strong> ${expiryStr}</p>
          </div>
          <a href="${SITE}/trainer" style="display:inline-block;background:#7b2ff7;color:#fff;
            text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;margin:10px 0;">
            Start Practising →
          </a>
          <p style="color:#888;font-size:0.85rem;margin-top:24px;">
            Questions? <a href="${SITE}/contact">Contact us</a>
          </p></div>`,
        text: `Welcome to SpellRightPro Premium!\n\nPlan: ${plan}\nAmount: CAD $${amount.toFixed(2)}/month\n\nStart: ${SITE}/trainer`
      }).then(() => console.log(`📧 Confirmation sent to ${email}`))
        .catch(e => console.error("Email failed:", e.message));
    }
  }

  res.json({ received: true });
});

// ── SEND CONFIRMATION (fallback) ──────────────────────────────────────────────
app.post("/api/send-confirmation", async (req, res) => {
  try {
    const { email, customerName, plan, planName, amount } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "email required" });

    if (transporter) {
      const name  = customerName || email.split("@")[0];
      const label = planName || plan || "Premium";
      const price = parseFloat(amount || 0).toFixed(2);
      await transporter.sendMail({
        from:    "SpellRightPro <spellrightpro@gmail.com>",
        to:      email,
        subject: `✅ SpellRightPro ${label} — order received`,
        html:    `<p>Hi ${name}, thank you for choosing <strong>${label}</strong> (CAD $${price}/mo). Your access will be activated shortly.</p>`,
        text:    `Hi ${name}, thank you for choosing ${label}. Your access will be activated shortly.`
      });
      transporter.sendMail({
        from: "SpellRightPro <spellrightpro@gmail.com>",
        to:   "spellrightpro@gmail.com",
        subject: `🛒 New order: ${label} — ${email}`,
        text:    `Customer: ${email}\nPlan: ${label}\nAmount: CAD $${price}/mo\n${new Date().toUTCString()}`
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ send-confirmation:", err.message);
    res.json({ success: true, note: "order noted" });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║        SpellRightPro API — Port ${PORT}                ║
╠═══════════════════════════════════════════════════════╣
║  GET  /                           health              ║
║  GET  /api/health                 detailed health     ║
║  POST /api/create-checkout-session Stripe checkout    ║
║  GET  /api/verify-session         confirm payment     ║
║  POST /api/stripe-webhook         Stripe events       ║
║  POST /api/send-confirmation      email fallback      ║
╚═══════════════════════════════════════════════════════╝`);
});
