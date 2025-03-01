import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { products } from "./products";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { productId } = event.pathParameters!;
  const product = products.find((product) => product.id === productId);
  try {
    if (!productId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "ProductId is required parameter" }),
      };
    }
    if (!product) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(product, null, 2),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
};
