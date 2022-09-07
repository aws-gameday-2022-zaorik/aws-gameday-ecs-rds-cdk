import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  ListenerConfig,
  LogDrivers,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { join, resolve } from "path";

export interface IGamedayEcs extends StackProps {
  vpc: Vpc;
}

export class GamedayEcs extends Stack {
  private clusterName: string = "gameday-cluster";
  private appContainerName: string = "appContainer";

  constructor(scope: Construct, id: string, props: IGamedayEcs) {
    super(scope, id, props);
    const cluster = new Cluster(this, this.clusterName, {
      vpc: props.vpc,
      clusterName: this.clusterName,
      containerInsights: true,
    });
    const taskDef = new FargateTaskDefinition(this, "taskDefinition", {});
    taskDef.addContainer("app-container", {
      containerName: this.appContainerName,
      image: ContainerImage.fromDockerImageAsset(
        new DockerImageAsset(this, "nginx-stdout", {
          directory: join(resolve(__dirname, "../../"), "nginx"),
        })
      ),
      logging: LogDrivers.firelens({
        options: {
          Name: "cloudwatch",
          log_group_name: "nginx-from-firelens",
          log_stream_prefix: "from-app",
          auto_create_group: "true",
          region: this.region,
        },
      }),
      portMappings: [{ containerPort: 80 }],
    });
    const service = new FargateService(this, "fragate-service", {
      cluster,
      taskDefinition: taskDef,
      enableExecuteCommand: true,
    });
    const alb = new ApplicationLoadBalancer(this, "app-alb", {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: "alb-stdout-app",
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
