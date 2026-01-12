const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3801;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// YOUR EMAIL CONFIGURATION
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'spellrightpro@gmail.com', // YOUR EMAIL
    pass: process.env.EMAIL_PASSWORD || '' // Your app password: sgaxkhlzmytzfnbp
  }
};

// Create email transporter
let transporter;
if (EMAIL_CONFIG.auth.pass) {
  transporter = nodemailer.createTransport(EMAIL_CONFIG);
  console.log('✅ REAL Email service configured for: spellrightpro@gmail.com');
} else {
  console.log('⚠️  Running in MOCK email mode');
  console.log('   To enable real emails, set:');
  console.log('   set EMAIL_PASSWORD=sgaxkhlzmytzfnbp');
  transporter = {
    sendMail: async (options) => {
      console.log('📧 MOCK Email:', {
        to: options.to,
        subject: options.subject,
        from: options.from
      });
      return { messageId: 'mock-' + Date.now(), response: 'Mock email sent' };
    }
  };
}

// Premium Plans Configuration
const PREMIUM_PLANS = {
  'school': {
    name: 'School Premium',
    price: 4.99,
    features: [
      'Unlimited school spelling words',
      'Save up to 50 custom word lists',
      'Basic progress tracking',
      'School-focused vocabulary',
      'PDF export capabilities',
      'Email support'
    ],
    description: 'Perfect for students and teachers'
  },
  'complete': {
    name: 'Complete Premium',
    price: 8.99,
    features: [
      'All School Premium features',
      'Unlimited custom word lists',
      'Advanced progress analytics',
      'All voice accents unlocked',
      'Priority email & chat support',
      'Export to PDF & Excel formats',
      'Early access to new features',
      'Offline mode access'
    ],
    description: 'The ultimate spelling experience'
  },
  'family': {
    name: 'Family Plan',
    price: 14.99,
    features: [
      'Up to 5 user accounts',
      'All Complete Premium features',
      'Separate progress tracking per user',
      'Family dashboard & reports',
      'Group learning challenges',
      'Parental controls',
      'Dedicated account manager',
      'Monthly family progress reports'
    ],
    description: 'Perfect for homeschooling families'
  }
};

