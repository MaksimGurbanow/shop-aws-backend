import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { products } from "../data/products";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const productsToPut = products.map((product) => ({ ...product, id: uuidv4() }));

const dynamicStock: { product_id: string; count: number }[] = productsToPut.map(
  (product) => ({
    product_id: product.id,
    count: Math.floor(Math.random() * 100),
  })
);

export const main = async () => {
  try {
    const productsBatch = productsToPut.map((product) => ({
      PutRequest: { Item: product },
    }));
    const stocksBatch = dynamicStock.map((stock) => ({
      PutRequest: { Item: stock },
    }));

    const productsPutResponse = await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          products: productsBatch,
        },
      })
    );
    console.group("\x1b[32m%s\x1b[0m", "Products are added");
    console.log(productsPutResponse);
    console.groupEnd();

    const stockPutResponse = await docClient.send(
      new BatchWriteCommand({ RequestItems: { stocks: stocksBatch } })
    );
    console.group("\x1b[32m%s\x1b[0m", "Stock is added");
    console.log(stockPutResponse);
    console.groupEnd();
  } catch (error) {
    throw error;
  }
};

main()
  .then(() => console.log("Operation is successful"))
  .catch((error) => console.error("Operation failed:", error));
