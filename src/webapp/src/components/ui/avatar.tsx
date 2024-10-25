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

import { IconMessageChatbot, IconUser } from "@tabler/icons-react";
import { useAuthenticator } from "@aws-amplify/ui-react";

type AvatarProps = {
  avatarType: "user" | "bot";
  size: null | "user" | "small";
};

export default function Avatar({ avatarType, size }: AvatarProps) {
  const {
    user: { username },
  } = useAuthenticator((context) => [context.user]);

  const sizeVariants = {
    default: "h-10 w-10 leading-10 text-lg",
    small: "h-8 w-8 leading-8 text-sm",
  };

  const sizeClasses =
    size !== null
      ? sizeVariants[size as keyof typeof sizeVariants]
      : sizeVariants.default;

  return (
    <div
      className={`${sizeClasses} flex flex-none select-none rounded-full
        ${
          avatarType && avatarType === "bot"
            ? "mr-2 bg-blue-600 dark:bg-blue-500"
            : "ml-2 bg-gray-800 text-gray-200 dark:bg-gray-600 dark:text-gray-950"
        }`}
    >
      {avatarType === "user" && (
        <span className="flex-1 text-center font-semibold">
          {username?.charAt(0).toUpperCase()}
        </span>
      )}

      {avatarType === "bot" && (
        <IconMessageChatbot className="m-auto stroke-blue-200" />
      )}

      {!avatarType && <IconUser size={20} className="m-auto stroke-gray-200" />}
    </div>
  );
}
