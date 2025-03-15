import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import path from "path";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscription from "aws-cdk-lib/aws-sns-subscriptions";

const EMAIL = "maksim20051708@gmail.com";         // You can use your account to test it
const EMAIL_TITLE = "maksim20251708@gmail.com";   // You can use your account to test it
const EMAIL_PRICE = "linqek1029@gmail.com";       // You can use your account to test it
const EMAIL_DESCRIPTION = "kasiygigi@gmail.com";  // You can use your account to test it

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SQS

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemQueue", {
      queueName: "catalog-items-queue",
      visibilityTimeout: cdk.Duration.seconds(120),
    });

    // SNS

    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    createProductTopic.addSubscription(
      new snsSubscription.EmailSubscription(EMAIL)
    );

    createProductTopic.addSubscription(
      new snsSubscription.EmailSubscription(EMAIL_TITLE, {
        filterPolicy: {
          title: sns.SubscriptionFilter.stringFilter({
            allowlist: ["Special"],
          }),
        },
      })
    );

    createProductTopic.addSubscription(
      new snsSubscription.EmailSubscription(EMAIL_PRICE, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({ greaterThan: 100 }),
        },
      })
    );

    // For users wanting to buy something of Limited Edition
    createProductTopic.addSubscription(
      new snsSubscription.EmailSubscription(EMAIL_DESCRIPTION, {
        filterPolicy: {
          description: sns.SubscriptionFilter.stringFilter({
            allowlist: ["Limited Edition"],
          }),
        },
      })
    );

    // DynamoDB tables

    const productsTable = dynamo.Table.fromTableName(
      this,
      "productsTable",
      "products"
    );

    const stocksTable = dynamo.Table.fromTableName(
      this,
      "stocksTable",
      "stocks"
    );

    // Inner evironment for lambda functions

    const environment = {
      PRODUCTS_TABLE: productsTable.tableName,
      STOCKS_TABLE: stocksTable.tableName,
      SNS_TOPIC_ARN: createProductTopic.topicArn,
    };

    const layers = [
      new lambda.LayerVersion(this, "NodeJsLayer", {
        code: lambda.Code.fromAsset(path.join(__dirname, "../layers")),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: "Dependencies layer",
      }),
    ];

    // Lambda functions

    const getProductsList = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
      environment,
      layers,
    });

    const getProductById = new lambda.Function(this, "getProductById", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
      environment,
      layers,
    });

    const createProduct = new lambda.Function(this, "createProduct", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createProduct.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
      environment,
      layers,
    });

    const catalogBatchProcess = new lambda.Function(
      this,
      "catalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "catalogBatchProcess.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../dist/handlers")),
        environment,
        layers,
      }
    );

    // Gateway

    const api = new apigateway.RestApi(this, "products-api", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST"],
        allowCredentials: true,
        allowHeaders: ["*"],
      },
    });

    // Grant access to DynamoDB

    productsTable.grantReadWriteData(getProductsList);
    stocksTable.grantReadWriteData(getProductsList);
    productsTable.grantReadWriteData(getProductById);
    stocksTable.grantReadWriteData(getProductById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);

    // Integrate with gateway

    const products = api.root.addResource("products");
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList)
    );
    products.addMethod("POST", new apigateway.LambdaIntegration(createProduct));

    new cdk.CfnOutput(this, "ProductsListURL", {
      value: `${api.url}products`,
      description: "The URL of the Products List",
    });

    const product = products.addResource("{productId}");
    product.addMethod("GET", new apigateway.LambdaIntegration(getProductById));

    new cdk.CfnOutput(this, "ProductByIdURL", {
      value: `${api.url}products/{productId}`,
      description: "The URL of the Product by ID",
    });

    // Integrate Lambda with SQS

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Integrate Lambda with SNS
    createProductTopic.grantPublish(catalogBatchProcess);

    new cdk.CfnOutput(this, "CreateProductTopicARN", {
      value: createProductTopic.topicArn,
      description: "SNS Topic ARN",
    });
  }
}
