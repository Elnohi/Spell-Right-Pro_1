const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { customerEmail, customerName, plan } = JSON.parse(event.body || "{}");

    if (!customerEmail || !plan) {
      return { statusCode: 400, body: "Missing required fields" };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: "SpellRightPro <spellrightpro@gmail.com>",
      to: customerEmail,
      subject: "🎉 Welcome to SpellRightPro Premium",
      html: `<h2>Welcome ${customerName || ""}</h2><p>Your ${plan} plan is active.</p>`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
