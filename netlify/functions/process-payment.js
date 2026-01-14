exports.handler = async (event) => {
  try {
    const { plan, customerEmail } = JSON.parse(event.body || "{}");

    if (!plan || !customerEmail) {
      return { statusCode: 400, body: "Missing data" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transactionId: `SRP-${Date.now()}`
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
