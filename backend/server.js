const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3801; // Changed to 3801 to match your original port

// Security middleware
app.use(helmet());

// CORS middleware with specific configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [FRONTEND_URL];
if (process.env.EXTRA_FRONTEND_HOSTS) {
  const extraHosts = process.env.EXTRA_FRONTEND_HOSTS.split(',').map(h => h.trim());
  allowedOrigins.push(...extraHosts);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      // Check if origin matches a pattern
      const allowedPatterns = [/\.spellrightpro\.org$/, /localhost:\d+$/];
      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      
      if (!isAllowed) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email transporter configuration (fixed single declaration)
let transporter;

async function initializeTransporter() {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('Email service: Gmail configured');
  } else if (process.env.EMAIL_SERVICE === 'smtp') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('Email service: SMTP configured');
  } else {
    // Fallback to ethereal email for testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Email service: Using Ethereal for testing');
      console.log('Test account:', testAccount.user);
      console.log('Test password:', testAccount.pass);
    } catch (error) {
      console.error('Failed to create test email account:', error);
      transporter = null;
    }
  }
}

// Initialize email transporter
initializeTransporter();

// Premium Plan Configuration
const PLANS = {
  'school': {
    name: 'School Premium',
    price: 4.99,
    features: [
      'Unlimited school words',
      'Save 50 custom lists',
      'Basic progress tracking',
      'School-focused words',
      'Export to PDF',
      'Email support'
    ]
  },
  'complete': {
    name: 'Complete Premium',
    price: 8.99,
    features: [
      'All features from all modes',
      'Unlimited custom word lists',
      'Advanced progress analytics',
      'All voice accents unlocked',
      'Priority email & chat support',
      'Export to PDF & Excel',
      'Early access to new features'
    ]
  },
  'family': {
    name: 'Family Plan',
    price: 14.99,
    features: [
      'Up to 5 users',
      'All Complete Premium features',
      'Separate progress tracking',
      'Family dashboard',
      'Group learning challenges',
      'Dedicated account manager'
    ]
  }
};

// Generate email HTML template
function generateEmailHTML(plan, userEmail, transactionId, amount) {
  const planDetails = PLANS[plan] || PLANS.complete;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #7b2ff7 0%, #f72585 100%);
      color: white;
      padding: 30px;
      border-radius: 15px 15px 0 0;
      text-align: center;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 15px 15px;
    }
    .badge {
      display: inline-block;
      background: #7b2ff7;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .receipt {
      background: white;
      border: 2px solid #7b2ff7;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
    }
    .feature-list li:before {
      content: "✓";
      color: #4CAF50;
      font-weight: bold;
      margin-right: 10px;
    }
    .cta-button {
      display: inline-block;
      background: #7b2ff7;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 0.8em;
      color: #666;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to SpellRightPro Premium!</h1>
    <p>Your spelling journey just got an upgrade</p>
  </div>
  
  <div class="content">
    <div class="badge">ACTIVE SUBSCRIPTION</div>
    
    <h2>Thank you for choosing ${planDetails.name}</h2>
    
    <div class="receipt">
      <h3>📋 Order Confirmation</h3>
      <p><strong>Transaction ID:</strong> ${transactionId}</p>
      <p><strong>Plan:</strong> ${planDetails.name}</p>
      <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
    </div>
    
    <h3>✨ Your Premium Features:</h3>
    <ul class="feature-list">
      ${planDetails.features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
    
    <div style="text-align: center;">
      <a href="${process.env.APP_URL || 'https://spellrightpro.org'}" class="cta-button">
        Start Learning Now →
      </a>
    </div>
    
    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4>📞 Need Help?</h4>
      <p>Our support team is ready to assist you:</p>
      <ul style="list-style: none; padding: 0;">
        <li>📧 Email: spellrightpro@gmail.com</li>
        <li>🕒 Hours: 24/7 Premium Support</li>
        <li>🔒 Secure: All communications encrypted</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>SpellRightPro Premium • Transforming Spelling Education</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} SpellRightPro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SpellRightPro Premium API',
    version: '1.0.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get premium plans
app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    plans: PLANS
  });
});

