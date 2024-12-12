"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
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
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
const cdk_nag_1 = require("cdk-nag");
const cognito_1 = __importDefault(require("./cognito"));
const prompts_ts_1 = require("./prompts.ts");
const generative_ai_cdk_constructs_1 = require("@cdklabs/generative-ai-cdk-constructs");
const path = require("node:path");
class BackendStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const chatHistoryTable = new aws_cdk_lib_1.aws_dynamodb.Table(this, "ChatHistoryTable", {
            partitionKey: { name: "id", type: aws_cdk_lib_1.aws_dynamodb.AttributeType.STRING },
            pointInTimeRecovery: true,
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: aws_cdk_lib_1.aws_dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY, // TODO: change to RETAIN when moving to production
        });
        const archiveBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, "FinancialDocumentsArchiveBucket", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            encryption: aws_cdk_lib_1.aws_s3.BucketEncryption.KMS_MANAGED,
            autoDeleteObjects: true,
            blockPublicAccess: aws_cdk_lib_1.aws_s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            versioned: true,
        });
        const archiveKnowledgeBase = new generative_ai_cdk_constructs_1.bedrock.KnowledgeBase(this, "KnowledgeBase", {
            name: "FinancialDocumentsKnowledgeBase",
            embeddingsModel: generative_ai_cdk_constructs_1.bedrock.BedrockFoundationModel.COHERE_EMBED_MULTILINGUAL_V3,
        });
        const archiveBucketDataSource = new generative_ai_cdk_constructs_1.bedrock.S3DataSource(this, "DataSource", {
            bucket: archiveBucket,
            knowledgeBase: archiveKnowledgeBase,
            dataSourceName: "rag-data-source",
            chunkingStrategy: generative_ai_cdk_constructs_1.bedrock.ChunkingStrategy.SEMANTIC,
            parsingStrategy: generative_ai_cdk_constructs_1.bedrock.ParsingStategy.foundationModel({
                parsingModel: generative_ai_cdk_constructs_1.bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0.asIModel(this),
                parsingPrompt: (0, prompts_ts_1.getParsingPromptTemplate)()
            }),
        });
        const botChainFunction = new aws_cdk_lib_1.aws_lambda.Function(this, "BotChain", {
            code: aws_cdk_lib_1.aws_lambda.Code.fromAsset(path.join(__dirname, "lambda"), {
                bundling: {
                    image: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_20_X.bundlingImage,
                    command: [
                        "bash",
                        "-c",
                        "npm install && cp -rT /asset-input/ /asset-output/",
                    ],
                    user: "root",
                },
            }),
            handler: "index.handler",
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.minutes(5),
            memorySize: 512,
            logFormat: aws_cdk_lib_1.aws_lambda.LogFormat.JSON,
            systemLogLevel: aws_cdk_lib_1.aws_lambda.SystemLogLevel.INFO,
            applicationLogLevel: aws_cdk_lib_1.aws_lambda.ApplicationLogLevel.DEBUG,
            environment: {
                DYNAMODB_HISTORY_TABLE_NAME: chatHistoryTable.tableName,
                NUMBER_OF_RESULTS: "15",
                NUMBER_OF_CHAT_INTERACTIONS_TO_REMEMBER: "10",
                SELF_QUERY_MODEL_ID: "anthropic.claude-3-haiku-20240307-v1:0",
                CONDENSE_MODEL_ID: "anthropic.claude-3-haiku-20240307-v1:0",
                CHAT_MODEL_ID: "anthropic.claude-3-5-sonnet-20240620-v1:0",
                LANGUAGE: "english",
                LANGCHAIN_VERBOSE: "false",
                KNOWLEDGE_BASE_ID: archiveKnowledgeBase.knowledgeBaseId,
                SEARCH_TYPE: "HYBRID"
            },
        });
        chatHistoryTable.grantReadWriteData(botChainFunction);
        botChainFunction.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
            ],
            resources: [
                aws_cdk_lib_1.Stack.of(this).formatArn({
                    account: "",
                    service: "bedrock",
                    resource: "foundation-model",
                    resourceName: "anthropic.claude-3-haiku-20240307-v1:0",
                }),
                aws_cdk_lib_1.Stack.of(this).formatArn({
                    account: "",
                    service: "bedrock",
                    resource: "foundation-model",
                    resourceName: "anthropic.claude-3-5-sonnet-20240620-v1:0",
                })
            ],
        }));
        botChainFunction.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: [
                "bedrock:Retrieve"
            ],
            resources: [
                aws_cdk_lib_1.Stack.of(this).formatArn({
                    service: "bedrock",
                    resource: "knowledge-base",
                    resourceName: "*",
                }),
            ],
        }));
        botChainFunction.addToRolePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: ["kms:Decrypt"],
            resources: [
                aws_cdk_lib_1.Stack.of(this).formatArn({
                    service: "kms",
                    resource: "alias",
                    resourceName: "aws/ssm",
                }),
            ],
        }));
        const fnUrl = botChainFunction.addFunctionUrl({
            authType: aws_cdk_lib_1.aws_lambda.FunctionUrlAuthType.AWS_IAM,
            invokeMode: aws_cdk_lib_1.aws_lambda.InvokeMode.RESPONSE_STREAM,
            cors: {
                allowCredentials: true,
                allowedHeaders: [
                    ...aws_apigateway_1.Cors.DEFAULT_HEADERS,
                    "Access-Control-Allow-Origin",
                ],
                // allowedMethods: [lambda.HttpMethod.OPTIONS, lambda.HttpMethod.POST],
                allowedOrigins: aws_apigateway_1.Cors.ALL_ORIGINS, // TODO: change to amplify domain
            },
        });
        const cognitoResources = new cognito_1.default(this, "CognitoResources", {
            lambdaUrl: fnUrl,
        });
        new aws_cdk_lib_1.CfnOutput(this, "RestApiEndpoint", {
            value: fnUrl.url,
            exportName: "Backend-RestApiEndpoint",
        });
        new aws_cdk_lib_1.CfnOutput(this, "LambdaFunctionArn", {
            value: botChainFunction.functionArn,
            exportName: "Backend-LambdaFunctionArn",
        });
        new aws_cdk_lib_1.CfnOutput(this, "KnowledgeBaseId", {
            value: archiveKnowledgeBase.knowledgeBaseId,
        });
        new aws_cdk_lib_1.CfnOutput(this, "ResumeBucketName", {
            value: archiveBucket.bucketName,
        });
        new aws_cdk_lib_1.CfnOutput(this, "DataSourceId", {
            value: archiveBucketDataSource.dataSourceId,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(botChainFunction.role, [
            {
                id: "AwsSolutions-IAM4",
                reason: "This lambda uses AWSLambdaBasicExecutionRole managed policy",
                appliesTo: [
                    "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                ],
            },
        ]);
        cdk_nag_1.NagSuppressions.addStackSuppressions(this, [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Lambda function uses AWS managed policy for basic execution role, which is acceptable for this use case.',
                appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda function requires these permissions for log retention, which is a managed service and acess to knowledge-bases.',
                appliesTo: [
                    'Action::logs:DeleteRetentionPolicy',
                    'Action::logs:PutRetentionPolicy',
                    'Resource::arn:<AWS::Partition>:bedrock:<AWS::Region>:<AWS::AccountId>:knowledge-base/*',
                    'Resource::*',
                ]
            }
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(archiveBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "For prototyping purposes we chose not to log access to bucket. You should consider logging as you move to production.",
            },
        ]);
    }
}
exports.BackendStack = BackendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2tlbmQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTs7Ozs7O0FBRXJFLHVGQUF1RjtBQUN2Rix3RkFBd0Y7QUFDeEYscUZBQXFGO0FBQ3JGLHFGQUFxRjtBQUNyRiw2REFBNkQ7QUFFN0Qsc0ZBQXNGO0FBQ3RGLGdGQUFnRjtBQUNoRixxRkFBcUY7QUFDckYsb0ZBQW9GO0FBQ3BGLGlGQUFpRjtBQUNqRix5REFBeUQ7QUFFekQsNkNBVXFCO0FBRXJCLCtEQUFrRDtBQUNsRCxxQ0FBMEM7QUFDMUMsd0RBQXlDO0FBQ3pDLDZDQUF3RDtBQUN4RCx3RkFBZ0U7QUFFaEUsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRWxDLE1BQWEsWUFBYSxTQUFRLG1CQUFLO0lBQ3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDMUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLDBCQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMvRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSwwQkFBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDNUQsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixXQUFXLEVBQUUsMEJBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUM1QyxVQUFVLEVBQUUsMEJBQUcsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUMzQyxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPLEVBQUUsbURBQW1EO1NBQzFGLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLElBQUksb0JBQUUsQ0FBQyxNQUFNLENBQ2pDLElBQUksRUFDSixpQ0FBaUMsRUFDakM7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O1lBQ2hDLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxZQUFZO1NBQzVDLENBQUMsQ0FBQztRQUdILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsSUFBSyxFQUFFO1lBQzlEO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSw2REFBNkQ7Z0JBQ3JFLFNBQVMsRUFBRTtvQkFDVCx1RkFBdUY7aUJBQ3hGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRTtZQUN6QztnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUsMEdBQTBHO2dCQUNsSCxTQUFTLEVBQUUsQ0FBQyx1RkFBdUYsQ0FBQzthQUNyRztZQUNEO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSx3SEFBd0g7Z0JBQ2hJLFNBQVMsRUFBRTtvQkFDVCxvQ0FBb0M7b0JBQ3BDLGlDQUFpQztvQkFDakMsd0ZBQXdGO29CQUN4RixhQUFhO2lCQUNkO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRTtZQUNyRDtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQ0osdUhBQXVIO2FBQzFIO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBek1ELG9DQXlNQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG5cclxuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzXHJcbi8vIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZVxyXG4vLyB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksXHJcbi8vIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cclxuLy8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLlxyXG5cclxuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELFxyXG4vLyBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQVxyXG4vLyBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUXHJcbi8vIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxyXG4vLyBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcclxuLy8gU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG5pbXBvcnQge1xyXG4gIFN0YWNrLFxyXG4gIFN0YWNrUHJvcHMsXHJcbiAgUmVtb3ZhbFBvbGljeSxcclxuICBDZm5PdXRwdXQsXHJcbiAgYXdzX2R5bmFtb2RiIGFzIGRkYixcclxuICBhd3NfczMgYXMgczMsXHJcbiAgYXdzX2xhbWJkYSBhcyBsYW1iZGEsXHJcbiAgYXdzX2lhbSBhcyBpYW0sXHJcbiAgRHVyYXRpb24sXHJcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XHJcbmltcG9ydCB7IENvcnMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXlcIjtcclxuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcclxuaW1wb3J0IENvZ25pdG9SZXNvdXJjZXMgZnJvbSBcIi4vY29nbml0b1wiO1xyXG5pbXBvcnQgeyBnZXRQYXJzaW5nUHJvbXB0VGVtcGxhdGUgfSBmcm9tIFwiLi9wcm9tcHRzLnRzXCI7XHJcbmltcG9ydCB7IGJlZHJvY2sgfSBmcm9tIFwiQGNka2xhYnMvZ2VuZXJhdGl2ZS1haS1jZGstY29uc3RydWN0c1wiO1xyXG5cclxuY29uc3QgcGF0aCA9IHJlcXVpcmUoXCJub2RlOnBhdGhcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFja2VuZFN0YWNrIGV4dGVuZHMgU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgY2hhdEhpc3RvcnlUYWJsZSA9IG5ldyBkZGIuVGFibGUodGhpcywgXCJDaGF0SGlzdG9yeVRhYmxlXCIsIHtcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwiaWRcIiwgdHlwZTogZGRiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIFRPRE86IGNoYW5nZSB0byBSRVRBSU4gd2hlbiBtb3ZpbmcgdG8gcHJvZHVjdGlvblxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXJjaGl2ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoXHJcbiAgICAgIHRoaXMsXHJcbiAgICAgIFwiRmluYW5jaWFsRG9jdW1lbnRzQXJjaGl2ZUJ1Y2tldFwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBUT0RPOiBjaGFuZ2UgdG8gUkVUQUlOIHdoZW4gbW92aW5nIHRvIHByb2R1Y3Rpb25cclxuICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNU19NQU5BR0VELFxyXG4gICAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLCAvLyBUT0RPOiByZW1vdmUgd2hlbiBtb3ZpbmcgdG8gcHJvZHVjdGlvblxyXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgYXJjaGl2ZUtub3dsZWRnZUJhc2UgPSBuZXcgYmVkcm9jay5Lbm93bGVkZ2VCYXNlKHRoaXMsIFwiS25vd2xlZGdlQmFzZVwiLCB7XHJcbiAgICAgIG5hbWU6IFwiRmluYW5jaWFsRG9jdW1lbnRzS25vd2xlZGdlQmFzZVwiLFxyXG4gICAgICBlbWJlZGRpbmdzTW9kZWw6IGJlZHJvY2suQmVkcm9ja0ZvdW5kYXRpb25Nb2RlbC5DT0hFUkVfRU1CRURfTVVMVElMSU5HVUFMX1YzLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXJjaGl2ZUJ1Y2tldERhdGFTb3VyY2UgPSBuZXcgYmVkcm9jay5TM0RhdGFTb3VyY2UodGhpcywgXCJEYXRhU291cmNlXCIsIHtcclxuICAgICAgYnVja2V0OiBhcmNoaXZlQnVja2V0LFxyXG4gICAgICBrbm93bGVkZ2VCYXNlOiBhcmNoaXZlS25vd2xlZGdlQmFzZSxcclxuICAgICAgZGF0YVNvdXJjZU5hbWU6IFwicmFnLWRhdGEtc291cmNlXCIsXHJcbiAgICAgIGNodW5raW5nU3RyYXRlZ3k6IGJlZHJvY2suQ2h1bmtpbmdTdHJhdGVneS5TRU1BTlRJQyxcclxuICAgICAgcGFyc2luZ1N0cmF0ZWd5OiBiZWRyb2NrLlBhcnNpbmdTdGF0ZWd5LmZvdW5kYXRpb25Nb2RlbCh7XHJcbiAgICAgICAgICBwYXJzaW5nTW9kZWw6IGJlZHJvY2suQmVkcm9ja0ZvdW5kYXRpb25Nb2RlbC5BTlRIUk9QSUNfQ0xBVURFX1NPTk5FVF9WMV8wLmFzSU1vZGVsKHRoaXMpLFxyXG4gICAgICAgICAgcGFyc2luZ1Byb21wdDogZ2V0UGFyc2luZ1Byb21wdFRlbXBsYXRlKClcclxuICAgICAgfSksXHJcbiAgfSk7XHJcblxyXG4gICAgY29uc3QgYm90Q2hhaW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgXCJCb3RDaGFpblwiLCB7XHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCBcImxhbWJkYVwiKSwge1xyXG4gICAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgICBpbWFnZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1guYnVuZGxpbmdJbWFnZSxcclxuICAgICAgICAgIGNvbW1hbmQ6IFtcclxuICAgICAgICAgICAgXCJiYXNoXCIsXHJcbiAgICAgICAgICAgIFwiLWNcIixcclxuICAgICAgICAgICAgXCJucG0gaW5zdGFsbCAmJiBjcCAtclQgL2Fzc2V0LWlucHV0LyAvYXNzZXQtb3V0cHV0L1wiLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIHVzZXI6IFwicm9vdFwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgbG9nRm9ybWF0OiBsYW1iZGEuTG9nRm9ybWF0LkpTT04sXHJcbiAgICAgIHN5c3RlbUxvZ0xldmVsOiBsYW1iZGEuU3lzdGVtTG9nTGV2ZWwuSU5GTyxcclxuICAgICAgYXBwbGljYXRpb25Mb2dMZXZlbDogbGFtYmRhLkFwcGxpY2F0aW9uTG9nTGV2ZWwuREVCVUcsIC8vIFRPRE86IGNoYW5nZSB0byBJTkZPIHdoZW4gbW92aW5nIHRvIHByb2R1Y3Rpb25cclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBEWU5BTU9EQl9ISVNUT1JZX1RBQkxFX05BTUU6IGNoYXRIaXN0b3J5VGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE5VTUJFUl9PRl9SRVNVTFRTOiBcIjE1XCIsXHJcbiAgICAgICAgTlVNQkVSX09GX0NIQVRfSU5URVJBQ1RJT05TX1RPX1JFTUVNQkVSOiBcIjEwXCIsXHJcbiAgICAgICAgU0VMRl9RVUVSWV9NT0RFTF9JRDogXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiLFxyXG4gICAgICAgIENPTkRFTlNFX01PREVMX0lEOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCIsXHJcbiAgICAgICAgQ0hBVF9NT0RFTF9JRDogXCJhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDA2MjAtdjE6MFwiLFxyXG4gICAgICAgIExBTkdVQUdFOiBcImVuZ2xpc2hcIixcclxuICAgICAgICBMQU5HQ0hBSU5fVkVSQk9TRTogXCJmYWxzZVwiLFxyXG4gICAgICAgIEtOT1dMRURHRV9CQVNFX0lEIDogYXJjaGl2ZUtub3dsZWRnZUJhc2Uua25vd2xlZGdlQmFzZUlkLFxyXG4gICAgICAgIFNFQVJDSF9UWVBFOiBcIkhZQlJJRFwiXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIGNoYXRIaXN0b3J5VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGJvdENoYWluRnVuY3Rpb24pO1xyXG4gICAgYm90Q2hhaW5GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgXCJiZWRyb2NrOkludm9rZU1vZGVsXCIsXHJcbiAgICAgICAgICBcImJlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1cIixcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgU3RhY2sub2YodGhpcykuZm9ybWF0QXJuKHtcclxuICAgICAgICAgICAgYWNjb3VudDogXCJcIixcclxuICAgICAgICAgICAgc2VydmljZTogXCJiZWRyb2NrXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlOiBcImZvdW5kYXRpb24tbW9kZWxcIixcclxuICAgICAgICAgICAgcmVzb3VyY2VOYW1lOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCIsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIGFjY291bnQ6IFwiXCIsXHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwiYmVkcm9ja1wiLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogXCJmb3VuZGF0aW9uLW1vZGVsXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogXCJhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDA2MjAtdjE6MFwiLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICAgIGJvdENoYWluRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgIFwiYmVkcm9jazpSZXRyaWV2ZVwiXHJcbiAgICAgICAgXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwiYmVkcm9ja1wiLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogXCJrbm93bGVkZ2UtYmFzZVwiLFxyXG4gICAgICAgICAgICByZXNvdXJjZU5hbWU6IFwiKlwiLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgICBib3RDaGFpbkZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXCJrbXM6RGVjcnlwdFwiXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwia21zXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlOiBcImFsaWFzXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogXCJhd3Mvc3NtXCIsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBmblVybCA9IGJvdENoYWluRnVuY3Rpb24uYWRkRnVuY3Rpb25Vcmwoe1xyXG4gICAgICBhdXRoVHlwZTogbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuQVdTX0lBTSxcclxuICAgICAgaW52b2tlTW9kZTogbGFtYmRhLkludm9rZU1vZGUuUkVTUE9OU0VfU1RSRUFNLFxyXG4gICAgICBjb3JzOiB7XHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1xyXG4gICAgICAgICAgLi4uQ29ycy5ERUZBVUxUX0hFQURFUlMsXHJcbiAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgLy8gYWxsb3dlZE1ldGhvZHM6IFtsYW1iZGEuSHR0cE1ldGhvZC5PUFRJT05TLCBsYW1iZGEuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogQ29ycy5BTExfT1JJR0lOUywgLy8gVE9ETzogY2hhbmdlIHRvIGFtcGxpZnkgZG9tYWluXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjb2duaXRvUmVzb3VyY2VzID0gbmV3IENvZ25pdG9SZXNvdXJjZXModGhpcywgXCJDb2duaXRvUmVzb3VyY2VzXCIsIHtcclxuICAgICAgbGFtYmRhVXJsOiBmblVybCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJSZXN0QXBpRW5kcG9pbnRcIiwge1xyXG4gICAgICB2YWx1ZTogZm5VcmwudXJsLFxyXG4gICAgICBleHBvcnROYW1lOiBcIkJhY2tlbmQtUmVzdEFwaUVuZHBvaW50XCIsXHJcbiAgICB9KTtcclxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJMYW1iZGFGdW5jdGlvbkFyblwiLCB7XHJcbiAgICAgIHZhbHVlOiBib3RDaGFpbkZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBleHBvcnROYW1lOiBcIkJhY2tlbmQtTGFtYmRhRnVuY3Rpb25Bcm5cIixcclxuICAgIH0pO1xyXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIktub3dsZWRnZUJhc2VJZFwiLCB7XHJcbiAgICAgIHZhbHVlOiBhcmNoaXZlS25vd2xlZGdlQmFzZS5rbm93bGVkZ2VCYXNlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlJlc3VtZUJ1Y2tldE5hbWVcIiwge1xyXG4gICAgICB2YWx1ZTogYXJjaGl2ZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgXCJEYXRhU291cmNlSWRcIiwge1xyXG4gICAgICB2YWx1ZTogYXJjaGl2ZUJ1Y2tldERhdGFTb3VyY2UuZGF0YVNvdXJjZUlkLFxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhib3RDaGFpbkZ1bmN0aW9uLnJvbGUhLCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxyXG4gICAgICAgIHJlYXNvbjogXCJUaGlzIGxhbWJkYSB1c2VzIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSBtYW5hZ2VkIHBvbGljeVwiLFxyXG4gICAgICAgIGFwcGxpZXNUbzogW1xyXG4gICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIF0pO1xyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyh0aGlzLCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU00JyxcclxuICAgICAgICByZWFzb246ICdMYW1iZGEgZnVuY3Rpb24gdXNlcyBBV1MgbWFuYWdlZCBwb2xpY3kgZm9yIGJhc2ljIGV4ZWN1dGlvbiByb2xlLCB3aGljaCBpcyBhY2NlcHRhYmxlIGZvciB0aGlzIHVzZSBjYXNlLicsXHJcbiAgICAgICAgYXBwbGllc1RvOiBbJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnXVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXHJcbiAgICAgICAgcmVhc29uOiAnTGFtYmRhIGZ1bmN0aW9uIHJlcXVpcmVzIHRoZXNlIHBlcm1pc3Npb25zIGZvciBsb2cgcmV0ZW50aW9uLCB3aGljaCBpcyBhIG1hbmFnZWQgc2VydmljZSBhbmQgYWNlc3MgdG8ga25vd2xlZGdlLWJhc2VzLicsXHJcbiAgICAgICAgYXBwbGllc1RvOiBbXHJcbiAgICAgICAgICAnQWN0aW9uOjpsb2dzOkRlbGV0ZVJldGVudGlvblBvbGljeScsXHJcbiAgICAgICAgICAnQWN0aW9uOjpsb2dzOlB1dFJldGVudGlvblBvbGljeScsXHJcbiAgICAgICAgICAnUmVzb3VyY2U6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmJlZHJvY2s6PEFXUzo6UmVnaW9uPjo8QVdTOjpBY2NvdW50SWQ+Omtub3dsZWRnZS1iYXNlLyonLFxyXG4gICAgICAgICAgJ1Jlc291cmNlOjoqJyxcclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIF0pO1xyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhhcmNoaXZlQnVja2V0LCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcclxuICAgICAgICByZWFzb246XHJcbiAgICAgICAgICBcIkZvciBwcm90b3R5cGluZyBwdXJwb3NlcyB3ZSBjaG9zZSBub3QgdG8gbG9nIGFjY2VzcyB0byBidWNrZXQuIFlvdSBzaG91bGQgY29uc2lkZXIgbG9nZ2luZyBhcyB5b3UgbW92ZSB0byBwcm9kdWN0aW9uLlwiLFxyXG4gICAgICB9LFxyXG4gICAgXSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==