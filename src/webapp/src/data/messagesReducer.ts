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

import { MessageObject } from "@routes/Chat";

export interface MessagesState {
  messages: MessageObject[];
}

interface AddMessage {
  message: MessageObject;
}

interface ModifyMessage {
  messageId: string;
  text: string;
}

interface ModifyRating {
  messageId: string;
  rating: number;
}

interface ModifySources {
  messageId: string;
  sources: string[];
}

interface ModifyStatus {
  messageId: string;
  status: string[];
}

export interface MessagesAction {
  type:
    | "ADD_MESSAGE"
    | "MODIFY_MESSAGE"
    | "MODIFY_RATING"
    | "MODIFY_SOURCES"
    | "MODIFY_STATUS";
  payload:
    | AddMessage
    | ModifyMessage
    | ModifyRating
    | ModifySources
    | ModifyStatus;
}

export function messagesReducer(
  state: MessagesState,
  action: MessagesAction,
): MessagesState {
  switch (action.type) {
    case "ADD_MESSAGE": {
      return {
        messages: [...state.messages, (action.payload as AddMessage).message],
      };
    }
    case "MODIFY_MESSAGE": {
      const oldMessageIndex = state.messages.findIndex(
        (item: MessageObject) =>
          item.id === (action.payload as ModifyRating).messageId,
      );
      const oldMessage = state.messages[oldMessageIndex];
      const beforeMessages = state.messages.slice(0, oldMessageIndex);
      const afterMessages = state.messages.slice(oldMessageIndex + 1) || [];

      return {
        messages: [
          ...beforeMessages,
          {
            ...oldMessage,
            content: `${oldMessage.content}${
              (action.payload as ModifyMessage).text
            }`,
          },
          ...afterMessages,
        ],
      };
    }
    case "MODIFY_SOURCES": {
      const oldMessageIndex = state.messages.findIndex(
        (item: MessageObject) =>
          item.id === (action.payload as ModifyRating).messageId,
      );
      const oldMessage = state.messages[oldMessageIndex];
      const beforeMessages = state.messages.slice(0, oldMessageIndex);
      const afterMessages = state.messages.slice(oldMessageIndex + 1) || [];

      return {
        messages: [
          ...beforeMessages,
          {
            ...oldMessage,
            sources: [...(action.payload as ModifySources).sources],
          },
          ...afterMessages,
        ],
      };
    }
    case "MODIFY_RATING": {
      const oldMessageIndex = state.messages.findIndex(
        (item: MessageObject) =>
          item.id === (action.payload as ModifyRating).messageId,
      );
      const oldMessage = state.messages[oldMessageIndex];
      const beforeMessages = state.messages.slice(0, oldMessageIndex);
      const afterMessages = state.messages.slice(oldMessageIndex + 1) || [];

      return {
        messages: [
          ...beforeMessages,
          { ...oldMessage, rating: (action.payload as ModifyRating).rating },
          ...afterMessages,
        ],
      };
    }
    case "MODIFY_STATUS": {
      const oldMessageIndex = state.messages.findIndex(
        (item: MessageObject) =>
          item.id === (action.payload as ModifyStatus).messageId,
      );
      const oldMessage = state.messages[oldMessageIndex];
      const beforeMessages = state.messages.slice(0, oldMessageIndex);
      const afterMessages = state.messages.slice(oldMessageIndex + 1) || [];

      return {
        messages: [
          ...beforeMessages,
          {
            ...oldMessage,
            status: [
              ...(oldMessage.status || []),
              ...(action.payload as ModifyStatus).status,
            ],
          },
          ...afterMessages,
        ],
      };
    }
    default: {
      console.warn("Unknown action");
      return state;
    }
  }
}
