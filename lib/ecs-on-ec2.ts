import { Stack, StackProps } from "aws-cdk-lib";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { InstanceType, LaunchTemplate, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { AsgCapacityProvider, Cluster, ContainerImage, Ec2Service, Ec2TaskDefinition, EcsOptimizedImage, ListenerConfig, LogDrivers, MachineImageType, NetworkMode } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { join, resolve } from "path";

export interface IHisamaGamedayEcsOnEc2 extends StackProps {
    vpc: Vpc
}

export class HisamaGamedayEcsOnEc2 extends Stack {
    private readonly clusterName: string = 'hisama-gameday-ec2-cluster'
    private readonly appContainerName: string = 'app-container'

    constructor(scope: Construct, id: string, props: IHisamaGamedayEcsOnEc2){
        super(scope, id, props)
        const cluster: Cluster = new Cluster(this, this.clusterName, {
            vpc: props.vpc,
            clusterName: this.clusterName,
            containerInsights: true
        })
        const launchTemplate = new LaunchTemplate(this, 'ASG-LaunchTemplate',{
            machineImage: EcsOptimizedImage.amazonLinux2(),
            instanceType: new InstanceType('t3.medium'),
            userData: UserData.forLinux(),
            role: new Role(this, 'instanceProfile', {
                assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerServiceAutoscaleRole')
                ]
            })
        })
        const autoScalingGroup = new AutoScalingGroup(this, 'ASG', {
            vpc: props.vpc,
            mixedInstancesPolicy: {
                    launchTemplate
            }
        })
        const capacityProvider = new AsgCapacityProvider(this, 'AsgCapacityProvider', {
            autoScalingGroup,
            machineImageType: MachineImageType.AMAZON_LINUX_2
        })
        cluster.addAsgCapacityProvider(capacityProvider)

        const taskDef = new Ec2TaskDefinition(this, 'ec2serviceTaskDef', {
            family: 'hisamaEc2TaskDef',
            networkMode: NetworkMode.BRIDGE
        })
        taskDef.addContainer('app-container', {
            containerName: this.appContainerName,
            image: ContainerImage.fromDockerImageAsset(new DockerImageAsset(this, 'nginx-stdout', {
                directory: join(resolve(__dirname, '../'), 'nginx')
            })),
            logging: LogDrivers.firelens({
                options: {
                    "Name": 'cloudwatch',
                    "log_group_name": 'hisama-nginx-from-firelens',
                    "log_stream_prefix": "on-ec2",
                    "auto_create_group": "true",
                    "region": this.region
                }
            }),
            portMappings: [
                {containerPort: 80}
            ],
            privileged: true,
            memoryLimitMiB: 1024,
            memoryReservationMiB: 512
        })
        const service = new Ec2Service(this, 'ec2service', {
            cluster,
            taskDefinition: taskDef,
            enableExecuteCommand: true
        })
        const alb = new ApplicationLoadBalancer(this, 'app-alb', {
            vpc: props.vpc,
            internetFacing:true,
            loadBalancerName: 'alb-ecson-ec2-app'
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