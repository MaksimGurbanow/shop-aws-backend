import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import path from "path";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    const environment = {
      PRODUCTS_TABLE: productsTable.tableName,
      STOCKS_TABLE: stocksTable.tableName,
    };

    const layers = [
      new lambda.LayerVersion(this, "NodeJsLayer", {
        code: lambda.Code.fromAsset(path.join(__dirname, "../layers")),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: "Dependencies layer",
      }),
    ];

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

    const api = new apigateway.RestApi(this, "products-api", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST"],
        allowCredentials: true,
        allowHeaders: ["*"],
      },
    });

    productsTable.grantReadWriteData(getProductsList);
    stocksTable.grantReadWriteData(getProductsList);
    productsTable.grantReadWriteData(getProductById);
    stocksTable.grantReadWriteData(getProductById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);

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
  }
}
