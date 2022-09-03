import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, FirelensConfigFileType, FirelensLogRouterType, ListenerConfig, LogDrivers } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { join, resolve } from "path";

export interface IHisamaGamedayEcsXray extends StackProps{
    vpc: Vpc
}

export class HisamaGamedayEcsXray extends Stack {
    private clusterName: string = 'hisama-gameday-with-xray'
    private appContainerName: string = 'appContainer'

    constructor(scope: Construct, id: string, props: IHisamaGamedayEcsXray){
        super(scope, id, props)
        const cluster = new Cluster(this, this.clusterName, {
            vpc: props.vpc,
            clusterName: this.clusterName,
            containerInsights: true
        })
        const taskDef =  new FargateTaskDefinition(this, 'taskDefinition', {})
        taskDef.addContainer('app-container', {
            containerName: this.appContainerName,
            image: ContainerImage.fromDockerImageAsset(new DockerImageAsset(this, 'pythonapp',{
                directory: join(resolve(__dirname, '../'), 'pythonapp')
            })),
            logging: LogDrivers.firelens({
                options: {
                    "Name": 'cloudwatch',
                    "log_group_name": 'hisama-pythonapp',
                    "log_stream_prefix": "pythonapp",
                    "auto_create_group": "true",
                    "region": this.region
                }
            }),
            portMappings: [
                {containerPort: 80}
            ]
        })
        taskDef.addContainer('xray-daemon', {
            containerName: 'xray-daemon',
            image: ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon'),
            logging: LogDrivers.firelens({
                options: {
                    "Name": 'cloudwatch',
                    "log_group_name": 'hisama-xray-from-firelens',
                    "log_stream_prefix": "hisama-xray",
                    "auto_create_group": "true",
                    "region": this.region
                }
            }),
            portMappings: [{containerPort: 2000}]
        })
        taskDef.taskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'))
        const service = new FargateService(this, 'fragate-service', {
            cluster,
            taskDefinition: taskDef,
            enableExecuteCommand: true
        })
        const alb = new ApplicationLoadBalancer(this, 'pythonapp-with-xray-alb', {
            vpc: props.vpc,
            internetFacing:true,
            loadBalancerName: 'alb-xray-app'
        })
        const httpListener = alb.addListener('Listener', {
            port: 80
        })
        service.registerLoadBalancerTargets({
            containerName: this.appContainerName,
            containerPort: 80,
            listener: ListenerConfig.applicationListener(httpListener, {
                protocol: ApplicationProtocol.HTTP
            }),
            newTargetGroupId: 'ECS'
        })
    }
}