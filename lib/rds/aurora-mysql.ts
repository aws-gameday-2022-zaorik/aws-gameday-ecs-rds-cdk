import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import {
  AuroraMysqlEngineVersion,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
} from "aws-cdk-lib/aws-rds";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { RdsProps } from "./rds-interface";

export class AuroraMysql extends Stack {
  private readonly auroraVersion2: AuroraMysqlEngineVersion =
    AuroraMysqlEngineVersion.VER_2_09_3;
  private readonly auroraVersion3: AuroraMysqlEngineVersion =
    AuroraMysqlEngineVersion.VER_3_02_0;

  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);
    //   AuroraMysqlのときのみ有効
    //   データベースへインポートするファイルがS3におかれてもらえる場合に使うイメージ
    //   何も考えずにインポートできる形式と信じてる…
    const s3ImportBuckets: Bucket = new Bucket(this, "importBucket", {
      bucketName: "import-bucket-for-rds",
    });
    const secGrp = new SecurityGroup(this, "auroraMysqlSecGrp", {
      vpc: props.vpc,
    });
    secGrp.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(3306));

    new DatabaseCluster(this, "AuroraMysql", {
      engine: DatabaseClusterEngine.auroraMysql({
        version: this.auroraVersion2,
      }),
      credentials: Credentials.fromGeneratedSecret("clusteradmin"), // Optional - will default to 'admin' username and generated password
      instanceProps: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.LARGE),
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        vpc: props.vpc,
        enablePerformanceInsights: true,
        securityGroups: [secGrp],
      },
      backtrackWindow: Duration.hours(3), // Aurora2の場合設定。Aurora3は未サポートだった気がする
      backup: {
        retention: Duration.days(5),
        preferredWindow: "21:00-22:00",
      },
      cloudwatchLogsExports: ["error", "general", "slowquery"],
      preferredMaintenanceWindow: "Sun:23:45-Mon:00:15",
      s3ImportBuckets: [s3ImportBuckets], // S3からデータをインポートする場合に利用する
      removalPolicy: RemovalPolicy.DESTROY, // 当日は消す。残っているとミスったときどえらいことに…
    });
  }
}
