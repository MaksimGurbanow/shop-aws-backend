import { SQSEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });
const snsClient = new SNSClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  try {
    console.log("SQS Event Received:", JSON.stringify(event, null, 2));

    const products = [];

    for (const record of event.Records) {
      const product = JSON.parse(record.body);

      const putCommand = new PutItemCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Item: {
          id: { S: product.id },
          title: { S: product.title },
          description: { S: product.description },
          price: { N: product.price.toString() },
          count: { N: product.count.toString() },
        },
      });

      await dynamoDb.send(putCommand);
      products.push(product);
    }

    if (products.length > 0) {
      const snsMessage = {
        Subject: "New Products Created",
        Message: JSON.stringify({
          message: "New products have been added",
          products,
        }),
        TopicArn: process.env.SNS_TOPIC_ARN,
      };

      await snsClient.send(new PublishCommand(snsMessage));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Products added and SNS event sent" }),
    };
  } catch (error) {
    console.error("Error processing SQS event:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
