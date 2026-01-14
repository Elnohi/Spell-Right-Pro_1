exports.handler = async (event) => {
  try {
    const { plan, customerEmail, customerName } = JSON.parse(event.body || "{}");

    if (!plan || !customerEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing plan or email" })
      };
    }

    const transactionId = `SRP-${Date.now()}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transaction: {
          id: transactionId,
          plan,
          customerEmail,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
