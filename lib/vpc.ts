import { Stack, StackProps } from "aws-cdk-lib"
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class HisamaVpc extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = new Vpc(this, 'hisama-gameday-vpc', {
            cidr: "10.0.0.0/16"
        })
        new StringParameter(this, 'hisma-gameday-vpc-param', {
            parameterName: 'hisama-gameday-vpc-id',
            stringValue: vpc.vpcId
        })
    }
}