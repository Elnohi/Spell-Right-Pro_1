const express = require("express");
const app = express();

// ✅ MUST use Cloud Run port
const PORT = process.env.PORT || 8080;

// ✅ Load Stripe safely
let stripe;
try {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
} catch (err) {
  console.error("Stripe init error:", err.message);
}

// ✅ Basic route (VERY IMPORTANT for health check)
app.get("/", (req, res) => {
  res.status(200).send("SpellRightPro API is running");
});

// ✅ Middleware AFTER webhook (important if you use it)
app.use(express.json());

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("API working");
});

// ✅ Example Stripe endpoint (safe)
app.post("/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).send("Stripe not initialized");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: "YOUR_PRICE_ID",
          quantity: 1,
        },
      ],
      success_url: "https://your-site.com/success",
      cancel_url: "https://your-site.com/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).send("Stripe error");
  }
});

// ✅ CRITICAL: Start server LAST

const PORT = process.env.PORT || 8080; // This is critical for Cloud Run
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
