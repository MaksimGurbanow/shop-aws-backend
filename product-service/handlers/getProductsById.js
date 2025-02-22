module.exports.handler = async (event) => {
  const { mockProducts } = require("../data/mockProducts");
  const { productId } = event.pathParameters;
  const product = mockProducts.find((product) => product.id === productId);
  if (!product) {
    return {
      statusCode: 404,
      body: JSON.stringify(
        {
          message: `Product with id ${productId} not found`,
        },
        null,
        2
      ),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify(
      product,
      null,
      2
    ),
  };
}