const premiumPlans = {
  school: {
    name: "School Premium",
    price: 4.99,
    features: ["Unlimited school words", "Save 50 custom lists"]
  },
  complete: {
    name: "Complete Premium",
    price: 8.99,
    features: ["All features", "Unlimited custom word lists"]
  },
  family: {
    name: "Family Plan",
    price: 14.99,
    features: ["Up to 5 users", "Family dashboard"]
  }
};

exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      currency: "USD",
      plans: premiumPlans
    })
  };
};
