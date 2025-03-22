import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const layers = [
      new lambda.LayerVersion(this, "NodeJsLayer", {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../layers/authorization")
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: "Dependencies layer",
      }),
    ];
    const environment = {
      USER_NAME: process.env.USER_NAME || "",
      USER_PASSWORD: process.env.USER_PASSWORD || "",
    };

    const basicAuthorization = new lambda.Function(
      this,
      "BasicAuthorizationLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handlers/basicAuthorizer.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../dist/src/authorization-service/handlers")
        ),
        environment,
        layers,
        timeout: cdk.Duration.seconds(30),
        functionName: "basic-authorizer-maxim",
      }
    );

    this.basicAuthorizerArn = basicAuthorization.functionArn;

    new cdk.CfnOutput(this, "BasicAuthorizerArnOutput", {
      value: this.basicAuthorizerArn,
      description: "Basic Authorizer Lambda ARN",
      exportName: `basic-authorizer-maxim`,
    });
  }
}
