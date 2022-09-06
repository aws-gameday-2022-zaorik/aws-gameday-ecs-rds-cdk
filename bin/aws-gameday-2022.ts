#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsGameday2022StackHisama } from "../lib/aws-gameday-2022-stack";
import { HisamaVpc } from "../lib/vpc";
import { HisamaGamedayEcs } from "../lib/ecs-stdout";
import { HisamaGamedayEcsXray } from "../lib/ecs-xray";
import { HisamaGamedayEcsLocalLog } from "../lib/ecs-locallog";
import { HisamaGamedayEcsOnEc2 } from "../lib/ecs-on-ec2";

const app = new cdk.App();
const vpcStack = new HisamaVpc(app, "HisamaGamedayVpc", {});

const ecsStack = new HisamaGamedayEcs(app, "HisamaGamedayECS", {
  vpc: vpcStack.vpc,
});
ecsStack.addDependency(vpcStack);

const ecsXrayStack = new HisamaGamedayEcsXray(app, "HisamaGamedayEcsXray", {
  vpc: vpcStack.vpc,
});
ecsXrayStack.addDependency(vpcStack);

const ecsLocalLog = new HisamaGamedayEcsLocalLog(
  app,
  "HisamaGamedayEcsLocalLog",
  {
    vpc: vpcStack.vpc,
  }
);
ecsLocalLog.addDependency(vpcStack);

const ecsOnEc2 = new HisamaGamedayEcsOnEc2(app, "HisamaGamedayEcsOnEc2", {
  vpc: vpcStack.vpc,
});
ecsOnEc2.addDependency(vpcStack);

new AwsGameday2022StackHisama(app, "AwsGameday2022StackHisama", {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
