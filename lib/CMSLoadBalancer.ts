import { aws_elasticloadbalancingv2 as elbv2, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { HealthCheck } from "aws-cdk-lib/aws-appmesh";
import { TagStatus } from "aws-cdk-lib/aws-ecr";
//import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';


export class CMSLoadBalancer extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const environment = "demo";
        
        const services = [
            // {name: 'administration', port: 9002, path: '/admin'},
            // {name: 'authentication', port: 9003, path: '/auth'},
            {name: 'configserver', port: 9009, path: '/config'}
        ]
        const vpc = new ec2.Vpc(this, 'cms-' + environment + '-vpc', {
            cidr: '10.0.0.0/16',
            natGateways: 1,
            maxAzs: 2,
            subnetConfiguration: [
                {
                    name: 'public-sn1',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24
                },
                {
                    name: 'withnat-sn',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                    cidrMask: 24
                },
                {
                    name: 'isolated-sn',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24
                }

            ]

        });

        const cluster = new ecs.Cluster(this, 'CMS-' + environment + '-Cluster', { vpc });

        const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
            vpc,
            internetFacing: true
        });

        const listener = lb.addListener('CMS-' + environment + '-Listener', {
            port: 80,
            open: true
        });

        listener.addAction("DefaultAction", {
            action: elbv2.ListenerAction.fixedResponse(200, {
                messageBody: 'OK'
            })
        });

        services.forEach(s => {
            listener.addTargets( s.name + '-TG', {
                priority:9,
                conditions: [
                    elbv2.ListenerCondition.pathPatterns([s.path])
                ],
                port:s.port,
                protocol: elbv2.ApplicationProtocol.HTTP,
                targetGroupName: 'CMS-Demo-' + s.name + '-TG',
                healthCheck: {
                    path: '/api/health/',
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 5,
                    interval: Duration.seconds(10)
                }
                     
            });

            const task = new ecs.FargateTaskDefinition( this, environment + '-' + s.name + '-Task', {
                memoryLimitMiB: 1024, 
                cpu: 512
            });
            //ecr.Repository.fromRepositoryName(this, '870562585226.dkr.ecr.ap-south-1.amazonaws.com', environment + '-cms-' + s.name + '-repo' ), 'latest')

            const container = task.addContainer(s.name +'-Container',  {
                
                image: ecs.ContainerImage.fromEcrRepository( 
                    ecr.Repository.fromRepositoryName(this, '870562585226.dkr.ecr.ap-south-1.amazonaws.com', 'cms-config-server-test'), 'v_8')
            })
            
            container.addPortMappings({
                containerPort:s.port
            })
    
            const service = new ecs.FargateService(this, environment + '-' + s.name + '-Service', {
                cluster,
                taskDefinition: task,
                desiredCount: 1,
                healthCheckGracePeriod: Duration.seconds(150), 
                
            });

            //service.loadBalancerTarget()
    
            service.registerLoadBalancerTargets({
                containerName: s.name + '-Container',
                containerPort:s.port,
                newTargetGroupId: 'New-Demo-' + s.name + '-TG',
                listener: ecs.ListenerConfig.applicationListener(listener, {
                    protocol: elbv2.ApplicationProtocol.HTTP,
                    port: s.port
                    //targetGroupName: 'CMS-Demo-' + s.name + '-TG',
                })
            })
            
        });
        
        // listener.addTargets( 'Admin', {
        //     priority:10,
        //     conditions: [
        //         elbv2.ListenerCondition.pathPatterns(['/admin'])
        //     ],
        //     port:9002,
        //     protocol: elbv2.ApplicationProtocol.HTTP,
        //     targetGroupName: 'CMS-Demo-Admin-TG'
                 
        // });

        // listener.addTargets( 'Auth', {
        //     priority:9,
        //     conditions: [
        //         elbv2.ListenerCondition.pathPatterns(['/auth'])
        //     ],
        //     port:9003,
        //     protocol: elbv2.ApplicationProtocol.HTTP,
        //     targetGroupName: 'CMS-Demo-Auth-TG'
                 
        // });
        // listener.addTargets( 'Notification', {
        //     priority:9,
        //     conditions: [
        //         elbv2.ListenerCondition.pathPatterns(['/notification'])
        //     ],
        //     port:9003,
        //     protocol: elbv2.ApplicationProtocol.HTTP,
        //     targetGroupName: 'CMS-Demo-Notification-TG'
                 
        // });

        

        
    
    }
}