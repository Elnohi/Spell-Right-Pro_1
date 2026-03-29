const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3801;

// ─── Validate required env vars at startup ───────────────────────────────────
const REQUIRED_ENV = ['EMAIL_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('   Create a .env file with these values before starting the server.');
  process.exit(1);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS — allow only your own domain in production
const allowedOrigins = [
  'https://spellrightpro.org',
  'https://www.spellrightpro.org',
  // Allow localhost only in development
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500']
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Email configuration ──────────────────────────────────────────────────────
// EMAIL_PASSWORD must be set in your .env file or hosting environment.
// Never hardcode credentials here. See .env.example for the required format.
const EMAIL_USER = process.env.EMAIL_USER || 'spellrightpro@gmail.com';

const emailConfig = {
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD   // No fallback — fails loudly if missing
  }
};

let transporter;
let emailMode = 'REAL';

try {
  transporter = nodemailer.createTransport(emailConfig);
  console.log(`✅ Email transporter configured for: ${EMAIL_USER}`);
} catch (error) {
  console.error('❌ Failed to create email transporter:', error.message);
  // Fall back to mock only in development so the server stays useful locally
  if (process.env.NODE_ENV !== 'production') {
    emailMode = 'MOCK';
    transporter = {
      sendMail: async (options) => {
        console.log('📧 [MOCK] email to:', options.to, '| subject:', options.subject);
        return { messageId: 'mock-' + Date.now() };
      }
    };
    console.warn('⚠️  Running in MOCK email mode (development only)');
  } else {
    // In production a broken transporter is a fatal error
    process.exit(1);
  }
}

// ─── Premium plans ────────────────────────────────────────────────────────────
const premiumPlans = {
  school: {
    name: 'School Premium',
    price: 4.99,
    currency: 'CAD',
    features: [
      'Unlimited school word lists',
      'Save up to 50 custom lists',
      'Progress tracking dashboard',
      'Ad-free experience'
    ]
  },
  complete: {
    name: 'Complete Premium',
    price: 8.99,
    currency: 'CAD',
    features: [
      'All School Premium features',
      'OET medical vocabulary',
      'Spelling Bee mode',
      'Adaptive drill generator',
      'Spaced repetition mistake review',
      'Cross-device sync',
      'Unlimited custom word lists'
    ]
  },
  family: {
    name: 'Family Plan',
    price: 14.99,
    currency: 'CAD',
    features: [
      'All Complete Premium features',
      'Up to 5 user profiles',
      'Family progress dashboard',
      'Priority support'
    ]
  }
};

// ─── Input helpers ────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.length < 254;
}

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return 'Valued Customer';
  return name.replace(/[<>"'&]/g, '').trim().slice(0, 100);
}

// ─── Email templates ──────────────────────────────────────────────────────────
function buildWelcomeEmail(customerName, planDetails) {
  const featureList = planDetails.features
    .map(f => `<li style="padding:4px 0;">${f}</li>`)
    .join('');

  return {
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f8ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7b2ff7,#f72585);padding:40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:1.8rem;">🎉 Welcome to SpellRightPro!</h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:1rem;">Your premium access is now active</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#1f2937;font-size:1rem;">Hi ${customerName},</p>
            <p style="margin:0 0 24px;color:#374151;">Thank you for upgrading to <strong>${planDetails.name}</strong>. Your account is ready — start practising right away!</p>

            <div style="background:#f6f8ff;border-radius:12px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-weight:700;color:#7b2ff7;">Your plan includes:</p>
              <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.8;">
                ${featureList}
              </ul>
            </div>

            <div style="text-align:center;margin:32px 0;">
              <a href="https://spellrightpro.org"
                 style="display:inline-block;background:linear-gradient(135deg,#7b2ff7,#f72585);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:1rem;">
                Start Practising →
              </a>
            </div>

            <p style="margin:0;color:#6b7280;font-size:0.9rem;">
              Questions? Reply to this email or visit
              <a href="https://spellrightpro.org/contact.html" style="color:#7b2ff7;">our support page</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:0.8rem;">
              © 2026 SpellRightPro &nbsp;·&nbsp;
              <a href="https://spellrightpro.org/privacy.html" style="color:#7b2ff7;">Privacy</a> &nbsp;·&nbsp;
              <a href="https://spellrightpro.org/refund-policy.html" style="color:#7b2ff7;">Refund Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Welcome to SpellRightPro ${planDetails.name}!\n\nHi ${customerName},\n\nYour premium access is now active.\n\nYour plan includes:\n${planDetails.features.map(f => `• ${f}`).join('\n')}\n\nStart practising: https://spellrightpro.org\n\nQuestions? Email: ${EMAIL_USER}\n\n© 2026 SpellRightPro`
  };
}

function buildPaymentConfirmEmail(customerName, planDetails, transactionId) {
  return {
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#f6f8ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:#059669;padding:32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:1.6rem;">✅ Payment Confirmed</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#374151;">
        <p>Hi ${customerName},</p>
        <p>Your payment for <strong>${planDetails.name}</strong> has been confirmed.</p>
        <table width="100%" style="border-collapse:collapse;margin:20px 0;">
          <tr style="background:#f6f8ff;">
            <td style="padding:10px 14px;font-weight:600;">Plan</td>
            <td style="padding:10px 14px;">${planDetails.name}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:600;">Amount</td>
            <td style="padding:10px 14px;">${planDetails.currency} $${planDetails.price}/month</td>
          </tr>
          <tr style="background:#f6f8ff;">
            <td style="padding:10px 14px;font-weight:600;">Transaction ID</td>
            <td style="padding:10px 14px;font-family:monospace;">${transactionId}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:0.9rem;">Keep this email as your receipt. For refund requests within 14 days, email <a href="mailto:${EMAIL_USER}" style="color:#7b2ff7;">${EMAIL_USER}</a> with this transaction ID.</p>
        <div style="text-align:center;margin-top:28px;">
          <a href="https://spellrightpro.org" style="background:#7b2ff7;color:#fff;text-decoration:none;padding:12px 32px;border-radius:50px;font-weight:700;">Start Practising →</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:0.8rem;">© 2026 SpellRightPro &nbsp;·&nbsp; <a href="https://spellrightpro.org/refund-policy.html" style="color:#7b2ff7;">Refund Policy</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Payment Confirmed!\n\nHi ${customerName},\n\nPlan: ${planDetails.name}\nAmount: ${planDetails.currency} $${planDetails.price}/month\nTransaction ID: ${transactionId}\n\nKeep this as your receipt. Refund requests within 14 days: ${EMAIL_USER}\n\n© 2026 SpellRightPro`
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Root info
app.get('/', (req, res) => {
  res.json({
    service: 'SpellRightPro API',
    version: '1.0.0',
    endpoints: {
      'GET  /api/health': 'Health check',
      'GET  /api/plans': 'List premium plans',
      'POST /api/send-welcome-email': 'Send welcome email',
      'POST /api/send-confirmation': 'Send payment confirmation email',
      'POST /api/process-payment': 'Record payment and send confirmation'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SpellRightPro API',
    version: '1.0.0',
    emailMode,
    timestamp: new Date().toISOString()
  });
});

// List plans
app.get('/api/plans', (req, res) => {
  res.json({ success: true, plans: premiumPlans });
});

// Send welcome email (called after Stripe confirms payment)
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { customerEmail, customerName, plan } = req.body;

    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({ success: false, message: 'A valid customerEmail is required.' });
    }
    if (!plan || !premiumPlans[plan]) {
      return res.status(400).json({ success: false, message: `Invalid plan. Valid values: ${Object.keys(premiumPlans).join(', ')}` });
    }

    const planDetails = premiumPlans[plan];
    const name = sanitizeName(customerName);
    const body = buildWelcomeEmail(name, planDetails);

    const info = await transporter.sendMail({
      from: `SpellRightPro <${EMAIL_USER}>`,
      to: customerEmail.trim(),
      subject: `🎉 Welcome to SpellRightPro ${planDetails.name}!`,
      html: body.html,
      text: body.text
    });

    console.log(`✅ Welcome email sent → ${customerEmail} (${info.messageId})`);
    res.json({ success: true, message: 'Welcome email sent.', messageId: info.messageId });

  } catch (error) {
    console.error('❌ send-welcome-email error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email.',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

// Send payment confirmation email
// This is the endpoint premium.html calls — fixes the localhost:3001 bug
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { email, plan, amount, customerName } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }

    const planKey = typeof plan === 'string' ? plan.toLowerCase().replace(/\s+/g, '') : '';
    const planDetails = premiumPlans[planKey] || {
      name: plan || 'Premium',
      price: amount || 0,
      currency: 'CAD',
      features: ['Premium access to SpellRightPro']
    };

    const name = sanitizeName(customerName);
    const transactionId = `SRP-${Date.now()}`;
    const body = buildPaymentConfirmEmail(name, planDetails, transactionId);

    const info = await transporter.sendMail({
      from: `SpellRightPro <${EMAIL_USER}>`,
      to: email.trim(),
      subject: `✅ Payment Confirmed — SpellRightPro ${planDetails.name}`,
      html: body.html,
      text: body.text
    });

    console.log(`✅ Confirmation email sent → ${email} (${info.messageId})`);
    res.json({ success: true, message: 'Confirmation email sent.', transactionId, messageId: info.messageId });

  } catch (error) {
    console.error('❌ send-confirmation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email.',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

// Process payment record + send confirmation
app.post('/api/process-payment', async (req, res) => {
  try {
    const { plan, customerEmail, customerName } = req.body;

    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({ success: false, message: 'A valid customerEmail is required.' });
    }
    if (!plan || !premiumPlans[plan]) {
      return res.status(400).json({ success: false, message: `Invalid plan. Valid values: ${Object.keys(premiumPlans).join(', ')}` });
    }

    const planDetails = premiumPlans[plan];
    const name = sanitizeName(customerName);
    const transactionId = `SRP-${Date.now()}`;
    const body = buildPaymentConfirmEmail(name, planDetails, transactionId);

    try {
      await transporter.sendMail({
        from: `SpellRightPro <${EMAIL_USER}>`,
        to: customerEmail.trim(),
        subject: `✅ Payment Confirmed — SpellRightPro ${planDetails.name}`,
        html: body.html,
        text: body.text
      });
      console.log(`✅ Payment confirmation sent → ${customerEmail}`);
    } catch (emailError) {
      // Log but don't fail the response — payment record still created
      console.error('⚠️  Payment recorded but confirmation email failed:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully.',
      transaction: {
        id: transactionId,
        amount: planDetails.price,
        currency: planDetails.currency,
        plan: planDetails.name,
        customerEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ process-payment error:', error.message);
    res.status(500).json({ success: false, message: 'Payment processing failed.' });
  }
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.',
    availableEndpoints: [
      'GET  /',
      'GET  /api/health',
      'GET  /api/plans',
      'POST /api/send-welcome-email',
      'POST /api/send-confirmation',
      'POST /api/process-payment'
    ]
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           SPELLRIGHT PRO API SERVER                      ║
║                                                          ║
║   🚀  Listening : http://localhost:${PORT}              ║
║   📧  Email     : ${EMAIL_USER}  ║
║   🔧  Email mode: ${emailMode}                               ║
║   🌍  Env       : ${process.env.NODE_ENV || 'development'}                        ║
╚══════════════════════════════════════════════════════════╝

Endpoints:
  GET  /api/health
  GET  /api/plans
  POST /api/send-welcome-email
  POST /api/send-confirmation      ← used by premium.html checkout
  POST /api/process-payment
`);
});
