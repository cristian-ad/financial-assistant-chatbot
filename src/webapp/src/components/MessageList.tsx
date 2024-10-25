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

import { useRef } from "react";
import MessageBubble from "@components/MessageBubble";
import { motion, AnimatePresence } from "framer-motion";
import { MessageObject } from "@/routes/Chat";

interface MessageListProps {
  messages: MessageObject[];
  setMessageRating: (message: MessageObject, newRating: number) => void;
}

export default function MessageList({
  messages,
  setMessageRating,
}: MessageListProps) {
  const listContainer = useRef(null);

  const scrollContainer = () => {
    if (listContainer.current) {
      const list = listContainer.current as HTMLDivElement;
      list.scrollTop = list.scrollHeight;
    }
  };

  return (
    <div
      ref={listContainer}
      className="flex-1 space-y-6 overflow-y-auto rounded-xl bg-slate-200  p-4 text-sm leading-6 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-300 sm:text-base sm:leading-7"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            onAnimationStart={scrollContainer}
            key={message.id}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <MessageBubble
              key={message.id}
              message={message}
              setMessageRating={setMessageRating}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
