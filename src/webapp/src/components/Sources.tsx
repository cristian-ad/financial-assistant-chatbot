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

import PropTypes from "prop-types";
import { Disclosure, Transition } from "@headlessui/react";
import { IconChevronRight, IconFileText } from "@tabler/icons-react";

Sources.propTypes = {
  sources: PropTypes.array.isRequired,
};

type SourcesProps = {
  sources: string[];
};

export default function Sources({ sources }: SourcesProps) {
  return (
    <Disclosure>
      {/*eslint-disable-next-line no-unused-vars*/}
      {({ open }) => (
        <div className="w-fit max-w-full rounded-md bg-blue-50 p-0 dark:bg-blue-700 ">
          <Disclosure.Button className="flex w-full rounded-md bg-blue-100 p-2 text-left align-middle text-xs font-medium text-blue-600 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75 dark:bg-blue-800 dark:text-blue-200">
            <IconChevronRight
              className={`mr-1 h-4 w-4 ${
                open ? "rotate-90 transform" : ""
              } text-blue-500 dark:text-blue-200`}
            />
            Sources:
            <div className="ml-1 inline-flex justify-center rounded-full bg-blue-500 px-2 text-xs text-white dark:bg-blue-400 dark:text-blue-800">
              {sources.length}
            </div>
          </Disclosure.Button>
          <Transition
            enter="transition duration-200 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-150 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="p-3 pr-4 text-xs text-blue-500 dark:text-blue-300">
              <ul className="flex flex-col">
                {sources.map((source: string, index: number) => (
                  <li
                    className="truncate"
                    title={`Document: ${source}`}
                    key={index}
                  >
                    <IconFileText className="mr-1 inline w-4" />
                    <span className="font-mono">{source}</span>
                  </li>
                ))}
              </ul>
            </Disclosure.Panel>
          </Transition>
        </div>
      )}
    </Disclosure>
  );
}
