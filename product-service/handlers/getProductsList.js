const { mockProducts } = require("../data/mockProducts");

module.exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      mockProducts,
      null,
      2
    ),
  };
};
