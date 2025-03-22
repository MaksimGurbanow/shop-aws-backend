#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImportServiceStack } from "../lib/import-service-stack";
import { ProductServiceStack } from "../lib/product-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";

const app = new cdk.App();

const authService = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack",
  {
    description: "Authoriation service stack",
  }
);

const productService = new ProductServiceStack(app, "ProductServiceStack", {
  description: "Product Service Stack",
});

const importService = new ImportServiceStack(app, "ImportServiceStack", {
  basicAuthorizerArn: authService.basicAuthorizerArn,
  queueArn: productService.catalogItemQueueArn,
});
