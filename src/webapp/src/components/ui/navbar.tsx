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

import { useAuthenticator } from "@aws-amplify/ui-react";
import { IconLogout, IconBox as Icon } from "@tabler/icons-react";
import Avatar from "@components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { signOut } = useAuthenticator((context) => [context.user]);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const env = import.meta.env;

  return (
    <nav className="mb-1 flex w-full justify-between border-b bg-slate-600 p-4 shadow-sm">
      <Link to="/">
        <div className="flex items-center text-white hover:text-slate-200">
          <Icon className="mr-1" />
          <h1 className="text-md font-bold leading-8">{env.VITE_APP_NAME}</h1>
        </div>
      </Link>

      {env.VITE_APP_LOGO_URL !== "" && (
        <img className="md-hidden h-8" src={env.VITE_APP_LOGO_URL} />
      )}

      <div className="flex">
        <Avatar size="small" avatarType="user" />

        <button
          onClick={handleSignOut}
          className="ml-4 text-sm text-gray-800 hover:text-gray-600"
        >
          <span className="font-bold">
            <IconLogout className="text-white" />
          </span>
        </button>
      </div>
    </nav>
  );
}