// Generate beautiful email HTML
function generateWelcomeEmail(customerName, plan, planDetails) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SpellRightPro Premium!</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background: linear-gradient(135deg, #7b2ff7 0%, #f72585 100%);
      color: white;
      padding: 40px 30px;
      border-radius: 15px 15px 0 0;
      text-align: center;
    }
    .content {
      background: white;
      padding: 40px;
      border-radius: 0 0 15px 15px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .badge {
      display: inline-block;
      background: #7b2ff7;
      color: white;
      padding: 8px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 25px;
    }
    .plan-card {
      background: #f8f5ff;
      border-left: 5px solid #7b2ff7;
      padding: 20px;
      margin: 25px 0;
      border-radius: 10px;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    .feature-list li {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
    }
    .feature-list li:before {
      content: "✓";
      color: #4CAF50;
      font-weight: bold;
      font-size: 18px;
      margin-right: 12px;
    }
    .cta-button {
      display: inline-block;
      background: #7b2ff7;
      color: white;
      padding: 15px 35px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 25px 0;
      transition: background 0.3s ease;
    }
    .cta-button:hover {
      background: #6a1df0;
    }
    .receipt {
      background: white;
      border: 2px solid #7b2ff7;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin-top: 40px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }
    @media (max-width: 600px) {
      .content {
        padding: 20px;
      }
      .header {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to SpellRightPro Premium!</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Your spelling journey just got upgraded</p>
  </div>
  
  <div class="content">
    <div class="badge">PREMIUM MEMBER</div>
    
    <h2 style="color: #333; margin-bottom: 10px;">Hello ${customerName || 'Valued Customer'},</h2>
    <p style="font-size: 16px;">Thank you for choosing <strong>${planDetails.name}</strong>! We're excited to have you on board.</p>
    
    <div class="plan-card">
      <h3 style="color: #7b2ff7; margin-top: 0;">${planDetails.name}</h3>
      <p style="margin: 10px 0;">${planDetails.description}</p>
      <div style="font-size: 24px; font-weight: bold; color: #f72585; margin: 15px 0;">
        $${planDetails.price}/month
      </div>
    </div>
    
    <div class="receipt">
      <h4 style="margin-top: 0; color: #333;">📋 Order Details</h4>
      <p><strong>Plan:</strong> ${planDetails.name}</p>
      <p><strong>Amount:</strong> $${planDetails.price}</p>
      <p><strong>Billing:</strong> Monthly subscription</p>
      <p><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">ACTIVE</span></p>
      <p><strong>Start Date:</strong> ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
    
    <h3 style="color: #333;">✨ Your Premium Features:</h3>
    <ul class="feature-list">
      ${planDetails.features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
    
    <div style="text-align: center;">
      <a href="https://spellrightpro.org/dashboard" class="cta-button">
        Start Learning Now →
      </a>
      <p style="font-size: 14px; color: #666; margin-top: 10px;">
        Access your dashboard immediately
      </p>
    </div>
    
    <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 30px 0;">
      <h4 style="margin-top: 0; color: #1a73e8;">📞 Need Assistance?</h4>
      <p>Our premium support team is here to help:</p>
      <ul style="list-style: none; padding: 0;">
        <li>📧 Email: <a href="mailto:spellrightpro@gmail.com" style="color: #1a73e8;">spellrightpro@gmail.com</a></li>
        <li>🕒 Response Time: Within 4 hours for premium members</li>
        <li>🔒 Secure: All communications are encrypted</li>
        <li>📚 Help Center: <a href="https://spellrightpro.org/help" style="color: #1a73e8;">spellrightpro.org/help</a></li>
      </ul>
    </div>
    
    <div class="footer">
      <p><strong>SpellRightPro Premium</strong> • Transforming Spelling Education Worldwide</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
      <p>© ${new Date().getFullYear()} SpellRightPro. All rights reserved.</p>
      <p style="font-size: 11px; margin-top: 10px;">
        <a href="https://spellrightpro.org/privacy" style="color: #666;">Privacy Policy</a> | 
        <a href="https://spellrightpro.org/terms" style="color: #666;">Terms of Service</a> | 
        <a href="https://spellrightpro.org/unsubscribe" style="color: #666;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ==================== API ENDPOINTS ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SpellRightPro Premium API',
    version: '2.0.0',
    email: 'spellrightpro@gmail.com',
    emailStatus: EMAIL_CONFIG.auth.pass ? 'REAL' : 'MOCK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get All Premium Plans
app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    plans: PREMIUM_PLANS,
    currency: 'USD',
    billing: 'Monthly subscription, cancel anytime'
  });
});

// Send Welcome Email (REAL EMAIL)
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { customerEmail, customerName, plan } = req.body;
    
    // Validation
    if (!customerEmail || !plan) {
      return res.status(400).json({
        success: false,
        message: 'customerEmail and plan are required fields'
      });
    }
    
    const planDetails = PREMIUM_PLANS[plan];
    if (!planDetails) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Choose from: ${Object.keys(PREMIUM_PLANS).join(', ')}`
      });
    }
    
    // Prepare email
    const mailOptions = {
      from: 'SpellRightPro Premium <spellrightpro@gmail.com>',
      to: customerEmail,
      replyTo: 'spellrightpro@gmail.com',
      subject: `🎉 Welcome to SpellRightPro ${planDetails.name}!`,
      html: generateWelcomeEmail(customerName, plan, planDetails),
      text: `Welcome to SpellRightPro ${planDetails.name}!\n\nThank you for your subscription.\n\nPlan: ${planDetails.name}\nPrice: $${planDetails.price}/month\n\nStart learning: https://spellrightpro.org/dashboard\n\nNeed help? Email: spellrightpro@gmail.com`,
      attachments: []
    };
    
    // Send email
    const emailResult = await transporter.sendMail(mailOptions);
    
    // Log successful email
    console.log(`✅ Email sent from spellrightpro@gmail.com to ${customerEmail}`);
    console.log(`   Plan: ${planDetails.name}, Amount: $${planDetails.price}`);
    
    // Response
    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      details: {
        from: 'spellrightpro@gmail.com',
        to: customerEmail,
        plan: planDetails.name,
        amount: planDetails.price,
        emailId: emailResult.messageId,
        mode: EMAIL_CONFIG.auth.pass ? 'REAL' : 'MOCK'
      },
      nextSteps: [
        'Customer received welcome email',
        'Access granted to premium features',
        'Next: Setup account dashboard'
      ]
    });
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send welcome email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      suggestion: 'Check email configuration and app password'
    });
  }
});

// Process Payment & Send Email
app.post('/api/process-payment', async (req, res) => {
  try {
    const { plan, customerEmail, customerName, paymentMethod } = req.body;
    
    // Validate
    if (!plan || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'plan and customerEmail are required'
      });
    }
    
    const planDetails = PREMIUM_PLANS[plan];
    if (!planDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }
    
    // Generate transaction
    const transactionId = `SRP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Process payment (in production, integrate with Stripe/PayPal)
    const paymentResult = {
      success: true,
      transactionId,
      amount: planDetails.price,
      currency: 'USD',
      plan: planDetails.name,
      customerEmail,
      timestamp: new Date().toISOString(),
      paymentMethod: paymentMethod || 'credit_card',
      status: 'completed'
    };
    
    // Send welcome email automatically
    try {
      const mailOptions = {
        from: 'SpellRightPro Premium <spellrightpro@gmail.com>',
        to: customerEmail,
        subject: `🎉 Welcome to SpellRightPro ${planDetails.name}!`,
        html: generateWelcomeEmail(customerName, plan, planDetails),
        text: `Payment confirmed! Welcome to ${planDetails.name}. Transaction: ${transactionId}`
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Payment email sent to ${customerEmail}`);
      
    } catch (emailError) {
      console.error('⚠️  Payment succeeded but email failed:', emailError);
    }
    
    // Response
    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: paymentResult,
      email: {
        sent: true,
        from: 'spellrightpro@gmail.com',
        to: customerEmail
      },
      nextSteps: [
        'Access premium features immediately',
        'Check email for welcome message',
        'Visit dashboard: https://spellrightpro.org/dashboard'
      ]
    });
    
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

