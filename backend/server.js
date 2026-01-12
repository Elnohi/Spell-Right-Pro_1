const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3801;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email Configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'spellrightpro@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'sgaxkhlzmytzfnbp'
  }
};

let transporter;
if (EMAIL_CONFIG.auth.pass) {
  transporter = nodemailer.createTransport(EMAIL_CONFIG);
  console.log('✅ REAL Email service configured');
} else {
  console.log('⚠️  Running in MOCK email mode');
  transporter = {
    sendMail: async (options) => {
      console.log('Mock email:', options.to, options.subject);
      return { messageId: 'mock-' + Date.now() };
    }
  };
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SpellRightPro',
    email: 'spellrightpro@gmail.com',
    timestamp: new Date().toISOString()
  });
});

// Test email config
app.get('/api/test-email-config', (req, res) => {
  res.json({
    success: true,
    email: 'spellrightpro@gmail.com',
    mode: EMAIL_CONFIG.auth.pass ? 'REAL' : 'MOCK'
  });
});

// Send welcome email
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { customerEmail, customerName, plan } = req.body;
    
    const mailOptions = {
      from: 'SpellRightPro <spellrightpro@gmail.com>',
      to: customerEmail,
      subject: `Welcome to SpellRightPro ${plan}!`,
      text: `Hello ${customerName}, thank you for choosing ${plan}!`
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      from: 'spellrightpro@gmail.com',
      to: customerEmail,
      emailId: info.messageId
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'SpellRightPro API',
    version: '1.0.0',
    email: 'spellrightpro@gmail.com',
    endpoints: [
      'GET /api/health',
      'GET /api/test-email-config',
      'POST /api/send-welcome-email'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║     SpellRightPro Server Started     ║
║                                      ║
║     🚀 Port: ${PORT}                 ║
║     📧 Email: spellrightpro@gmail.com║
║     ⏰ ${new Date().toLocaleTimeString()} ║
╚══════════════════════════════════════╝
  `);
});
