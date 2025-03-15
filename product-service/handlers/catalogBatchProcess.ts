import { SQSEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dbClient = new DynamoDBClient({});
const snsClient = new SNSClient({});

export const handler = async (event: SQSEvent) => {
  try {
    console.log("Received SQS messages:", JSON.stringify(event));

    const productPromises = event.Records.map(async (record) => {
      const body = JSON.parse(record.body);
      
      const { title, description, price, count } = body;

      await dbClient.send(
        new PutItemCommand({
          TableName: process.env.PRODUCTS_TABLE,
          Item: {
            id: { S: record.messageId },
            title: { S: title },
            description: { S: description },
            price: { N: price.toString() },
          },
        })
      );

      await dbClient.send(
        new PutItemCommand({
          TableName: process.env.STOCKS_TABLE,
          Item: {
            productId: { S: record.messageId },
            count: { N: count.toString() },
          },
        })
      );

      await snsClient.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: JSON.stringify({
            title,
            description,
            price,
          }),
          MessageAttributes: {
            title: { DataType: "String", StringValue: title },
            price: { DataType: "Number", StringValue: price.toString() },
            description: { DataType: "String", StringValue: description },
          },
        })
      );

      console.log(`Product ${title} created and published to SNS`);
    });

    await Promise.all(productPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Batch processed successfully!",
      }),
    };
  } catch (error) {
    console.error("Error processing batch:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};
