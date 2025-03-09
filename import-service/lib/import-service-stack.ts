import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import path from "node:path";
import { Cors } from "aws-cdk-lib/aws-apigateway";
import { S3EventSourceV2 } from "aws-cdk-lib/aws-lambda-event-sources";

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
    
    bucket.grantPut(importProductsFile);
    bucket.grantRead(importProductsParser);
    bucket.grantReadWrite(importProductsParser);
    bucket.grantDelete(importProductsParser);

    importProductsParser.addEventSource(
      new S3EventSourceV2(bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: "uploaded/" }],
      })
    );

    const api = new apigateway.RestApi(this, "ImportProductsFileAPI", {
      restApiName: "Import Products Service",
      description: "This service allows importing products from CSV file",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    const importProducts = api.root.addResource("import");
    importProducts.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    new cdk.CfnOutput(this, "ImportServiceApi", {
      value: api.url,
    });
  }
}
