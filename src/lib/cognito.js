"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
Object.defineProperty(exports, "__esModule", { value: true });
// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class CognitoResources extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.userPool = new aws_cdk_lib_1.aws_cognito.UserPool(this, "WebAppUserPool", {
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            advancedSecurityMode: aws_cdk_lib_1.aws_cognito.AdvancedSecurityMode.ENFORCED,
        });
        this.userPoolClient = new aws_cdk_lib_1.aws_cognito.UserPoolClient(this, "WebAppUserPoolClient", {
            userPool: this.userPool,
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
                custom: true,
            },
        });
        this.identityPool = new aws_cdk_lib_1.aws_cognito.CfnIdentityPool(this, "WebAppIdentityPool", {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
        const authUserRole = new aws_cdk_lib_1.aws_iam.Role(this, "AuthenticatedUserRole", {
            assumedBy: new aws_cdk_lib_1.aws_iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated",
                },
            }, "sts:AssumeRoleWithWebIdentity"),
        });
        const allowLambdaAccessPolicy = new aws_cdk_lib_1.aws_iam.Policy(this, "AllowLambdaAccessPolicy", {
            policyName: "AllowLambdaAccessPolicy",
            statements: [
                new aws_cdk_lib_1.aws_iam.PolicyStatement({
                    actions: ["lambda:InvokeFunctionUrl", "lambda:InvokeFunction"],
                    resources: [props.lambdaUrl.functionArn],
                }),
            ],
        });
        authUserRole.attachInlinePolicy(allowLambdaAccessPolicy);
        props.lambdaUrl.grantInvokeUrl(authUserRole);
        const unauthUserRole = new aws_cdk_lib_1.aws_iam.Role(this, "UnauthenticatedUserRole", {
            assumedBy: new aws_cdk_lib_1.aws_iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "unauthenticated",
                },
            }),
        });
        this.identityPoolRoleAttachment = new aws_cdk_lib_1.aws_cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: authUserRole.roleArn,
                unauthenticated: unauthUserRole.roleArn,
            },
            roleMappings: {
                mapping: {
                    type: "Token",
                    ambiguousRoleResolution: "AuthenticatedRole",
                    identityProvider: `cognito-idp.${aws_cdk_lib_1.Stack.of(this).region}.amazonaws.com/${this.userPool.userPoolId}:${this.userPoolClient.userPoolClientId}`,
                },
            },
        });
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolIdOutput", {
            value: this.userPool.userPoolId,
            exportName: "Backend-CognitoUserPoolId",
        });
        new aws_cdk_lib_1.CfnOutput(this, "UserPoolClientIdOutput", {
            value: this.userPoolClient.userPoolClientId,
            exportName: "Backend-CognitoUserPoolClientId",
        });
        new aws_cdk_lib_1.CfnOutput(this, "IdentityPoolIdOutput", {
            value: this.identityPool.ref,
            exportName: "Backend-CognitoIdentityPoolId",
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.userPool, [
            {
                id: "AwsSolutions-COG2",
                reason: "MFA not required for Cognito during prototype engagement",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(allowLambdaAccessPolicy, [
            {
                id: "AwsSolutions-IAM5",
                reason: "This lambda should be able to GetMedia for any stream ARN in this account.",
            },
        ]);
    }
}
exports.default = CognitoResources;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZ25pdG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTs7QUFFckUsdUZBQXVGO0FBQ3ZGLHdGQUF3RjtBQUN4RixxRkFBcUY7QUFDckYscUZBQXFGO0FBQ3JGLDZEQUE2RDtBQUU3RCxzRkFBc0Y7QUFDdEYsZ0ZBQWdGO0FBQ2hGLHFGQUFxRjtBQUNyRixvRkFBb0Y7QUFDcEYsaUZBQWlGO0FBQ2pGLHlEQUF5RDtBQUV6RCw2Q0FLcUI7QUFFckIsMkNBQXVDO0FBQ3ZDLHFDQUEwQztBQU8xQyxNQUFxQixnQkFBaUIsU0FBUSxzQkFBUztJQU1yRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHlCQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMzRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0Qsb0JBQW9CLEVBQUUseUJBQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRO1NBQzVELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSx5QkFBTyxDQUFDLGNBQWMsQ0FDOUMsSUFBSSxFQUNKLHNCQUFzQixFQUN0QjtZQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLE1BQU0sRUFBRSxJQUFJO2FBQ2I7U0FDRixDQUNGLENBQUM7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Z0I7WUFDM0MsVUFBVSxFQUFFLGlDQUFpQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLHVCQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7WUFDNUIsVUFBVSxFQUFFLCtCQUErQjtTQUM1QyxDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDckQ7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLDBEQUEwRDthQUNuRTtTQUNGLENBQUMsQ0FBQztRQUVILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsdUJBQXVCLEVBQUU7WUFDL0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLDRFQUE0RTthQUMvRTtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhKRCxtQ0FnSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuXHJcbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpc1xyXG4vLyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmVcclxuLy8gd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LFxyXG4vLyBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXHJcbi8vIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzby5cclxuXHJcbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCxcclxuLy8gSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEFcclxuLy8gUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVFxyXG4vLyBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cclxuLy8gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFXHJcbi8vIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG5cclxuaW1wb3J0IHtcclxuICBhd3NfaWFtIGFzIGlhbSxcclxuICBhd3NfY29nbml0byBhcyBjb2duaXRvLFxyXG4gIENmbk91dHB1dCxcclxuICBTdGFjayxcclxufSBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuXHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XHJcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XHJcbmltcG9ydCB7IEZ1bmN0aW9uVXJsIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcclxuXHJcbmludGVyZmFjZSBDb2duaXRvUHJvcHMge1xyXG4gIGxhbWJkYVVybDogRnVuY3Rpb25Vcmw7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvZ25pdG9SZXNvdXJjZXMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IGlkZW50aXR5UG9vbDogY29nbml0by5DZm5JZGVudGl0eVBvb2w7XHJcbiAgcHVibGljIHJlYWRvbmx5IGlkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50OiBjb2duaXRvLkNmbklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29nbml0b1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCBcIldlYkFwcFVzZXJQb29sXCIsIHtcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGFkdmFuY2VkU2VjdXJpdHlNb2RlOiBjb2duaXRvLkFkdmFuY2VkU2VjdXJpdHlNb2RlLkVORk9SQ0VELFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIldlYkFwcFVzZXJQb29sQ2xpZW50XCIsXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcclxuICAgICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogdHJ1ZSxcclxuICAgICAgICAgIGN1c3RvbTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIldlYkFwcElkZW50aXR5UG9vbFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcclxuICAgICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgY2xpZW50SWQ6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGF1dGhVc2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBcIkF1dGhlbnRpY2F0ZWRVc2VyUm9sZVwiLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIixcclxuICAgICAgICB7XHJcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xyXG4gICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJhdXRoZW50aWNhdGVkXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiXHJcbiAgICAgICksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhbGxvd0xhbWJkYUFjY2Vzc1BvbGljeSA9IG5ldyBpYW0uUG9saWN5KFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIkFsbG93TGFtYmRhQWNjZXNzUG9saWN5XCIsXHJcbiAgICAgIHtcclxuICAgICAgICBwb2xpY3lOYW1lOiBcIkFsbG93TGFtYmRhQWNjZXNzUG9saWN5XCIsXHJcbiAgICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJsYW1iZGE6SW52b2tlRnVuY3Rpb25VcmxcIiwgXCJsYW1iZGE6SW52b2tlRnVuY3Rpb25cIl0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmxhbWJkYVVybC5mdW5jdGlvbkFybl0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgYXV0aFVzZXJSb2xlLmF0dGFjaElubGluZVBvbGljeShhbGxvd0xhbWJkYUFjY2Vzc1BvbGljeSk7XHJcblxyXG4gICAgcHJvcHMubGFtYmRhVXJsLmdyYW50SW52b2tlVXJsKGF1dGhVc2VyUm9sZSk7XHJcblxyXG4gICAgY29uc3QgdW5hdXRoVXNlclJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgXCJVbmF1dGhlbnRpY2F0ZWRVc2VyUm9sZVwiLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIiwge1xyXG4gICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7XHJcbiAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJ1bmF1dGhlbnRpY2F0ZWRcIixcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJJZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgaWRlbnRpdHlQb29sSWQ6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICByb2xlczoge1xyXG4gICAgICAgICAgYXV0aGVudGljYXRlZDogYXV0aFVzZXJSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgICB1bmF1dGhlbnRpY2F0ZWQ6IHVuYXV0aFVzZXJSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgfSxcclxuICAgICAgICByb2xlTWFwcGluZ3M6IHtcclxuICAgICAgICAgIG1hcHBpbmc6IHtcclxuICAgICAgICAgICAgdHlwZTogXCJUb2tlblwiLFxyXG4gICAgICAgICAgICBhbWJpZ3VvdXNSb2xlUmVzb2x1dGlvbjogXCJBdXRoZW50aWNhdGVkUm9sZVwiLFxyXG4gICAgICAgICAgICBpZGVudGl0eVByb3ZpZGVyOiBgY29nbml0by1pZHAuJHtcclxuICAgICAgICAgICAgICBTdGFjay5vZih0aGlzKS5yZWdpb25cclxuICAgICAgICAgICAgfS5hbWF6b25hd3MuY29tLyR7dGhpcy51c2VyUG9vbC51c2VyUG9vbElkfToke1xyXG4gICAgICAgICAgICAgIHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxyXG4gICAgICAgICAgICB9YCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xJZE91dHB1dFwiLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGV4cG9ydE5hbWU6IFwiQmFja2VuZC1Db2duaXRvVXNlclBvb2xJZFwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sQ2xpZW50SWRPdXRwdXRcIiwge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBleHBvcnROYW1lOiBcIkJhY2tlbmQtQ29nbml0b1VzZXJQb29sQ2xpZW50SWRcIixcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJJZGVudGl0eVBvb2xJZE91dHB1dFwiLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXHJcbiAgICAgIGV4cG9ydE5hbWU6IFwiQmFja2VuZC1Db2duaXRvSWRlbnRpdHlQb29sSWRcIixcclxuICAgIH0pO1xyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyh0aGlzLnVzZXJQb29sLCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtQ09HMlwiLFxyXG4gICAgICAgIHJlYXNvbjogXCJNRkEgbm90IHJlcXVpcmVkIGZvciBDb2duaXRvIGR1cmluZyBwcm90b3R5cGUgZW5nYWdlbWVudFwiLFxyXG4gICAgICB9LFxyXG4gICAgXSk7XHJcblxyXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGFsbG93TGFtYmRhQWNjZXNzUG9saWN5LCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxyXG4gICAgICAgIHJlYXNvbjpcclxuICAgICAgICAgIFwiVGhpcyBsYW1iZGEgc2hvdWxkIGJlIGFibGUgdG8gR2V0TWVkaWEgZm9yIGFueSBzdHJlYW0gQVJOIGluIHRoaXMgYWNjb3VudC5cIixcclxuICAgICAgfSxcclxuICAgIF0pO1xyXG4gIH1cclxufVxyXG4iXX0=