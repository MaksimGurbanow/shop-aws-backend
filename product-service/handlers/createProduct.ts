import { description } from "./../layers/nodejs/node_modules/aws-sdk/clients/frauddetector.d";
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body!);
    if (
      !body.title ||
      !body.price ||
      typeof body.price !== "number" ||
      body.price <= 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Product data is invalid" }),
      };
    }
    console.group("Request");
    console.log(event);
    console.groupEnd();
    const productId = uuid();
    const transactCommand = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE,
            Item: {
              id: { S: productId },
              title: { S: body.title },
              price: { N: String(body.price) },
              description: { S: body.description ?? "" },
            },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE,
            Item: {
              product_id: { S: productId },
              count: { N: String(body.count ?? 0) },
            },
          },
        },
      ],
    });
    const response = await client.send(transactCommand);
    console.group("Response");
    console.log("response", response);
    console.groupEnd();
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          id: productId,
          title: body.title,
          price: body.price,
          description: body.description ?? "",
          count: body.count ?? 0,
        },
        null,
        2
      ),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal error", error }),
    };
  }
};
