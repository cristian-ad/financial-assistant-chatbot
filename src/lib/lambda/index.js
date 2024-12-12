// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

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

import { BedrockModels } from "./BedrockModels.js"
import { QuestionAnswerChain } from "./QuestionAnswerChain.js"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { ChainRunner } from "./ChainRunner.js"
import {getChatPrompt, getCondensePrompt, getSelfQueryPrompt} from "./prompts.js"

// Constants
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const DYNAMODB_HISTORY_TABLE_NAME = process.env.DYNAMODB_HISTORY_TABLE_NAME
const CONDENSE_MODEL_ID = process.env.CONDENSE_MODEL_ID
const SELF_QUERY_MODEL_ID = process.env.SELF_QUERY_MODEL_ID
const CHAT_MODEL_ID = process.env.CHAT_MODEL_ID
const LANGUAGE = process.env.LANGUAGE
const NUMBER_OF_RESULTS = parseInt(process.env.NUMBER_OF_RESULTS)
const NUMBER_OF_CHAT_INTERACTIONS_TO_REMEMBER = parseInt(process.env.NUMBER_OF_CHAT_INTERACTIONS_TO_REMEMBER)

// Initialize clients and models
const bedrockModels = new BedrockModels(
  SELF_QUERY_MODEL_ID,
  CHAT_MODEL_ID,
  CONDENSE_MODEL_ID
)
const dynamoDBClient = new DynamoDBClient({region:"us-east-1"})

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, _context) => {
    console.debug('event input', event);
    const { session_id: sessionId, query: question, stream: stream } = event;

    if (!sessionId || sessionId.length < 2 || sessionId.length > 100 ||
        !question || question.length < 2 || question.length > 200) {
      throw new Error("Invalid params!");
    }
    const questionAnswerChain = new QuestionAnswerChain(
      dynamoDBClient,
      DYNAMODB_HISTORY_TABLE_NAME,
      NUMBER_OF_CHAT_INTERACTIONS_TO_REMEMBER,
      KNOWLEDGE_BASE_ID,
      NUMBER_OF_RESULTS,
      bedrockModels,
      getCondensePrompt(),
      getSelfQueryPrompt(),
      getChatPrompt(LANGUAGE),
      sessionId
    )

    const chainNamesToListen = stream ? [
      QuestionAnswerChain.CHAIN_NAME_STANDALONE_QUESTION,
      QuestionAnswerChain.CHAIN_NAME_RETRIEVE_DOCUMENTS,
      QuestionAnswerChain.CHAIN_NAME_ANSWER
    ] : []

    const llmNamesToListen = stream ? [BedrockModels.CHAT_LLM_RUN_NAME] : []
    const chainRunner = new ChainRunner(questionAnswerChain, responseStream, chainNamesToListen, llmNamesToListen)
    await chainRunner.run(question)
});