import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { products } from "./products";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const productsResponse = await dynamo.send(
      new ScanCommand({ TableName: process.env.PRODUCTS_TABLE })
    );
    const products = productsResponse.Items || [];

    const stockResponse = await dynamo.send(
      new ScanCommand({ TableName: process.env.STOCKS_TABLE })
    );
    const stocks = stockResponse.Items || [];

    const mergedResponse = products.map((product) => {
      const stock = stocks.find((s) => s.product_id === product.id);
      return {
        ...product,
        count: stock ? stock.count : 0,
      };
    });
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(mergedResponse, null, 2),
    };
  } catch (error: any) {
    if (error.message === `Unsupported method "${event.httpMethod}"`) {
      return {
        statusCode: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: "Method Not Allowed",
      };
    }
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(error),
    };
  }
};
