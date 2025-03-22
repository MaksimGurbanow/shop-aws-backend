import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { S3Event, S3Handler } from "aws-lambda";
import { S3 } from "aws-sdk";
import csv from "csv-parser";

const s3 = new S3({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

const sendMessageToSQS = async (messageBody: any) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_URL,
    MessageBody: JSON.stringify(messageBody),
  });

  await sqsClient
    .send(command)
    .then((data) => console.log("SQS message:", data))
    .catch((err) => console.log("SQS error:", err));
};

export const handler: S3Handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const objectKey = record.s3.object.key;

      console.log(`Processing file: s3://${bucketName}/${objectKey}`);

      const s3Stream = s3
        .getObject({ Bucket: bucketName, Key: objectKey })
        .createReadStream();

      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(
            csv({
              mapHeaders: ({ header }) => header.trim().toLowerCase(),
              mapValues: ({ value, header }) => {
                if (/price/i.test(header)) {
                  return parseInt(value.trim());
                }
                if (/count/i.test(header)) {
                  return parseInt(value.trim());
                }
                return value.trim();
              },
            })
          )
          .on("data", async (data) => {
            console.log("Parsed record:", data);
            await sendMessageToSQS(data);
          })
          .on("end", () => {
            console.log("CSV parsing completed.");
            resolve();
          })
          .on("error", (error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          });
      });

      const copyStream = s3
        .copyObject({
          Bucket: bucketName,
          CopySource: `${bucketName}/${objectKey}`,
          Key: objectKey.replace("uploaded", "parsed"),
        })
        .createReadStream();

      await new Promise<void>((resolve, reject) => {
        copyStream.on("data", (data) => {
          // console.log("Copied record:", data);
        });
        copyStream.on("end", () => {
          // console.log("Copy completed.");
          resolve();
        });
        copyStream.on("error", (error) => {
          console.error("Error copying object:", error);
          reject(error);
        });
      });

      await s3
        .deleteObject({ Bucket: bucketName, Key: objectKey })
        .promise()
        .then(() => {
          // console.log(`File s3://${bucketName}/${objectKey} deleted.`);
        });
    }
  } catch (error) {
    console.error(error);
  }
};
