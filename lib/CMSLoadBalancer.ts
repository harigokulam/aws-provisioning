import { aws_elasticloadbalancingv2 as elbv2, CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { HealthCheck } from "aws-cdk-lib/aws-appmesh";
import { TagStatus } from "aws-cdk-lib/aws-ecr";
import { InstanceType, SubnetFilter, SubnetType } from "aws-cdk-lib/aws-ec2";
import { CfnOutcome } from "aws-cdk-lib/aws-frauddetector";
import { loadBalancerNameFromListenerArn } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AwsLogDriverMode } from "aws-cdk-lib/aws-ecs";
import { CfnDisk } from "aws-cdk-lib/aws-lightsail";
//import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';


export class CMSLoadBalancer extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const env_name = "demo";
        const ecrurl = '870562585226.dkr.ecr.ap-south-1.amazonaws.com';

        //'demo-cms-' + service + '-repo',
        
        
        const services = [
           
            {name: 'authentication', port: 9003, path: '/authentication/*', repository: 'demo-cms-authentication-repo', tag: 'V_2'},
            // {name: 'administration', port: 9092, path: '/administration/*', repository: 'demo-cms-administration-repo', tag: 'V_12'},
            // {name: 'notification', port: 9007, path: '/notification/*', repository: 'demo-cms-notification-repo', tag: 'V_2'},
            // {name: 'patientenrollment', port: 9008, path: '/patientenrollment/*', repository: 'demo-cms-patientenrollment-repo', tag: 'V_2'},
            // {name: 'careplan', port: 9006, path: '/careplan/*', repository: 'demo-cms-careplan-repo', tag: 'V_2'},
            // {name: 'inboundintegration', port: 9005, path: '/inboundintegration/*', repository: 'demo-cms-inboundintegration-repo', tag: 'V_2'},
            
            {name: 'configserver', port: 8001, path: '/config/*', repository: 'demo-cms-configserver-repo', tag: 'V_2'},
            {name: 'servicediscovery', port: 8761, path: '/registry/*', repository: 'demo-cms-servicediscovery-repo', tag : 'V_3'},
            {name: 'frontend', port: 80, path: '/*', repository: 'demo-cms-frontend-repo', tag: 'V_6'}
        ];


        const vpc = new ec2.Vpc(this, 'cms-' + env_name + '-vpc', {
            cidr: '10.0.0.0/16',
            natGateways: 1,
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

        const bastion = new ec2.BastionHostLinux(this, 'cms-my-bastion-host', {
            vpc,
            instanceName: 'my-bastion-cms',
            subnetSelection: { subnetType : ec2.SubnetType.PUBLIC} ,
            
        })
        
        const cluster = new ecs.Cluster(this, 'CMS-' + env_name + '-Cluster', { vpc });

        const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'cms-demo'
        });

        const lbname = new CfnOutput(this, 'lbname', {
            value : lb.loadBalancerDnsName,
            description: 'Load Balancer N`ame'
        });

        console.log('LB Name', lbname.value);
        
        const listener = lb.addListener('CMS-' + env_name + '-Listener', {
            port: 80,
            open: true
        });

        listener.addAction("DefaultAction", {
            action: elbv2.ListenerAction.fixedResponse(200, {
                messageBody: 'OK'
            })
        });
        let p = 5;
        services.forEach(s => {
            
            const logging = new ecs.AwsLogDriver ({
                
                streamPrefix: 'ecs',
                logRetention: 3,
                mode: AwsLogDriverMode.NON_BLOCKING
            });

            const task = new ecs.FargateTaskDefinition( this, env_name + '-' + s.name + '-Task', {
                memoryLimitMiB: 1024, 
                cpu: 512
            });
         

            const container = task.addContainer(s.name +'-Container',  {
                image: ecs.ContainerImage.fromEcrRepository( ecr.Repository.fromRepositoryName(this, s.name + '-repo', s.repository), s.tag),
                portMappings: [ {containerPort: s.port} ],
                logging,
                environment: {'spring.profiles.active' : env_name}
            })
           
    
            const service = new ecs.FargateService(this, env_name + '-' + s.name + '-Service', {
                cluster,
                taskDefinition: task,
                desiredCount: 1,
                healthCheckGracePeriod: Duration.seconds(150), 
                
            });

            

            listener.addTargets( s.name + '-TG', {
                priority: p++,
                conditions: [
                    elbv2.ListenerCondition.pathPatterns([s.path])
                ],
                
                port:80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                targets: [service.loadBalancerTarget({
                    containerName: s.name + '-Container',
                    containerPort:s.port,
                   
                })],
                healthCheck: {
                    path: '/api/health/',
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 5,
                    interval: Duration.seconds(10)
                }
                     
            });
            
            //service.loadBalancerTarget()
    
            // service.registerLoadBalancerTargets({
            //     containerName: s.name + '-Container',
            //     containerPort:s.port,
            //     newTargetGroupId: 'New-Demo-' + s.name + '-TG',
            //     listener: ecs.ListenerConfig.applicationListener(listener, {
            //         protocol: elbv2.ApplicationProtocol.HTTP,
            //         port: s.port
            //         //targetGroupName: 'CMS-Demo-' + s.name + '-TG',
            //     })
            // })
            
        });
        
        
    
    }
}