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

import { HarmCategory, HarmBlockThreshold } from '../types/palm-api-types';
import type { TextGenWorkerMessage } from '../types/common-types';
import type {
  PalmGenerateTextRequestBody,
  PalmGenerateTextResponseBody,
  SafetySetting
} from '../types/palm-api-types';

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
      category: HarmCategory.HARM_CATEGORY_DANGEROUS,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_DEROGATORY,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_MEDICAL,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUAL,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_TOXICITY,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    },
    {
      category: HarmCategory.HARM_CATEGORY_VIOLENCE,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
    }
  ];

  const parameter: PalmGenerateTextRequestBody = {
    prompt: { text: prompt },
    safetySettings: safetySettings,
    temperature,
    stopSequences
  };

  const model = 'text-bison-001';
  let url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText`;
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
    const data = (await response.json()) as PalmGenerateTextResponseBody;
    if (response.status !== 200) {
      throw Error('PaLM API error' + JSON.stringify(data));
    }

    if (data.candidates === undefined) {
      console.error('PaLM API is blocked, feedback: ', data.filters[0]);
      throw Error('PaLM API Error' + JSON.stringify(data));
    }

    // Send back the data to the main thread
    const message: TextGenWorkerMessage = {
      command: 'finishTextGen',
      payload: {
        requestID,
        apiKey,
        result: data.candidates[0].output,
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
