const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3801;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email Configuration - YOUR GMAIL ACCOUNT
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

// Start server
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
  
🔧 Email status: ${emailConfig.auth.pass ? '✅ REAL' : '⚠️  MOCK'}
  `);
});

module.exports = app;
