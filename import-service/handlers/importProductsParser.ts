import { S3Event } from "aws-lambda";

export const handler = async (event: S3Event) => {
  try {
    const s3 = event.Records[0].s3;
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `File ${s3.object.key} has been uploaded`,
      }),
    };
  } catch (error) {
    console.error(error);
  }
};
