# aws-provisioning
AWS infra using aws CDK- typescript

VPC
    subnet - public 1
    subnet - public 2
    subnet - private 1
    subnet - private 2

    internet gateway
    NAT gateway
    routes
    firewalls
    load balancers


--------------------------------------------------------------------

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