// Send confirmation email (SINGLE VERSION - removed duplicate)
app.post('/api/send-confirmation', async (req, res) => {
  try {
    // Check if transporter is initialized
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        throw new Error('Email service not available');
      }
    }
    
    const { email, plan, amount, transactionId } = req.body;
    
    // Validate input
    if (!email || !plan || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, plan, amount'
      });
    }
    
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Generate email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
      to: email,
      subject: `🎉 Welcome to SpellRightPro ${PLANS[plan].name}!`,
      html: generateEmailHTML(plan, email, transactionId || `SRP_${Date.now()}`, amount),
      text: `Welcome to SpellRightPro ${PLANS[plan].name}!\n\nThank you for your purchase of $${amount}.\n\nTransaction ID: ${transactionId || 'N/A'}\n\nStart learning at: ${process.env.APP_URL || 'https://spellrightpro.org'}\n\nNeed help? Contact spellrightpro@gmail.com`
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent:', info.messageId);
    
    // Log the transaction
    const transactionLog = {
      transactionId: transactionId || `SRP_${Date.now()}`,
      email,
      plan,
      amount,
      timestamp: new Date().toISOString(),
      emailSent: true,
      emailId: info.messageId
    };
    
    console.log('Transaction logged:', transactionLog);
    
    // If using Ethereal, provide preview URL
    let previewUrl = null;
    if (process.env.NODE_ENV !== 'production' && info.response.includes('ethereal.email')) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
    }
    
    res.json({
      success: true,
      message: 'Confirmation email sent successfully',
      transactionId: transactionLog.transactionId,
      previewUrl
    });
    
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Try to send a fallback email if primary fails
    try {
      const fallbackMailOptions = {
        from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
        to: req.body.email,
        subject: 'Your SpellRightPro Purchase',
        text: `Thank you for your SpellRightPro purchase. We're experiencing email issues but your transaction was successful. Transaction ID: ${req.body.transactionId || 'N/A'}`
      };
      
      await transporter.sendMail(fallbackMailOptions);
      console.log('Fallback email sent');
      
    } catch (fallbackError) {
      console.error('Fallback email also failed:', fallbackError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mock payment processing endpoint
app.post('/api/process-payment', async (req, res) => {
  try {
    // Check if transporter is initialized
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        throw new Error('Email service not available');
      }
    }
    
    const { plan, paymentMethod, email } = req.body;
    
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Generate transaction ID
    const transactionId = 'SPRP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const amount = PLANS[plan].price;
    
    // In production, integrate with Stripe/PayPal here
    // For now, simulate successful payment
    const paymentResult = {
      success: true,
      transactionId,
      amount,
      plan: PLANS[plan].name,
      timestamp: new Date().toISOString(),
      message: 'Payment processed successfully'
    };
    
    // Send confirmation email
    if (email) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
          to: email,
          subject: `🎉 Welcome to SpellRightPro ${PLANS[plan].name}!`,
          html: generateEmailHTML(plan, email, transactionId, amount)
        };
        
        await transporter.sendMail(mailOptions);
        console.log('Payment confirmation email sent to:', email);
        
      } catch (emailError) {
        console.error('Failed to send payment email:', emailError);
      }
    }
    
    res.json(paymentResult);
    
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook for payment notifications (for Stripe/PayPal)
app.post('/api/webhooks/payment', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  // Verify webhook signature in production
  console.log('Payment webhook received:', {
    body: req.body.toString(),
    signature,
    timestamp: new Date().toISOString()
  });
  
  // Process webhook event
  res.json({ received: true, timestamp: new Date().toISOString() });
});

