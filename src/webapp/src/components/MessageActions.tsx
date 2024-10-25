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

import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  IconCopy,
  IconThumbDown,
  IconThumbUp,
  IconCheck,
} from "@tabler/icons-react";
import { MessageObject } from "@/routes/Chat";

interface MessageActionsProps {
  message: MessageObject;
  setMessageRating: (message: MessageObject, rating: number) => void;
}

export default function MessageActions({
  message,
  setMessageRating,
}: MessageActionsProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 800);
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const value = parseInt(event.currentTarget.value);

    // Make sure not to update to same rating
    if (message.rating !== value) {
      setMessageRating(message, value);
    }
  };

  const ratingActions = [
    {
      value: 0,
      classNames: "text-red-600 hover:text-red-500",
      icon: <IconThumbDown className="w-5" />,
    },
    {
      value: 1,
      classNames: "text-green-600 hover:text-green-500",
      icon: <IconThumbUp className="w-5" />,
    },
  ];

  return (
    <div className="ml-2 mt-1 flex gap-2 text-slate-500 sm:flex-row">
      <CopyToClipboard text={message.content} onCopy={handleCopy}>
        <button className="hover:text-blue-600">
          <span>
            {isCopied ? (
              <IconCheck className="w-5 text-green-500" />
            ) : (
              <IconCopy className="w-5" />
            )}
          </span>
        </button>
      </CopyToClipboard>

      {ratingActions.map((action) => (
        <button
          key={action.value}
          onClick={handleButtonClick}
          value={action.value}
          className={
            message.rating == action.value
              ? action.classNames
              : "hover:text-blue-600 disabled:text-gray-600"
          }
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
