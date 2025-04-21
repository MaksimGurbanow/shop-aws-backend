import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  Callback,
} from "aws-lambda";

const USER_NAME = process.env.GITHUB_USERNAME || "";
const USER_PASSWORD = process.env.USER_PASSWORD || "";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context
): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log("Event", event);
    if (!event.authorizationToken) {
      throw new Error("Unathorized");
    }
    const { authorizationToken: encodedCredentials, methodArn } = event;
    const [tokenType, token] = encodedCredentials.split(" ");
    if (tokenType !== "Basic" || !token) {
      throw new Error("Unathorized");
    }

    const decodedCredentials = Buffer.from(token, "base64").toString("utf-8");
    const [username, password] = decodedCredentials.split(":");

    console.log(`Decoded credentials: ${username}:${password}`);
    const validPassword = USER_PASSWORD;

    const effect =
      !validPassword || validPassword !== password ? "Deny" : "Allow";
    console.log(effect, validPassword, password);
    if (effect === "Deny") {
      return {
        context: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        ...generatePolicy(USER_NAME, "Deny", event.methodArn),
      };
    }

    return {
      context: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
      },
      ...generatePolicy(encodedCredentials, "Allow", methodArn),
    };
  } catch (error: any) {
    console.log("Here is an Error:", error.message);
    if (error.message === "Unauthorized") {
      throw new Error("Unathorized");
    }
    return {
      context: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
      },
      ...generatePolicy(USER_NAME, "Deny", event.methodArn),
    };
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
