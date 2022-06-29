import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import ecs = require('aws-cdk-lib/aws-ecs');
import ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';


export class CMSVpcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const vpc = new ec2.Vpc(this, 'cms-demo-vpc', {
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
          name: 'private-sn1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24
        },
        {
          name: 'private-sn2',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }

      ]

    });

    const cluster = new ecs.Cluster(this, 'CMS-Demo-Cluster', { vpc });

    const service =  new ecs_patterns.ApplicationLoadBalancedFargateService(this, "CMS-Admin-Service", {
      cluster,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      cpu: 512,
      loadBalancerName: 'CMS-Demo-lb',
      healthCheckGracePeriod: Duration.seconds(150),
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("cms-uat-repository/administration_46"),
      },
    });

    
    // const tg1 = new elbv2.ApplicationTargetGroup(this, 'TG1', {
    //   targetType: elbv2.TargetType.IP,
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   port:9002,
    //   vpc: vpc
    // });

    //const listener = service.listener ; 
    //service.loadBalancer.addListener('Listener', {port: 80, open: true});
    //listener.
    // listener.addTargets('admin', {
    //   protocol: elbv2.ApplicationProtocol.HTTP,
    //   port:80,
    //   priority: 5,
    //   conditions: [
    //     elbv2.ListenerCondition.pathPatterns(['/admin'])
    //   ]
      
    // })
    // listener.addAction('DefaultAction', {
    //   action: elbv2.ListenerAction.forward([tg1])
    // })
  }
}