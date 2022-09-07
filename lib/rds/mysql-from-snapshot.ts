import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  DatabaseInstanceEngine,
  DatabaseInstanceFromSnapshot,
  MysqlEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import { RdsProps } from "./rds-interface";

export class MysqlFromSnapshot extends Stack {
  // put snapshot identifier
  private readonly snapshotIdentifier: string = "mysql-snapshot";

  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);
    const secGrp = new SecurityGroup(this, "mysqlSecGrp", { vpc: props.vpc });
    secGrp.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(3306));

    new DatabaseInstanceFromSnapshot(this, "mysqlFromSnapshot", {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0_28,
      }),
      snapshotIdentifier: this.snapshotIdentifier,
      vpc: props.vpc,
      cloudwatchLogsExports: ["error", "general", "slowquery"],
      //   本番のときはこれを消す
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
