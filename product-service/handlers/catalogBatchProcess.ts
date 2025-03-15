import { SQSEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuid } from "uuid";
import { validateProduct } from "./validateProduct";

const dbClient = new DynamoDBClient({});
const snsClient = new SNSClient({});

export const handler = async (event: SQSEvent) => {
  console.log("Received SQS messages:", JSON.stringify(event));

  const errors: any[] = [];

  const productPromises = event.Records.map(async (record) => {
    try {
      const body = JSON.parse(record.body);
      const validationError = validateProduct(body);

      if (validationError) {
        console.error("Validation failed:", validationError);
        errors.push({ body, error: validationError });
        return; // Skip processing invalid product
      }

      const { title, description, price, count } = body;
      const newProductId = uuid();

      // Store product in DynamoDB
      await dbClient.send(
        new PutItemCommand({
          TableName: process.env.PRODUCTS_TABLE,
          Item: {
            id: { S: newProductId },
            title: { S: title },
            description: { S: description },
            price: { N: price.toString() },
          },
        })
      );

      // Store stock data
      await dbClient.send(
        new PutItemCommand({
          TableName: process.env.STOCKS_TABLE,
          Item: {
            product_id: { S: newProductId },
            count: { N: count.toString() },
          },
        })
      );

      // Publish notification to SNS
      await snsClient.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: JSON.stringify({ title, description, price }),
          MessageAttributes: {
            title: { DataType: "String", StringValue: title },
            price: { DataType: "Number", StringValue: price.toString() },
            description: { DataType: "String", StringValue: description },
            count: { DataType: "Number", StringValue: count.toString() },
          },
        })
      );

      console.log(`Product ${title} created and published to SNS`);
    } catch (error: any) {
      console.error("Error processing product:", error);
      errors.push({ body: record.body, error: error.message });
    }
  });

  await Promise.all(productPromises);

  if (errors.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Some products failed validation or processing",
        errors,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Batch processed successfully!",
    }),
  };
};
