import { S3 } from "aws-sdk";
import { APIGatewayProxyEvent } from "aws-lambda";

const s3 = new S3({ region: "eu-west-1" });

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const filename = event.queryStringParameters?.name;
    if (!filename) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing "name" query parameter' }),
      };
    }

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `uploaded/${filename}`,
      ContentType: "text/csv",
      Expires: 120,
    };

    const signedURL = await s3.getSignedUrlPromise("putObject", params);

    return {
      statusCode: 200,
      body: JSON.stringify({ signedURL }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    }
  }
};
