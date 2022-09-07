import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  DatabaseInstanceEngine,
  DatabaseInstanceFromSnapshot,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import { RdsProps } from "./rds-interface";

export class PostgresFromSnapshot extends Stack {
  // put snapshot identifier
  private readonly snapshotIdentifier: string = "postgres-snapshot";

  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);
    const secGrp = new SecurityGroup(this, "postgresSecGrp", {
      vpc: props.vpc,
    });
    secGrp.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(5432));

    new DatabaseInstanceFromSnapshot(this, "postgresFromSnapshot", {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14_3,
      }),
      snapshotIdentifier: this.snapshotIdentifier,
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
      securityGroups: [secGrp],
    });
  }
}