// Customer support contact form
app.post('/api/contact-support', async (req, res) => {
  try {
    // Check if transporter is initialized
    if (!transporter) {
      await initializeTransporter();
      if (!transporter) {
        throw new Error('Email service not available');
      }
    }
    
    const { name, email, subject, message, plan } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Email and message are required'
      });
    }
    
    const supportMailOptions = {
      from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
      to: process.env.SUPPORT_EMAIL || 'spellrightpro@gmail.com',
      subject: `Support Request: ${subject || 'No subject'}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${name || 'Anonymous'} (${email})</p>
        <p><strong>Plan:</strong> ${plan || 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
      replyTo: email
    };
    
    await transporter.sendMail(supportMailOptions);
    
    // Send auto-reply to customer
    const autoReplyOptions = {
      from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
      to: email,
      subject: 'We Received Your Support Request',
      html: `
        <h2>Thank You for Contacting SpellRightPro Support</h2>
        <p>We've received your message and our team will get back to you within 24 hours.</p>
        <p><strong>Your Reference:</strong> SRP_${Date.now()}</p>
        <p>If this is urgent, please email us directly at spellrightpro@gmail.com</p>
      `
    };
    
    await transporter.sendMail(autoReplyOptions);
    
    res.json({
      success: true,
      message: 'Support request submitted successfully',
      reference: `SRP_${Date.now()}`
    });
    
  } catch (error) {
    console.error('Support request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit support request'
    });
  }
});

// Analytics endpoint (for tracking conversions)
app.post('/api/track-conversion', (req, res) => {
  const { event, data } = req.body;
  
  console.log('Conversion tracked:', {
    event,
    data,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    tracked: true,
    timestamp: new Date().toISOString()
  });
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    if (!transporter) {
      await initializeTransporter();
    }
    
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: 'Email transporter not initialized'
      });
    }
    
    const testMailOptions = {
      from: process.env.EMAIL_FROM || 'SpellRightPro <spellrightpro@gmail.com>',
      to: 'test@example.com',
      subject: 'SpellRightPro Test Email',
      text: 'This is a test email from SpellRightPro server.',
      html: '<h1>Test Email</h1><p>This is a test email from SpellRightPro server.</p>'
    };
    
    const info = await transporter.sendMail(testMailOptions);
    
    let previewUrl = null;
    if (process.env.NODE_ENV !== 'production' && info.response.includes('ethereal.email')) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      previewUrl,
      emailService: process.env.EMAIL_SERVICE || 'ethereal (test)'
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// Serve static files (if your frontend is in the same project)
app.use(express.static('public'));

// Catch-all route for SPA
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
  
  // If you have a public folder with index.html
  if (require('fs').existsSync('public/index.html')) {
    return res.sendFile('index.html', { root: 'public' });
  }
  
  res.json({
    success: true,
    service: 'SpellRightPro Premium API',
    message: 'Server is running. Use API endpoints.',
    endpoints: [
      'GET /api/health',
      'GET /api/plans',
      'POST /api/send-confirmation',
      'POST /api/process-payment',
      'POST /api/contact-support',
      'POST /api/track-conversion',
      'GET /api/test-email'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     SpellRightPro Premium Backend Server            ║
║                                                      ║
║     🚀 Server running on port ${PORT}               ║
║     📧 Email service: ${process.env.EMAIL_SERVICE || 'Ethereal (test)'}
║     🌐 Environment: ${process.env.NODE_ENV || 'development'}
║     ⏰ Started: ${new Date().toLocaleString()}       ║
║                                                      ║
║     Endpoints:                                      ║
║     • Health: GET /api/health                       ║
║     • Plans: GET /api/plans                         ║
║     • Email: POST /api/send-confirmation            ║
║     • Payment: POST /api/process-payment            ║
║     • Support: POST /api/contact-support            ║
║     • Track: POST /api/track-conversion             ║
║     • Test Email: GET /api/test-email               ║
╚══════════════════════════════════════════════════════╝
  `);
  
  // Initialize email service
  await initializeTransporter();
  if (transporter) {
    console.log('✅ Email service initialized successfully');
  } else {
    console.log('⚠️  Email service not available - running in test mode');
  }
});

module.exports = app;
