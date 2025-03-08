import { S3Event, S3Handler } from "aws-lambda";
import { S3 } from "aws-sdk";
import csv from "csv-parser";

const s3 = new S3();

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = record.s3.object.key;

    console.log(`Processing file: s3://${bucketName}/${objectKey}`);

    const s3Stream = s3
      .getObject({ Bucket: bucketName, Key: objectKey })
      .createReadStream();

    await new Promise<void>((resolve, reject) => {
      s3Stream
        .pipe(csv())
        .on("data", (data) => console.log("Parsed record:", data))
        .on("end", () => {
          console.log("CSV parsing completed.");
          resolve();
        })
        .on("error", (error) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        });
    });
  }
};
