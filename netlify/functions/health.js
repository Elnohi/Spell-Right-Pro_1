exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "healthy",
      service: "SpellRightPro Premium API",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    })
  };
};
