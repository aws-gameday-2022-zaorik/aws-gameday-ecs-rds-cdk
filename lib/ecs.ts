import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository, TagMutability } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, FirelensConfigFileType, FirelensLogRouterType, ListenerConfig, LogDrivers } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { dirname, join, resolve } from "path";

export class HisamaGamedayEcs extends Stack {
    private ecrName: string = 'hisama-gameday-ecr'
    private clusterName: string = 'hisama-gameday-cluster'
    private appContainerName: string = 'appContainer'

    constructor(scope: Construct, id: string, props?: StackProps){
        super(scope, id, props)
        new Repository(this, this.ecrName, {
            repositoryName: this.ecrName,
            removalPolicy: RemovalPolicy.DESTROY,
            imageTagMutability: TagMutability.IMMUTABLE
        })
        const vpc = Vpc.fromLookup(this, 'lookup-vpc', {
            vpcId: StringParameter.valueFromLookup(this, 'hisama-gameday-vpc-id')
        })
        const cluster = new Cluster(this, this.clusterName, {
            vpc,
            clusterName: this.clusterName,
            containerInsights: true
        })
        const taskDef =  new FargateTaskDefinition(this, 'taskDefinition', {})
        taskDef.addContainer('app-container', {
            containerName: this.appContainerName,
            image: ContainerImage.fromDockerImageAsset(new DockerImageAsset(this, 'nginx-stdout',{
                directory: join(resolve(__dirname, '../'), 'nginx')
            })),
            logging: LogDrivers.firelens({
                options: {
                    "Name": 'cloudwatch',
                    "log_group_name": 'hisama-nginx-from-firelens',
                    "log_stream_prefix": "from-app",
                    "auto_create_group": "true",
                    "region": this.region
                }
            }),
            portMappings: [
                {containerPort: 80}
            ],
            // environment: { "name" : "AWS_XRAY_DAEMON_ADDRESS", "value" : "xray-daemon:2000" }
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
        
        // ローカルファイルにログを出すアプリのログを拾うfirelens
        // どこのディレクトリにログを出力しているかecs-execやDockerfileから読み取る必要があるのでめんどう
        // taskDef.addFirelensLogRouter('firelens-for-local-log', {
        //     firelensConfig: {
        //         type: FirelensLogRouterType.FLUENTBIT,
        //         options: {
        //             configFileType: FirelensConfigFileType.FILE,
        //             configFileValue: '/fluent-bit/etc/logDestinations.conf'
        //         }
        //     },
        //     image: ContainerImage.fromDockerImageAsset(
        //         new DockerImageAsset(this, 'fluentbit-for-local-logfile',{
        //             directory: join(resolve(__dirname, '../'), 'fluentbit', 'locallog')
        //         })
        //     )
        // })
        const service = new FargateService(this, 'fragate-service', {
            cluster,
            taskDefinition: taskDef,
            enableExecuteCommand: true
        })
        const alb = new ApplicationLoadBalancer(this, 'app-alb', {
            vpc,
            internetFacing:true
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