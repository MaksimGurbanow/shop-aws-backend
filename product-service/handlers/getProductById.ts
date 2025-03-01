import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { productId } = event.pathParameters!;
  console.log("productId", productId);
  const productResponse = await dynamo.send(
    new QueryCommand({
      TableName: process.env.PRODUCTS_TABLE,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": productId },
    })
  );
  const product = productResponse.Items?.[0];
  const stockResponse = await dynamo.send(
    new QueryCommand({
      TableName: process.env.STOCKS_TABLE,
      KeyConditionExpression: "product_id = :id",
      ExpressionAttributeValues: { ":id": productId },
    })
  );
  const stock = stockResponse.Items?.[0];
  const mergedResponse = { ...product, count: stock?.count || 0 };
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
      body: JSON.stringify(mergedResponse, null, 2),
    };
  } catch (error: any) {
    if (error.message === `Unsupported method "${event.httpMethod}"`) {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
};
