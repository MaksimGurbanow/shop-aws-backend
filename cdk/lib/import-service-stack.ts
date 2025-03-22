import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import path from "node:path";
import { Cors } from "aws-cdk-lib/aws-apigateway";
import { S3EventSourceV2 } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as dotenv from "dotenv";

dotenv.config();

export class ImportServiceStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps & { basicAuthorizerArn: string; queueArn: string }
  ) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(
      this,
      "ImportProductsBucketExisting",
      "lambda-s3-integration-practice"
    );

    const productQueue = sqs.Queue.fromQueueAttributes(
      this,
      "CatalogItemQueue",
      {
        queueArn: props?.queueArn || "",
        queueName: "catalog-items-queue",
      }
    );

    const environment = {
      BUCKET_NAME: bucket.bucketName,
      SQS_URL: productQueue.queueUrl,
    };

    const layers = [
      new lambda.LayerVersion(this, "NodeJsLayer", {
        code: lambda.Code.fromAsset(path.join(__dirname, "../layers/import")),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: "Dependencies layer",
      }),
    ];

    // LAMBDAS

    const importProductsFile = new lambda.Function(this, "ImportProductsFile", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handlers/importProductsFile.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../dist/src/import-service/handlers")
      ),
      environment,
      layers,
    });

    const importProductsParser = new lambda.Function(
      this,
      "ImportProductsParser",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handlers/importProductsParser.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../dist/src/import-service/handlers")
        ),
        environment,
        layers,
        timeout: cdk.Duration.seconds(30),
      }
    );

    bucket.grantPut(importProductsFile);
    bucket.grantRead(importProductsParser);
    bucket.grantReadWrite(importProductsParser);
    bucket.grantDelete(importProductsParser);
    productQueue.grantSendMessages(importProductsParser);

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
        allowHeaders: ["Content-Type", "Authorization"],
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
