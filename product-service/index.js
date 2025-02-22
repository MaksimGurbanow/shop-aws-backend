module.exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        input: event,
        message: "Just hello from product-service",
      },
      null,
      2
    ),
  };
};
