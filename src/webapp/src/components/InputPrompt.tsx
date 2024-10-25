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

import { useState, useRef, useContext } from "react";
import { nanoid } from "nanoid";
import { MessageObject } from "@/routes/Chat";

export interface InputPromptProps {
  sendMessage: (message: MessageObject) => void;
  LoaderContext: React.Context<boolean>;
}

export default function InputPrompt({
  sendMessage,
  LoaderContext,
}: InputPromptProps) {
  const [prompt, setPrompt] = useState("");
  const promptInput = useRef(null);
  const isLoading = useContext(LoaderContext);

  const onPressEnter = (e: React.KeyboardEvent) => {
    if (e.code == "Enter" && e.shiftKey == false) {
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = prompt.trim();
    if (trimmedMessage != "") {
      sendMessage({
        id: nanoid(),
        content: trimmedMessage,
        message_type: "question",
      });
      setPrompt("");
    }
  };

  return (
    <form className="mt-2" onSubmit={handleSubmit}>
      <label htmlFor="chat-input" className="sr-only">
        Write your question here
      </label>
      <div className="relative">
        <textarea
          id="prompt-input"
          className="block w-full resize-none rounded-xl border-none bg-slate-200 p-5 pr-20 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-300 disabled:placeholder-slate-400 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:ring-blue-600 dark:disabled:bg-slate-800 dark:disabled:placeholder-slate-500 sm:text-base"
          placeholder={isLoading ? "Loading..." : "Write your question here"}
          rows={1}
          value={prompt}
          ref={promptInput}
          onChange={({ target }) => {
            setPrompt(target.value);
          }}
          onKeyDown={onPressEnter}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="absolute bottom-3 right-2.5 rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-pink-50 hover:bg-pink-800 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:bg-slate-500 dark:bg-pink-600 dark:hover:bg-pink-700 dark:focus:ring-pink-800 sm:text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg
              className="h-6 w-6 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Send"
          )}
          <span className="sr-only">Send message</span>
        </button>
      </div>
    </form>
  );
}
