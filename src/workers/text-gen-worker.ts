/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  GeminiGenerateTextRequestBody,
  GeminiGenerateTextResponseBody,
  HarmCategory,
  SafetySetting,
  HarmBlockThreshold
} from '../types/gemini-types';
import type { TextGenWorkerMessage } from '../types/common-types';

/**
 * Helper function to handle calls from the main thread
 * @param e Message event
 */
self.onmessage = (e: MessageEvent<TextGenWorkerMessage>) => {
  switch (e.data.command) {
    case 'startTextGen': {
      let stopSequences: string[] = [];
      if (e.data.payload.stopSequences !== undefined) {
        stopSequences = e.data.payload.stopSequences;
      }

      let detail = '';
      if (e.data.payload.detail !== undefined) {
        detail = e.data.payload.detail;
      }

      startTextGen(
        e.data.payload.apiKey,
        e.data.payload.requestID,
        e.data.payload.prompt,
        e.data.payload.temperature,
        stopSequences,
        detail
      );
      break;
    }

    default: {
      console.error('Worker: unknown message', e.data.command);
      break;
    }
  }
};

/**
 * Use PaLM API to generate text based on a given prompt
 * @param apiKey PaLM API key
 * @param requestID Worker request ID
 * @param prompt Prompt to give to the PaLM model
 * @param temperature Model temperature
 */
const startTextGen = async (
  apiKey: string,
  requestID: string,
  prompt: string,
  temperature: number,
  stopSequences: string[],
  detail: string
) => {
  // Configure safety setting to allow low-probability unsafe responses
  const safetySettings: SafetySetting[] = [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    }
  ];

  const parameter: GeminiGenerateTextRequestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    safetySettings,
    generationConfig: {
      temperature,
      stopSequences
    }
  };

  const model = 'gemini-pro';
  let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const urlParam = new URLSearchParams();
  urlParam.append('key', apiKey);
  url += `?${urlParam.toString()}`;

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parameter)
  };

  try {
    const response = await fetch(url, requestOptions);
    const data = (await response.json()) as GeminiGenerateTextResponseBody;
    if (response.status !== 200) {
      throw Error('Gemini API error' + JSON.stringify(data));
    }

    if (data.candidates === undefined) {
      console.error(
        'Gemini API is blocked, feedback: ',
        data.promptFeedback.safetyRatings,
        data
      );
      throw Error('Gemini API Error' + JSON.stringify(data));
    }

    // Send back the data to the main thread
    const result = data.candidates[0].content.parts[0].text;
    const message: TextGenWorkerMessage = {
      command: 'finishTextGen',
      payload: {
        requestID,
        apiKey,
        result,
        prompt: prompt,
        detail: detail
      }
    };
    postMessage(message);
  } catch (error) {
    // Throw the error to the main thread
    const message: TextGenWorkerMessage = {
      command: 'error',
      payload: {
        requestID,
        originalCommand: 'startTextGen',
        message: error as string
      }
    };
    postMessage(message);
  }
};
