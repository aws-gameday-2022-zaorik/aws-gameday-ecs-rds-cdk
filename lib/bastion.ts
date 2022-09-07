import { Stack } from "aws-cdk-lib";
import {
  BastionHostLinux,
  InstanceClass,
  InstanceSize,
  InstanceType,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { RdsProps } from "./rds/rds-interface";

export class Bastion extends Stack {
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);
    new BastionHostLinux(this, "bastion", {
      vpc: props.vpc,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
    });
  }
}
