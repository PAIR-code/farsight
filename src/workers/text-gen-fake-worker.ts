import { FakeWorker } from './fake-worker';
import type { TextGenWorkerMessage } from '../types/common-types';
import {
  GeminiGenerateTextRequestBody,
  GeminiGenerateTextResponseBody,
  HarmCategory,
  SafetySetting,
  HarmBlockThreshold
} from '../types/gemini-types';

export class TextGenFakeWorker extends FakeWorker<TextGenWorkerMessage> {
  constructor(
    workerMessageHandler: (e: MessageEvent<TextGenWorkerMessage>) => void
  ) {
    super(workerMessageHandler);
  }

  postMessage(message: TextGenWorkerMessage) {
    switch (message.command) {
      case 'startTextGen': {
        let stopSequences: string[] = [];
        if (message.payload.stopSequences !== undefined) {
          stopSequences = message.payload.stopSequences;
        }

        let detail = '';
        if (message.payload.detail !== undefined) {
          detail = message.payload.detail;
        }

        this.startTextGen(
          message.payload.apiKey,
          message.payload.requestID,
          message.payload.prompt,
          message.payload.temperature,
          stopSequences,
          detail
        );
        break;
      }

      default: {
        console.error('Worker: unknown message', message.command);
        break;
      }
    }
  }

  /**
   * Use Gemini API to generate text based on a given prompt
   * @param apiKey Gemini API key
   * @param requestID Worker request ID
   * @param prompt Prompt to give to the Gemini model
   * @param temperature Model temperature
   */
  async startTextGen(
    apiKey: string,
    requestID: string,
    prompt: string,
    temperature: number,
    stopSequences: string[],
    detail: string
  ) {
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

      const messageEvent = new MessageEvent('message', {
        data: message
      });
      this.workerMessageHandler(messageEvent);
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

      const messageEvent = new MessageEvent('message', {
        data: message
      });
      this.workerMessageHandler(messageEvent);
    }
  }
}
