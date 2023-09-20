import { HarmCategory, HarmBlockThreshold } from '../types/palm-api-types';
import { FakeWorker } from './fake-worker';
import type { TextGenWorkerMessage } from '../types/common-types';
import type {
  PalmGenerateTextRequestBody,
  PalmGenerateTextResponseBody,
  SafetySetting
} from '../types/palm-api-types';

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
   * Use PaLM API to generate text based on a given prompt
   * @param apiKey PaLM API key
   * @param requestID Worker request ID
   * @param prompt Prompt to give to the PaLM model
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
