"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStackAurora = void 0;
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
class BackendStackAurora extends aws_cdk_lib_1.Stack {
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
        // Dimension of your vector embedding
        const embeddingsModelVectorDimension = 1024;
        const auroraDb = new generative_ai_cdk_constructs_1.amazonaurora.AmazonAuroraVectorStore(this, "AuroraDefaultVectorStore", {
            embeddingsModelVectorDimension: embeddingsModelVectorDimension,
        });
        const archiveKnowledgeBase = new generative_ai_cdk_constructs_1.bedrock.KnowledgeBase(this, "KnowledgeBase", {
            vectorStore: auroraDb,
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
                SEARCH_TYPE: "SEMANTIC"
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
        new aws_cdk_lib_1.CfnOutput(this, "AuroraSecretsARN", {
            value: auroraDb.credentialsSecretArn,
            exportName: "Backend-AuroraSecretsARN",
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
exports.BackendStackAurora = BackendStackAurora;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC1zdGFjay1hdXJvcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiYWNrZW5kLXN0YWNrLWF1cm9yYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUVBQXFFOzs7Ozs7QUFFckUsdUZBQXVGO0FBQ3ZGLHdGQUF3RjtBQUN4RixxRkFBcUY7QUFDckYscUZBQXFGO0FBQ3JGLDZEQUE2RDtBQUU3RCxzRkFBc0Y7QUFDdEYsZ0ZBQWdGO0FBQ2hGLHFGQUFxRjtBQUNyRixvRkFBb0Y7QUFDcEYsaUZBQWlGO0FBQ2pGLHlEQUF5RDtBQUV6RCw2Q0FVcUI7QUFFckIsK0RBQWtEO0FBQ2xELHFDQUEwQztBQUMxQyx3REFBeUM7QUFDekMsNkNBQXdEO0FBQ3hELHdGQUE4RTtBQUU5RSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFbEMsTUFBYSxrQkFBbUIsU0FBUSxtQkFBSztJQUMzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSwwQkFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0QsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsMEJBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQzVELG1CQUFtQixFQUFFLElBQUk7WUFDekIsV0FBVyxFQUFFLDBCQUFHLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDNUMsVUFBVSxFQUFFLDBCQUFHLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDM0MsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTyxFQUFFLG1EQUFtRDtTQUMxRixDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLG9CQUFFLENBQUMsTUFBTSxDQUNqQyxJQUFJLEVB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Q0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdE5ELGdEQXNOQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG5cclxuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzXHJcbi8vIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZVxyXG4vLyB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksXHJcbi8vIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cclxuLy8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLlxyXG5cclxuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELFxyXG4vLyBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQVxyXG4vLyBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUXHJcbi8vIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxyXG4vLyBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcclxuLy8gU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG5pbXBvcnQge1xyXG4gIFN0YWNrLFxyXG4gIFN0YWNrUHJvcHMsXHJcbiAgUmVtb3ZhbFBvbGljeSxcclxuICBDZm5PdXRwdXQsXHJcbiAgYXdzX2R5bmFtb2RiIGFzIGRkYixcclxuICBhd3NfczMgYXMgczMsXHJcbiAgYXdzX2xhbWJkYSBhcyBsYW1iZGEsXHJcbiAgYXdzX2lhbSBhcyBpYW0sXHJcbiAgRHVyYXRpb24sXHJcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XHJcbmltcG9ydCB7IENvcnMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXlcIjtcclxuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcclxuaW1wb3J0IENvZ25pdG9SZXNvdXJjZXMgZnJvbSBcIi4vY29nbml0b1wiO1xyXG5pbXBvcnQgeyBnZXRQYXJzaW5nUHJvbXB0VGVtcGxhdGUgfSBmcm9tIFwiLi9wcm9tcHRzLnRzXCI7XHJcbmltcG9ydCB7IGJlZHJvY2ssIGFtYXpvbmF1cm9yYSB9IGZyb20gXCJAY2RrbGFicy9nZW5lcmF0aXZlLWFpLWNkay1jb25zdHJ1Y3RzXCI7XHJcblxyXG5jb25zdCBwYXRoID0gcmVxdWlyZShcIm5vZGU6cGF0aFwiKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBCYWNrZW5kU3RhY2tBdXJvcmEgZXh0ZW5kcyBTdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCBjaGF0SGlzdG9yeVRhYmxlID0gbmV3IGRkYi5UYWJsZSh0aGlzLCBcIkNoYXRIaXN0b3J5VGFibGVcIiwge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJpZFwiLCB0eXBlOiBkZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuICAgICAgYmlsbGluZ01vZGU6IGRkYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGRkYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gVE9ETzogY2hhbmdlIHRvIFJFVEFJTiB3aGVuIG1vdmluZyB0byBwcm9kdWN0aW9uXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhcmNoaXZlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJGaW5hbmNpYWxEb2N1bWVudHNBcmNoaXZlQnVja2V0XCIsXHJcbiAgICAgIHtcclxuICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIFRPRE86IGNoYW5nZSB0byBSRVRBSU4gd2hlbiBtb3ZpbmcgdG8gcHJvZHVjdGlvblxyXG4gICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TX01BTkFHRUQsXHJcbiAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsIC8vIFRPRE86IHJlbW92ZSB3aGVuIG1vdmluZyB0byBwcm9kdWN0aW9uXHJcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBEaW1lbnNpb24gb2YgeW91ciB2ZWN0b3IgZW1iZWRkaW5nXHJcbiAgICBjb25zdCBlbWJlZGRpbmdzTW9kZWxWZWN0b3JEaW1lbnNpb24gPSAxMDI0O1xyXG4gICAgY29uc3QgYXVyb3JhRGIgPSBuZXcgYW1hem9uYXVyb3JhLkFtYXpvbkF1cm9yYVZlY3RvclN0b3JlKHRoaXMsIFwiQXVyb3JhRGVmYXVsdFZlY3RvclN0b3JlXCIsIHtcclxuICAgICAgZW1iZWRkaW5nc01vZGVsVmVjdG9yRGltZW5zaW9uOiBlbWJlZGRpbmdzTW9kZWxWZWN0b3JEaW1lbnNpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhcmNoaXZlS25vd2xlZGdlQmFzZSA9IG5ldyBiZWRyb2NrLktub3dsZWRnZUJhc2UodGhpcywgXCJLbm93bGVkZ2VCYXNlXCIsIHtcclxuICAgICAgdmVjdG9yU3RvcmU6IGF1cm9yYURiLFxyXG4gICAgICBuYW1lOiBcIkZpbmFuY2lhbERvY3VtZW50c0tub3dsZWRnZUJhc2VcIixcclxuICAgICAgZW1iZWRkaW5nc01vZGVsOiBiZWRyb2NrLkJlZHJvY2tGb3VuZGF0aW9uTW9kZWwuQ09IRVJFX0VNQkVEX01VTFRJTElOR1VBTF9WMyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFyY2hpdmVCdWNrZXREYXRhU291cmNlID0gbmV3IGJlZHJvY2suUzNEYXRhU291cmNlKHRoaXMsIFwiRGF0YVNvdXJjZVwiLCB7XHJcbiAgICAgIGJ1Y2tldDogYXJjaGl2ZUJ1Y2tldCxcclxuICAgICAga25vd2xlZGdlQmFzZTogYXJjaGl2ZUtub3dsZWRnZUJhc2UsXHJcbiAgICAgIGRhdGFTb3VyY2VOYW1lOiBcInJhZy1kYXRhLXNvdXJjZVwiLFxyXG4gICAgICBjaHVua2luZ1N0cmF0ZWd5OiBiZWRyb2NrLkNodW5raW5nU3RyYXRlZ3kuU0VNQU5USUMsXHJcbiAgICAgIHBhcnNpbmdTdHJhdGVneTogYmVkcm9jay5QYXJzaW5nU3RhdGVneS5mb3VuZGF0aW9uTW9kZWwoe1xyXG4gICAgICAgICAgcGFyc2luZ01vZGVsOiBiZWRyb2NrLkJlZHJvY2tGb3VuZGF0aW9uTW9kZWwuQU5USFJPUElDX0NMQVVERV9TT05ORVRfVjFfMC5hc0lNb2RlbCh0aGlzKSxcclxuICAgICAgICAgIHBhcnNpbmdQcm9tcHQ6IGdldFBhcnNpbmdQcm9tcHRUZW1wbGF0ZSgpXHJcbiAgICAgIH0pLFxyXG4gIH0pO1xyXG5cclxuICAgIGNvbnN0IGJvdENoYWluRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwiQm90Q2hhaW5cIiwge1xyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgXCJsYW1iZGFcIiksIHtcclxuICAgICAgICBidW5kbGluZzoge1xyXG4gICAgICAgICAgaW1hZ2U6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLmJ1bmRsaW5nSW1hZ2UsXHJcbiAgICAgICAgICBjb21tYW5kOiBbXHJcbiAgICAgICAgICAgIFwiYmFzaFwiLFxyXG4gICAgICAgICAgICBcIi1jXCIsXHJcbiAgICAgICAgICAgIFwibnBtIGluc3RhbGwgJiYgY3AgLXJUIC9hc3NldC1pbnB1dC8gL2Fzc2V0LW91dHB1dC9cIixcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICB1c2VyOiBcInJvb3RcIixcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIGxvZ0Zvcm1hdDogbGFtYmRhLkxvZ0Zvcm1hdC5KU09OLFxyXG4gICAgICBzeXN0ZW1Mb2dMZXZlbDogbGFtYmRhLlN5c3RlbUxvZ0xldmVsLklORk8sXHJcbiAgICAgIGFwcGxpY2F0aW9uTG9nTGV2ZWw6IGxhbWJkYS5BcHBsaWNhdGlvbkxvZ0xldmVsLkRFQlVHLCAvLyBUT0RPOiBjaGFuZ2UgdG8gSU5GTyB3aGVuIG1vdmluZyB0byBwcm9kdWN0aW9uXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRFlOQU1PREJfSElTVE9SWV9UQUJMRV9OQU1FOiBjaGF0SGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBOVU1CRVJfT0ZfUkVTVUxUUzogXCIxNVwiLFxyXG4gICAgICAgIE5VTUJFUl9PRl9DSEFUX0lOVEVSQUNUSU9OU19UT19SRU1FTUJFUjogXCIxMFwiLFxyXG4gICAgICAgIFNFTEZfUVVFUllfTU9ERUxfSUQ6IFwiYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjBcIixcclxuICAgICAgICBDT05ERU5TRV9NT0RFTF9JRDogXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiLFxyXG4gICAgICAgIENIQVRfTU9ERUxfSUQ6IFwiYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQwNjIwLXYxOjBcIixcclxuICAgICAgICBMQU5HVUFHRTogXCJlbmdsaXNoXCIsXHJcbiAgICAgICAgTEFOR0NIQUlOX1ZFUkJPU0U6IFwiZmFsc2VcIixcclxuICAgICAgICBLTk9XTEVER0VfQkFTRV9JRCA6IGFyY2hpdmVLbm93bGVkZ2VCYXNlLmtub3dsZWRnZUJhc2VJZCxcclxuICAgICAgICBTRUFSQ0hfVFlQRTogXCJTRU1BTlRJQ1wiXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIGNoYXRIaXN0b3J5VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGJvdENoYWluRnVuY3Rpb24pO1xyXG4gICAgYm90Q2hhaW5GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgXCJiZWRyb2NrOkludm9rZU1vZGVsXCIsXHJcbiAgICAgICAgICBcImJlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1cIixcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgU3RhY2sub2YodGhpcykuZm9ybWF0QXJuKHtcclxuICAgICAgICAgICAgYWNjb3VudDogXCJcIixcclxuICAgICAgICAgICAgc2VydmljZTogXCJiZWRyb2NrXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlOiBcImZvdW5kYXRpb24tbW9kZWxcIixcclxuICAgICAgICAgICAgcmVzb3VyY2VOYW1lOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCIsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIGFjY291bnQ6IFwiXCIsXHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwiYmVkcm9ja1wiLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogXCJmb3VuZGF0aW9uLW1vZGVsXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogXCJhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDA2MjAtdjE6MFwiLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICAgIGJvdENoYWluRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgIFwiYmVkcm9jazpSZXRyaWV2ZVwiXHJcbiAgICAgICAgXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwiYmVkcm9ja1wiLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogXCJrbm93bGVkZ2UtYmFzZVwiLFxyXG4gICAgICAgICAgICByZXNvdXJjZU5hbWU6IFwiKlwiLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgICBib3RDaGFpbkZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXCJrbXM6RGVjcnlwdFwiXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIFN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XHJcbiAgICAgICAgICAgIHNlcnZpY2U6IFwia21zXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlOiBcImFsaWFzXCIsXHJcbiAgICAgICAgICAgIHJlc291cmNlTmFtZTogXCJhd3Mvc3NtXCIsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBmblVybCA9IGJvdENoYWluRnVuY3Rpb24uYWRkRnVuY3Rpb25Vcmwoe1xyXG4gICAgICBhdXRoVHlwZTogbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuQVdTX0lBTSxcclxuICAgICAgaW52b2tlTW9kZTogbGFtYmRhLkludm9rZU1vZGUuUkVTUE9OU0VfU1RSRUFNLFxyXG4gICAgICBjb3JzOiB7XHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1xyXG4gICAgICAgICAgLi4uQ29ycy5ERUZBVUxUX0hFQURFUlMsXHJcbiAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgLy8gYWxsb3dlZE1ldGhvZHM6IFtsYW1iZGEuSHR0cE1ldGhvZC5PUFRJT05TLCBsYW1iZGEuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogQ29ycy5BTExfT1JJR0lOUywgLy8gVE9ETzogY2hhbmdlIHRvIGFtcGxpZnkgZG9tYWluXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjb2duaXRvUmVzb3VyY2VzID0gbmV3IENvZ25pdG9SZXNvdXJjZXModGhpcywgXCJDb2duaXRvUmVzb3VyY2VzXCIsIHtcclxuICAgICAgbGFtYmRhVXJsOiBmblVybCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJSZXN0QXBpRW5kcG9pbnRcIiwge1xyXG4gICAgICB2YWx1ZTogZm5VcmwudXJsLFxyXG4gICAgICBleHBvcnROYW1lOiBcIkJhY2tlbmQtUmVzdEFwaUVuZHBvaW50XCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsIFwiQXVyb3JhU2VjcmV0c0FSTlwiLCB7XHJcbiAgICAgIHZhbHVlOiBhdXJvcmFEYi5jcmVkZW50aWFsc1NlY3JldEFybixcclxuICAgICAgZXhwb3J0TmFtZTogXCJCYWNrZW5kLUF1cm9yYVNlY3JldHNBUk5cIixcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJMYW1iZGFGdW5jdGlvbkFyblwiLCB7XHJcbiAgICAgIHZhbHVlOiBib3RDaGFpbkZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBleHBvcnROYW1lOiBcIkJhY2tlbmQtTGFtYmRhRnVuY3Rpb25Bcm5cIixcclxuICAgIH0pO1xyXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIktub3dsZWRnZUJhc2VJZFwiLCB7XHJcbiAgICAgIHZhbHVlOiBhcmNoaXZlS25vd2xlZGdlQmFzZS5rbm93bGVkZ2VCYXNlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlJlc3VtZUJ1Y2tldE5hbWVcIiwge1xyXG4gICAgICB2YWx1ZTogYXJjaGl2ZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgXCJEYXRhU291cmNlSWRcIiwge1xyXG4gICAgICB2YWx1ZTogYXJjaGl2ZUJ1Y2tldERhdGFTb3VyY2UuZGF0YVNvdXJjZUlkLFxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhib3RDaGFpbkZ1bmN0aW9uLnJvbGUhLCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxyXG4gICAgICAgIHJlYXNvbjogXCJUaGlzIGxhbWJkYSB1c2VzIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSBtYW5hZ2VkIHBvbGljeVwiLFxyXG4gICAgICAgIGFwcGxpZXNUbzogW1xyXG4gICAgICAgICAgXCJQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIF0pO1xyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyh0aGlzLCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU00JyxcclxuICAgICAgICByZWFzb246ICdMYW1iZGEgZnVuY3Rpb24gdXNlcyBBV1MgbWFuYWdlZCBwb2xpY3kgZm9yIGJhc2ljIGV4ZWN1dGlvbiByb2xlLCB3aGljaCBpcyBhY2NlcHRhYmxlIGZvciB0aGlzIHVzZSBjYXNlLicsXHJcbiAgICAgICAgYXBwbGllc1RvOiBbJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnXVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXHJcbiAgICAgICAgcmVhc29uOiAnTGFtYmRhIGZ1bmN0aW9uIHJlcXVpcmVzIHRoZXNlIHBlcm1pc3Npb25zIGZvciBsb2cgcmV0ZW50aW9uLCB3aGljaCBpcyBhIG1hbmFnZWQgc2VydmljZSBhbmQgYWNlc3MgdG8ga25vd2xlZGdlLWJhc2VzLicsXHJcbiAgICAgICAgYXBwbGllc1RvOiBbXHJcbiAgICAgICAgICAnQWN0aW9uOjpsb2dzOkRlbGV0ZVJldGVudGlvblBvbGljeScsXHJcbiAgICAgICAgICAnQWN0aW9uOjpsb2dzOlB1dFJldGVudGlvblBvbGljeScsXHJcbiAgICAgICAgICAnUmVzb3VyY2U6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmJlZHJvY2s6PEFXUzo6UmVnaW9uPjo8QVdTOjpBY2NvdW50SWQ+Omtub3dsZWRnZS1iYXNlLyonLFxyXG4gICAgICAgICAgJ1Jlc291cmNlOjoqJyxcclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIF0pO1xyXG5cclxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhhcmNoaXZlQnVja2V0LCBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUzFcIixcclxuICAgICAgICByZWFzb246XHJcbiAgICAgICAgICBcIkZvciBwcm90b3R5cGluZyBwdXJwb3NlcyB3ZSBjaG9zZSBub3QgdG8gbG9nIGFjY2VzcyB0byBidWNrZXQuIFlvdSBzaG91bGQgY29uc2lkZXIgbG9nZ2luZyBhcyB5b3UgbW92ZSB0byBwcm9kdWN0aW9uLlwiLFxyXG4gICAgICB9LFxyXG4gICAgXSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==