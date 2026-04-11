const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS FIRST (VERY IMPORTANT)
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      "https://www.spellrightpro.org",
      "https://spellrightpro.org"
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

// ✅ Handle preflight explicitly
app.options("/api/create-checkout-session", cors());

// ✅ JSON parser AFTER CORS
app.use(express.json());

// ✅ Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("API running");
});

// ✅ TEST
app.get("/test", (req, res) => {
  res.send("OK");
});

// ✅ CHECKOUT ROUTE (MATCH FRONTEND)
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { plan, email } = req.body;

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
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.spellrightpro.org/success.html",
      cancel_url: "https://www.spellrightpro.org/premium.html",
    });

    res.json({
      success: true,
      sessionUrl: session.url
    });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
