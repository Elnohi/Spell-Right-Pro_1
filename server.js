const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS (correct placement)
app.use(cors({
  origin: [
    'https://www.spellrightpro.org',
    'https://spellrightpro.org'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());

// ✅ Middleware
app.use(express.json());

// ✅ PORT (ONLY ONCE)
const PORT = process.env.PORT || 8080;

// ✅ Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).send("SpellRightPro API is running");
});

// ✅ TEST
app.get("/test", (req, res) => {
  res.send("API working");
});

// ✅ ✅ CORRECT ENDPOINT (MATCH FRONTEND)
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { plan, email } = req.body;

    // 🔥 Map plans to Stripe price IDs
    const priceMap = {
      school: process.env.STRIPE_PRICE_SCHOOL,
      complete: process.env.STRIPE_PRICE_COMPLETE,
      family: process.env.STRIPE_PRICE_FAMILY
    };

    const priceId = priceMap[plan];

    if (!priceId) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: "https://spellrightpro.org/success.html",
      cancel_url: "https://spellrightpro.org/premium.html"
    });

    // ✅ IMPORTANT: match frontend expectation
    res.json({
      success: true,
      sessionUrl: session.url
    });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ✅ Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
