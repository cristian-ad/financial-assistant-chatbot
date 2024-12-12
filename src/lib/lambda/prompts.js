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

import { chatTemplate as chatTemplateEn, condenseTemplate as condenseTemplateEn, selfQueryTemplate as selfQueryTemplateEn } from "./prompts/prompts-en.js"
import { chatTemplate as chatTemplateEs, condenseTemplate as condenseTemplateEs, selfQueryTemplate as selfQueryTemplateEs } from "./prompts/prompts-es.ahoradoc.js"

const LANGUAGE = process.env.LANGUAGE || 'en'; // Default to English

// Declare variables in the outer scope
let SelfQueryTemplate;
let condenseTemplate;
let chatTemplate;

if (LANGUAGE === 'spanish') {
  console.log('Lenguaje detectado: ES', LANGUAGE)
  // Spanish Templates
  SelfQueryTemplate = selfQueryTemplateEs;
  condenseTemplate = chatTemplateEs;
  chatTemplate = condenseTemplateEs;
} else {
  console.log('Lenguaje detectado: EN', LANGUAGE)
  // English Templates (default)
  SelfQueryTemplate = selfQueryTemplateEn;
  condenseTemplate = chatTemplateEn;
  chatTemplate = condenseTemplateEn;
}

export function getSelfQueryPrompt() {
  return SelfQueryTemplate
}

export function getCondensePrompt() {
  return condenseTemplate
}

export function getChatPrompt(language) {
  return chatTemplate.replace("[language]", language)
}