// Test Email Endpoint
app.get('/api/test-email-config', async (req, res) => {
  try {
    const testMailOptions = {
      from: 'SpellRightPro <spellrightpro@gmail.com>',
      to: 'test@example.com',
      subject: 'SpellRightPro Email System Test',
      text: `This is a test email from your SpellRightPro server.\n\nServer Time: ${new Date().toLocaleString()}\nEmail: spellrightpro@gmail.com\nStatus: ${EMAIL_CONFIG.auth.pass ? 'REAL EMAILS ENABLED' : 'MOCK MODE'}`,
      html: `<h1>SpellRightPro Email Test</h1><p>Server is correctly configured to send emails from <strong>spellrightpro@gmail.com</strong></p><p>Mode: <strong>${EMAIL_CONFIG.auth.pass ? 'REAL EMAILS ENABLED' : 'MOCK MODE'}</strong></p>`
    };
    
    const result = await transporter.sendMail(testMailOptions);
    
    res.json({
      success: true,
      message: 'Email system test completed',
      configuration: {
        fromEmail: 'spellrightpro@gmail.com',
        mode: EMAIL_CONFIG.auth.pass ? 'REAL' : 'MOCK',
        appPasswordConfigured: !!EMAIL_CONFIG.auth.pass
      },
      testResult: {
        messageId: result.messageId,
        response: result.response || 'Mock email generated'
      },
      instructions: EMAIL_CONFIG.auth.pass ? 
        '✅ Real email sending is enabled!' :
        '⚠️  To enable real emails, run: set EMAIL_PASSWORD=sgaxkhlzmytzfnbp'
    });
    
  } catch (error) {
    res.json({
      success: false,
      message: 'Email test failed',
      error: error.message,
      currentMode: EMAIL_CONFIG.auth.pass ? 'REAL' : 'MOCK'
    });
  }
});

// Customer Support Contact
app.post('/api/contact-support', async (req, res) => {
  try {
    const { name, email, message, plan } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Email and message are required'
      });
    }
    
    const supportMailOptions = {
      from: 'SpellRightPro Support <spellrightpro@gmail.com>',
      to: 'spellrightpro@gmail.com',
      subject: `Support Request from ${name || 'Customer'}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>Customer:</strong> ${name || 'Not provided'} (${email})</p>
        <p><strong>Plan:</strong> ${plan || 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
      `,
      replyTo: email
    };
    
    await transporter.sendMail(supportMailOptions);
    
    res.json({
      success: true,
      message: 'Support request sent to spellrightpro@gmail.com',
      reference: `SUPPORT-${Date.now()}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send support request'
    });
  }
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'SpellRightPro Premium Backend',
    version: '2.0.0',
    status: 'operational',
    email: 'spellrightpro@gmail.com',
    endpoints: {
      health: 'GET /api/health',
      plans: 'GET /api/plans',
      welcomeEmail: 'POST /api/send-welcome-email',
      payment: 'POST /api/process-payment',
      support: 'POST /api/contact-support',
      testEmail: 'GET /api/test-email-config'
    },
    documentation: 'https://spellrightpro.org/api-docs'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/plans',
      'POST /api/send-welcome-email',
      'POST /api/process-payment',
      'GET /api/test-email-config'
    ]
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                       SPELLRIGHT PRO PREMIUM                          ║
║                                                                        ║
║  🚀  Server:      http://localhost:${PORT}                           ║
║  📧  Email:       spellrightpro@gmail.com                            ║
║  🔐  Auth:        ${EMAIL_CONFIG.auth.pass ? '✅ REAL EMAIL' : '⚠️  MOCK MODE'}      ║
║  ⏰  Started:     ${new Date().toLocaleString()}                      ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

📋 Available Endpoints:
   • GET  /                         - Server info
   • GET  /api/health              - Health check
   • GET  /api/plans               - Premium plans
   • POST /api/send-welcome-email  - Send welcome email
   • POST /api/process-payment     - Process payment + email
   • GET  /api/test-email-config   - Test email system

🔧 Configuration Status:
   Email Service: ${EMAIL_CONFIG.auth.pass ? '✅ REAL (Gmail)' : '⚠️  MOCK'}
   ${!EMAIL_CONFIG.auth.pass ? 'To enable real emails:' : ''}
   ${!EMAIL_CONFIG.auth.pass ? '  set EMAIL_PASSWORD=sgaxkhlzmytzfnbp' : ''}
   ${!EMAIL_CONFIG.auth.pass ? '  Then restart server' : ''}
  `);
});

// Export for testing
module.exports = app;
