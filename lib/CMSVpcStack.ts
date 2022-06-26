import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import ecs = require('aws-cdk-lib/aws-ecs');
import ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');


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
  }
}