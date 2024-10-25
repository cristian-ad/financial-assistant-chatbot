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

import MessageActions from "@components/MessageActions";
import Avatar from "@components/Avatar";
// import Typist from "react-typist-component"; TODO: Figure out TS compatible alternative
// import { useState } from "react";
import Sources from "@components/Sources";
import { MessageObject } from "@/routes/Chat";
import { IconChecks, IconMessageReport } from "@tabler/icons-react";

export interface MessageBubbleProps {
  message: MessageObject;
  setMessageRating: (message: MessageObject, rating: number) => void;
}

export default function MessageBubble({
  message,
  setMessageRating,
}: MessageBubbleProps) {
  const { id, message_type, sources, status, content } = message;
  // const [isTyping, setIsTyping] = useState(false); TODO: Implement typint animation and callback
  const isTyping = false; // Temp

  const setLastStatus = (status: string[]) => {
    const lastStatus = status[status.length - 1];

    if (lastStatus === "Complete") {
      return <IconChecks className="ml-10 text-green-600" />;
    }

    if (lastStatus === "Error") {
      return <IconMessageReport className="text-yellow-600" />;
    }

    return (
      <div className="flex items-center">
        <span className="ml-10 text-xs text-gray-400">
          {status[status.length - 1]}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`flex ${message_type === "answer" ? "" : "flex-row-reverse"}`}
      id={`message-${id}`}
    >
      <Avatar avatarType={message_type === "question" ? "user" : "bot"} />
      <div
        className={`flex max-w-prose flex-col
        gap-4 whitespace-pre-line rounded-b-xl
        ${
          message_type === "answer"
            ? "rounded-tr-xl bg-blue-200 p-4 dark:bg-blue-900"
            : "rounded-tl-xl bg-slate-50 p-4 dark:bg-slate-800"
        }  sm:max-w-md md:max-w-2xl`}
      >
        {content ? (
          content
        ) : (
          <div className="ml-3 flex">
            <span className="animate-loader mx-[2.5px] my-6 h-2 w-2 rounded-full bg-gray-500"></span>
            <span className="animate-loader animation-delay-200 mx-[2.5px] my-6 h-2 w-2 rounded-full bg-gray-500"></span>
            <span className="animate-loader animation-delay-400 mx-[2.5px] my-6 h-2 w-2 rounded-full bg-gray-500"></span>
          </div>
        )}
        <div className="flex items-center justify-between">
          {message_type === "answer" && sources && !isTyping && (
            <Sources sources={sources} />
          )}
          {message_type === "answer" &&
            status &&
            !isTyping &&
            setLastStatus(status)}
        </div>
      </div>

      {message_type === "answer" && !isTyping && id !== "welcome" && (
        <MessageActions message={message} setMessageRating={setMessageRating} />
      )}
    </div>
  );
}
