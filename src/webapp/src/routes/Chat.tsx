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

import { useState, createContext, useReducer } from "react";
import MessageList from "@components/MessageList";
import InputPrompt from "@components/InputPrompt";
import { nanoid, customAlphabet } from "nanoid";
import { useAuthenticator } from "@aws-amplify/ui-react";

import { interact, QueryObject, RatingObject, postRating } from "@lib/api";
import { Decodeuint8arr } from "@/lib/utils";
import { messagesReducer } from "@/data/messagesReducer";

export type MessageObject = {
  id: string;
  content: string;
  message_type: string;
  author?: string;
  sources?: string[];
  status?: string[];
  timestamp?: string | number;
  question?: string;
  rating?: string | number;
  session_id?: string;
};


const mockMessages = true; // Begin with preloaded or initialMessages

const initialMessages: MessageObject[] = [
  {
    id: "welcome", // "welcome" as id is checked to display/hide MessageActions for the first message
    content: `Hello! 
    How can I help you today?`,
    message_type: "answer",
  },
];

const LoaderContext = createContext(false);
const sessionId = customAlphabet("1234567890", 20)();

export default function Chat() {
  const [currentSessionId] = useState(sessionId);
  const [state, dispatch] = useReducer(messagesReducer, {
    messages: (mockMessages && initialMessages) || [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const {
    user: { username },
  } = useAuthenticator((context) => [context.user]);

  const actions: Record<string, any> = {
    sources: (msg: Record<string, any>, id: string) =>
      dispatch({
        type: "MODIFY_SOURCES",
        payload: {
          messageId: id,
          sources: msg["sources"],
        },
      }),
    answer: (msg: Record<string, any>, id: string) =>
      dispatch({
        type: "MODIFY_MESSAGE",
        payload: {
          messageId: id,
          text: msg["answer"],
        },
      }),
    steps: (msg: Record<string, any>, id: string) =>
      dispatch({
        type: "MODIFY_STATUS",
        payload: {
          messageId: id,
          status: msg["steps"],
        },
      }),
  };

  const sendMessage = async (question: MessageObject) => {
    dispatch({
      type: "ADD_MESSAGE",
      payload: { message: question },
    });
    setIsLoading(true);

    const query: QueryObject = {
      query: question.content,
      session_id: currentSessionId,
    };

    try {
      const events = await interact(query);

      const answer: MessageObject = {
        id: nanoid(),
        author: username,
        message_type: "answer",
        question: question.content,
        content: "",
        sources: [],
        status: [],
        timestamp: Date.now(),
        rating: undefined,
        session_id: currentSessionId,
      };

      dispatch({
        type: "ADD_MESSAGE",
        payload: { message: answer },
      });

      // @ts-ignore
      for await (const event of events) {
        if (event.PayloadChunk) {
          const chunkText = Decodeuint8arr(event.PayloadChunk.Payload);
          console.log(chunkText);

          const message = JSON.parse(chunkText);
          console.log(message);

          Object.getOwnPropertyNames(message).forEach((key: string) =>
            actions[key](message, answer.id),
          );
        }

        if (event.InvokeComplete) {
          if (event.InvokeComplete.ErrorCode) {
            console.log("Error Code:", event.InvokeComplete.ErrorCode);
            console.log("Details:", event.InvokeComplete.ErrorDetails);
          }

          if (event.InvokeComplete.LogResult) {
            console.log("Streaming complete");
            dispatch({
              type: "MODIFY_STATUS",
              payload: {
                messageId: answer.id,
                status: ["Complete"],
              },
            });
            // const buff = Buffer.from(event.InvokeComplete.LogResult, "base64");
            // console.log("Logs:", buff.toString("utf-8"));
          }
        }
      }
    } catch (err: any) {
      const id = nanoid();

      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          message: {
            author: "bot",
            id: id,
            content: err.message,
            message_type: "answer",
          },
        },
      });

      dispatch({
        type: "MODIFY_STATUS",
        payload: {
          status: ["Error"],
          messageId: id,
        },
      });
    }

    setIsLoading(false);
  };

  const setMessageRating = async (
    {
      id,
      session_id,
      question,
      content: answer,
      author,
      timestamp,
    }: MessageObject,
    newRating: number,
  ) => {
    try {
      if (
        session_id &&
        question &&
        answer &&
        author &&
        timestamp &&
        newRating
      ) {
        const rating: RatingObject = {
          session_id,
          question,
          answer,
          author,
          timestamp,
          rating: newRating,
        };

        await postRating(rating)
          .then((data) => {
            console.info("Rating sent:", newRating, data);

            dispatch({
              type: "MODIFY_RATING",
              payload: {
                messageId: id,
                rating: newRating,
              },
            });
          })
          .catch((error) => {
            console.error("Failed sending rating:", rating, error);
          });
      } else {
        throw new Error("Missing required data for rating");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <LoaderContext.Provider value={isLoading}>
      <div className="flex min-h-[0px] flex-1 flex-col p-2">
        <MessageList
          messages={state.messages}
          setMessageRating={setMessageRating}
        />
        <InputPrompt sendMessage={sendMessage} LoaderContext={LoaderContext} />
      </div>
    </LoaderContext.Provider>
  );
}
