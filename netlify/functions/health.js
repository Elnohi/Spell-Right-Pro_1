exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "healthy",
      service: "SpellRightPro Premium API",
      timestamp: new Date().toISOString()
    })
  };
};
