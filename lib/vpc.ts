import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class GamedayVpc extends Stack {
  public readonly vpc: Vpc;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, "gameday-vpc", {
      cidr: "10.0.0.0/16",
    });
    new StringParameter(this, "vpcId", {
      stringValue: this.vpc.vpcId,
      parameterName: "vpcId",
    });
    new CfnOutput(this, "vpcIdCfnOutput", {
      exportName: "vpcId",
      value: this.vpc.vpcId,
    });
  }
}
