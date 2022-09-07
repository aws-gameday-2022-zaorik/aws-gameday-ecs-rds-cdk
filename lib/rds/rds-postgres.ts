import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { RdsProps } from "./rds-interface";

export class RdsPostgres extends Stack {
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);
    const importBucket = new Bucket(this, "ImportBucket", {});
    const secGrp = new SecurityGroup(this, "postgresSecGrp", {
      vpc: props.vpc,
    });
    secGrp.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(5432));

    //   m5.large
    new DatabaseInstance(this, "RdsForPostgres", {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14_3,
      }),
      vpc: props.vpc,
      cloudwatchLogsExports: ["postgresql"],
      removalPolicy: RemovalPolicy.DESTROY,
      enablePerformanceInsights: true,
      multiAz: true,
      maxAllocatedStorage: 200,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },
      monitoringInterval: Duration.minutes(1),
      s3ImportBuckets: [importBucket],
      securityGroups: [secGrp],
    });
  }
}
