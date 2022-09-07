import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  FirelensConfigFileType,
  FirelensLogRouterType,
  ListenerConfig,
  LogDrivers,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { join, resolve } from "path";

export interface IGamedayEcsLocalLog extends StackProps {
  vpc: Vpc;
}
export class GamedayEcsLocalLog extends Stack {
  private clusterName: string = "gameday-cluster-locallog";
  private appContainerName: string = "appContainer";
  private logVolumeName: string = "log-volume";
  private containerPath: string = "/var/log/nginx";

  constructor(scope: Construct, id: string, props: IGamedayEcsLocalLog) {
    super(scope, id, props);
    const cluster = new Cluster(this, this.clusterName, {
      vpc: props.vpc,
      clusterName: this.clusterName,
      containerInsights: true,
    });
    const taskDef = new FargateTaskDefinition(this, "taskDefinition", {});
    //   DockerHubから取得したNginxコンテナを使用
    //   /var/log/nginx/access.logにログを出力する
    const appContainer = taskDef.addContainer("app-container", {
      containerName: this.appContainerName,
      image: ContainerImage.fromRegistry("public.ecr.aws/nginx/nginx"),
      logging: LogDrivers.firelens({}),
      portMappings: [{ containerPort: 80 }],
    });
    //   firelensコンテナとログディレクトリを共有するためボリュームを設定しマウント
    taskDef.addVolume({
      name: this.logVolumeName,
    });
    appContainer.addMountPoints({
      readOnly: false,
      containerPath: this.containerPath,
      sourceVolume: this.logVolumeName,
    });
    // ローカルファイルにログを出すアプリのログを拾うfirelens
    // どこのディレクトリにログを出力しているかecs-execやDockerfileから読み取る必要があるのでめんどう
    const logRouter = taskDef.addFirelensLogRouter("firelens-for-local-log", {
      firelensConfig: {
        type: FirelensLogRouterType.FLUENTBIT,
        options: {
          configFileType: FirelensConfigFileType.FILE,
          configFileValue: "/fluent-bit/etc/logDestinations.conf",
        },
      },
      image: ContainerImage.fromDockerImageAsset(
        new DockerImageAsset(this, "fluentbit-for-local-logfile", {
          directory: join(
            resolve(__dirname, "../../"),
            "fluentbit",
            "locallog"
          ),
        })
      ),
      logging: LogDrivers.awsLogs({
        streamPrefix: "firelens-for-locallog",
      }),
    });
    //   firelensからもボリュームをマウント
    logRouter.addMountPoints({
      readOnly: true,
      containerPath: this.containerPath,
      sourceVolume: this.logVolumeName,
    });
    taskDef.taskRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess")
    );
    const service = new FargateService(this, "fragate-service", {
      cluster,
      taskDefinition: taskDef,
      enableExecuteCommand: true,
    });
    const alb = new ApplicationLoadBalancer(this, "app-alb", {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: "alb-local-log-app",
    });
    const httpListener = alb.addListener("Listener", {
      port: 80,
    });
    service.registerLoadBalancerTargets({
      containerName: this.appContainerName,
      containerPort: 80,
      listener: ListenerConfig.applicationListener(httpListener, {
        protocol: ApplicationProtocol.HTTP,
      }),
      newTargetGroupId: "ECS",
    });
  }
}
