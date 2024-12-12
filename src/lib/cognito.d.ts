import { aws_cognito as cognito } from "aws-cdk-lib";
import { Construct } from "constructs";
import { FunctionUrl } from "aws-cdk-lib/aws-lambda";
interface CognitoProps {
    lambdaUrl: FunctionUrl;
}
export default class CognitoResources extends Construct {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly identityPool: cognito.CfnIdentityPool;
    readonly identityPoolRoleAttachment: cognito.CfnIdentityPoolRoleAttachment;
    constructor(scope: Construct, id: string, props: CognitoProps);
}
export {};
