import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import path from "node:path";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
      this,
      "ImportProductsBucketExisting",
      "lambda-s3-integration-practice"
    );

    const environment = {
      BUCKET_NAME: bucket.bucketName,
    };

    const layers = [
      new lambda.LayerVersion(this, "NodeJsLayer", {
        code: lambda.Code.fromAsset(path.join(__dirname, "../layers")),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: "Dependencies layer",
      }),
    ];

    const importProductsFile = new lambda.Function(this, "ImportProductsFile", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/importProductsFile.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
      environment,
      layers,
    });

    bucket.grantPut(importProductsFile);

    const importProductsParser = new lambda.Function(
      this,
      "ImportProductsParser",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handlers/importProductsParser.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
        environment,
        layers,
      }
    );

    bucket.grantRead(importProductsParser);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importProductsParser),
      { prefix: "uploaded/" }
    );

    const api = new apigateway.LambdaRestApi(this, "ImportProductsFileAPI", {
      handler: importProductsFile,
      restApiName: "Import Products Service",
      description: "This service allows importing products from CSV file",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      proxy: false,
    });

    const importProducts = api.root.addResource("import");
    importProducts.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile)
    );
  }
}
