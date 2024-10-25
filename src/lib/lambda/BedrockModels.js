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

import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export class BedrockModels {
  // static CONDENSE_LLM_RUN_NAME = "Condense LLM"
  static CONDENSE_LLM_RUN_NAME = "Condense LLM"
  static SELF_QUERY_LLM_RUN_NAME = "Self-query LLM"
  static CHAT_LLM_RUN_NAME = "Chat LLM"

  static #CONDENSE_MODEL_TEMPERATURE = 0.0
  static #CONDENSE_MODEL_MAX_TOKENS = 200
  static #CONDENSE_MODEL_TOP_P = 0.9

  static #SELF_QUERY_MODEL_TEMPERATURE = 0.0
  static #SELF_QUERY_MODEL_MAX_TOKENS = 512
  static #SELF_QUERY_MODEL_TOP_P = 0.9

  static #CHAT_MODEL_TEMPERATURE = 0.2
  static #CHAT_MODEL_MAX_TOKENS = 1024
  static #CHAT_MODEL_TOP_P = 0.9
  static #BEDROCK_CLIENT = new BedrockRuntimeClient({ region: "us-east-1" });

  #selfQueryModel;
  #chatModel;
  #condenseModel;

  constructor(selfQueryModelId, chatModelId,condenseModelId) {
    this.#selfQueryModel = BedrockModels.#BedrockWithDebugListeners({
      model: selfQueryModelId,
      region: "us-east-1",
      temperature: BedrockModels.#SELF_QUERY_MODEL_TEMPERATURE,
      maxTokens: BedrockModels.#SELF_QUERY_MODEL_MAX_TOKENS,
      topP: BedrockModels.#SELF_QUERY_MODEL_TOP_P,
      client: BedrockModels.#BEDROCK_CLIENT,
    }, BedrockModels.SELF_QUERY_LLM_RUN_NAME)
    this.#condenseModel = BedrockModels.#BedrockWithDebugListeners({
      model: condenseModelId,
      region: "us-east-1",
      temperature: BedrockModels.#CONDENSE_MODEL_TEMPERATURE,
      maxTokens: BedrockModels.#CONDENSE_MODEL_MAX_TOKENS,
      topP: BedrockModels.#CONDENSE_MODEL_TOP_P,
      client: BedrockModels.#BEDROCK_CLIENT,
    }, BedrockModels.CONDENSE_LLM_RUN_NAME)
    this.#chatModel = BedrockModels.#BedrockWithDebugListeners({
      model: chatModelId,
      region: "us-east-1",
      temperature: BedrockModels.#CHAT_MODEL_TEMPERATURE,
      maxTokens: BedrockModels.#CHAT_MODEL_MAX_TOKENS,
      topP: BedrockModels.#CHAT_MODEL_TOP_P,
      client: BedrockModels.#BEDROCK_CLIENT,
    }, BedrockModels.CHAT_LLM_RUN_NAME)
  }

  static #BedrockWithDebugListeners(args, runName) {
    return new BedrockChat(args)
      .withConfig({ runName: runName })
      .withListeners({
        onStart: BedrockModels.#logStart,
        onEnd: BedrockModels.#logEnd,
      })
  }

  static #logStart(run) {
    console.info("Calling Bedrock")
    const input = run?.inputs?.messages?.[0]?.[0].content
    console.debug(`Model input: ${input}`)
  }

  static #logEnd(run) {
    const output = run?.outputs?.generations?.[0]?.[0]?.text
    console.debug(`Model output: ${output}`)
  }

  getSelfQueryModel() {
    return this.#selfQueryModel
  }
  getCondenseModel() {
    return this.#condenseModel
  }
  getChatModel() {
    return this.#chatModel
  }
}
