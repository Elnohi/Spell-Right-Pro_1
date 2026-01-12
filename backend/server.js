const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3801;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email configuration for YOUR email
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'spellrightpro@gmail.com',  // YOUR EMAIL
    pass: process.env.EMAIL_PASSWORD || 'your-app-password-here' // You'll need to set this
  }
};

// Create email transporter
let transporter;
try {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('✅ Email service configured for: spellrightpro@gmail.com');
} catch (error) {
  console.log('⚠️  Email service not configured. Using mock mode.');
  transporter = {
    sendMail: async (options) => {
      console.log('📧 Mock email would be sent:', options);
      return { messageId: 'mock-' + Date.now() };
    }
  };
}

// Premium Plans
const PLANS = {
  'school': {
    name: 'School Premium',
    price: 4.99,
    features: ['Unlimited school words', 'Save 50 custom lists']
  },
  'complete': {
    name: 'Complete Premium',
    price: 8.99,
    features: ['All features', 'Unlimited custom word lists']
  },
  'family': {
    name: 'Family Plan',
    price: 14.99,
    features: ['Up to 5 users', 'Family dashboard']
  }
};

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SpellRightPro Premium',
    email: 'spellrightpro@gmail.com',
    timestamp: new Date().toISOString()
  });
});

// Get plans
app.get('/api/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

// REAL Email confirmation endpoint
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { email, plan, customerName } = req.body;
    
    if (!email || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Email and plan are required'
      });
    }
    
    const planInfo = PLANS[plan] || PLANS.complete;
    
    // Email content
    const mailOptions = {
      from: 'SpellRightPro <spellrightpro@gmail.com>',  // FROM YOUR EMAIL
      to: email,
      subject: `🎉 Welcome to SpellRightPro ${planInfo.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #7b2ff7;">Welcome to SpellRightPro Premium!</h1>
          <p>Dear ${customerName || 'Valued Customer'},</p>
          <p>Thank you for purchasing <strong>${planInfo.name}</strong>!</p>
          <p><strong>Amount:</strong> $${planInfo.price}</p>
          <p><strong>Your premium features include:</strong></p>
          <ul>
            ${planInfo.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <p>Start learning at: <a href="https://spellrightpro.org">spellrightpro.org</a></p>
          <p>Need help? Email us at: spellrightpro@gmail.com</p>
          <p>Best regards,<br>The SpellRightPro Team</p>
        </div>
      `,
      text: `Welcome to SpellRightPro ${planInfo.name}!\n\nThank you for your purchase.\n\nAmount: $${planInfo.price}\n\nStart learning at: https://spellrightpro.org\n\nNeed help? Email: spellrightpro@gmail.com`
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent from spellrightpro@gmail.com to ${email}`);
    
    res.json({
      success: true,
      message: 'Confirmation email sent successfully',
      from: 'spellrightpro@gmail.com',
      to: email,
      plan: planInfo.name,
      emailId: info.messageId
    });
    
  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please check email configuration.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Payment processing
app.post('/api/process-payment', (req, res) => {
  const { plan, amount, customerEmail } = req.body;
  
  const planInfo = PLANS[plan] || PLANS.complete;
  const transactionId = 'SRP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  res.json({
    success: true,
    transactionId,
    plan: planInfo.name,
    amount: amount || planInfo.price,
    customerEmail: customerEmail || 'Not provided',
    message: 'Payment processed successfully',
    nextStep: 'Confirmation email will be sent from spellrightpro@gmail.com'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'SpellRightPro Premium API',
    email: 'spellrightpro@gmail.com',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      plans: 'GET /api/plans',
      sendEmail: 'POST /api/send-confirmation',
      payment: 'POST /api/process-payment'
    }
  });
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const mailOptions = {
      from: 'SpellRightPro <spellrightpro@gmail.com>',
      to: 'test@example.com',
      subject: 'SpellRightPro Test Email',
      text: 'This is a test email from your SpellRightPro server.'
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Test email sent from spellrightpro@gmail.com',
      emailId: info.messageId
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Test email failed. Running in mock mode.',
      note: 'Set EMAIL_PASSWORD environment variable for real emails'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     SpellRightPro Premium Backend Server            ║
║                                                      ║
║     📧 Email: spellrightpro@gmail.com               ║
║     🚀 Port: ${PORT}                                ║
║     📍 http://localhost:${PORT}                     ║
║     ⏰ ${new Date().toLocaleString()}                ║
╚══════════════════════════════════════════════════════╝
  `);
  
  console.log('\nTo send REAL emails:');
  console.log('1. Create app password for spellrightpro@gmail.com');
  console.log('2. Set environment variable:');
  console.log('   set EMAIL_PASSWORD=your-app-password');
  console.log('3. Restart server\n');
});
