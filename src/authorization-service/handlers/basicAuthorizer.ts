import { Effect } from "@aws-cdk/aws-iam";
import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  Callback,
} from "aws-lambda";
import * as dotenv from "dotenv";

dotenv.config();

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "";
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS || "";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context,
  cb: Callback<APIGatewayAuthorizerResult>
) => {
  try {
    console.log("Event", event);
    if (!event.authorizationToken) {
      console.log("No auth token provided");
      cb("Unauthorized");
      return;
    }
    const { authorizationToken: encodedCredentials, methodArn } = event;
    const [tokenType, token] = encodedCredentials.split(" ");
    if (tokenType !== "Basic" || !token) {
      console.log("Invalid token format.");
      cb("Unauthorized");
    }

    const decodedCredentials = Buffer.from(token, "base64").toString("utf-8");
    const [username, password] = decodedCredentials.split(":");

    console.log(`Decoded credentials: ${username}:******`);
    const validPassword = process.env[username];

    const effect =
      !validPassword || validPassword !== password ? "Deny" : "Allow";
    if (effect === "Deny") {
      cb("Forbidden");
      return;
    }

    if (methodArn !== "Allow" && methodArn !== "Deny") {
      cb("Forbidden");
      return;
    }

    const policy = generatePolicy(encodedCredentials, methodArn, effect);
    cb(null, policy);
  } catch (error: any) {
    console.log("Error:", error.message);
    if (error.message === "Unauthorized") {
      cb("Unauthorized");
    }
    cb("Forbidden");
  }
};

const generatePolicy = (
  principalId: string,
  effect: "Deny" | "Allow",
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
