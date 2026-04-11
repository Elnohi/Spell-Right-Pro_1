const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS config
app.use(cors({
  origin: [
    "https://www.spellrightpro.org",
    "https://spellrightpro.org"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Handle preflight
app.options("/api/create-checkout-session", cors());

// ✅ Middleware
app.use(express.json());

// ✅ Stripe
let stripe;
try {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
} catch (err) {
  console.error("Stripe init error:", err.message);
}

// ✅ Health check
app.get("/", (req, res) => {
  res.send("SpellRightPro API is running");
});

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("API working");
});

// ✅ Stripe checkout route
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send("Stripe not initialized");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_COMPLETE,
          quantity: 1,
        },
      ],
      success_url: "https://www.spellrightpro.org/success",
      cancel_url: "https://www.spellrightpro.org/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).send("Stripe error");
  }
});

// ✅ Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
