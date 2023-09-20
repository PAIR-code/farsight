import { tensor2d } from '@tensorflow/tfjs';
import { config } from '../utils/config';
import { round } from '@xiaohk/utils';
import { FakeWorker } from './fake-worker';

import type {
  TextEmbWorkerMessage,
  AccidentEmbeddingData,
  RelevantAccident
} from '../types/common-types';
import type {
  PalmEmbedTextRequestBody,
  PalmEmbedTextResponseBody
} from '../types/palm-api-types';
import type { Tensor2D } from '@tensorflow/tfjs';

const EMBEDDING_SIZE = 768;
const MAX_RELEVANT_ACCIDENT_SIZE = 300;
const JSON_GZIP_URL = config.urls.accidentEmbeddingCompressed;

// Load the embeddings for AI accidents
let accidentEmbedding: Tensor2D | null = null;
let accidentReportIDs: number[] | null = null;

const decompress = async (url: string) => {
  const ds = new DecompressionStream('gzip');
  const response = await fetch(url);
  const blob_in = await response.blob();
  const stream_in = blob_in.stream().pipeThrough(ds);
  const blob_out = await new Response(stream_in).blob();
  const text = await blob_out.text();
  return text;
};

const accidentPromise = decompress(JSON_GZIP_URL)
  .then(result => {
    const jsonData = JSON.parse(result) as AccidentEmbeddingData;
    // Convert the embedding matrix to a tf tensor
    accidentEmbedding = tensor2d(jsonData.embeddings, [
      jsonData.embeddings.length,
      jsonData.embeddings[0].length
    ]);
    accidentReportIDs = jsonData.reportNumbers;
  })
  .catch((error: Error) => {
    throw Error(`Failed to load accident report embeddings: ${error}`);
  });

export class EmbFakeWorker extends FakeWorker<TextEmbWorkerMessage> {
  constructor(
    workerMessageHandler: (e: MessageEvent<TextEmbWorkerMessage>) => void
  ) {
    super(workerMessageHandler);
  }

  postMessage(message: TextEmbWorkerMessage) {
    switch (message.command) {
      case 'startEmbedding': {
        this.startEmbedding(
          message.payload.apiKey,
          message.payload.requestID,
          message.payload.text
        );
        break;
      }

      case 'startQueryAccidents': {
        this.startQueryAccidents(
          message.payload.apiKey,
          message.payload.requestID,
          message.payload.text,
          message.payload.minScore
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
   * Use PaLM API to generate text embedding for the given text
   * @param apiKey PaLM API key
   * @param requestID Worker request ID
   * @param text Text to generate embedding from
   */
  startEmbedding = async (apiKey: string, requestID: string, text: string) => {
    try {
      const embedding = await _queryEmbedding(apiKey, text);

      // Send back the data to the main thread
      const message: TextEmbWorkerMessage = {
        command: 'finishEmbedding',
        payload: {
          requestID,
          embedding,
          apiKey
        }
      };

      const messageEvent = new MessageEvent('message', { data: message });
      this.workerMessageHandler(messageEvent);
    } catch (error) {
      // Throw the error to the main thread
      const message: TextEmbWorkerMessage = {
        command: 'error',
        payload: {
          requestID,
          originalCommand: 'startEmbedding',
          message: error as string
        }
      };
      const messageEvent = new MessageEvent('message', { data: message });
      this.workerMessageHandler(messageEvent);
    }
  };

  startQueryAccidents = async (
    apiKey: string,
    requestID: string,
    text: string,
    minScore: number
  ) => {
    try {
      // First wait until we have loaded the accident report embeddings
      await accidentPromise;
      if (accidentEmbedding === null || accidentReportIDs === null) {
        throw Error('Failed to load accident embedding data');
      }

      // Find the most similar accident reports
      const embedding = await _queryEmbedding(apiKey, text);
      const embeddingTensor = tensor2d(embedding, [embedding.length, 1]);

      // Similarity score is a dot product of two embeddings, because PaLM embeddings
      // have been normalized
      const similarityScores = (
        accidentEmbedding
          .matMul(embeddingTensor)
          .reshape([1, accidentEmbedding.shape[0]])
          .arraySync() as number[][]
      )[0];

      // Collect all report IDs with similarity score above the minScore
      const relevantAccidents: RelevantAccident[] = [];
      for (const [i, s] of similarityScores.entries()) {
        if (s >= minScore) {
          relevantAccidents.push({
            accidentReportID: accidentReportIDs[i],
            similarity: round(s, 6)
          });
        }
      }

      // Sort the relevant accidents based on the similarity score
      relevantAccidents.sort((a, b) => b.similarity - a.similarity);

      // Send back the data to the main thread
      const message: TextEmbWorkerMessage = {
        command: 'finishQueryAccidents',
        payload: {
          requestID,
          // Only keep the top accidents (the results can be 2k+)
          relevantAccidents: relevantAccidents.slice(
            0,
            MAX_RELEVANT_ACCIDENT_SIZE
          ),
          text
        }
      };
      const messageEvent = new MessageEvent('message', { data: message });
      this.workerMessageHandler(messageEvent);
    } catch (error) {
      // Throw the error to the main thread
      const message: TextEmbWorkerMessage = {
        command: 'error',
        payload: {
          requestID,
          originalCommand: 'startEmbedding',
          message: error as string
        }
      };
      const messageEvent = new MessageEvent('message', { data: message });
      this.workerMessageHandler(messageEvent);
    }
  };
}

/**
 * Query embedding for the given text
 * @param apiKey PaLM api key
 * @param text text to embed
 * @returns Embedding values
 */
const _queryEmbedding = async (apiKey: string, text: string) => {
  // PaLM does not support empty string, we just return 0 vector for early exit
  if (text === '') {
    return new Array<number>(EMBEDDING_SIZE).fill(0.0);
  }

  const parameter: PalmEmbedTextRequestBody = {
    text
  };

  const model = 'embedding-gecko-001';
  let url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:embedText`;
  const urlParam = new URLSearchParams();
  urlParam.append('key', apiKey);
  url += `?${urlParam.toString()}`;

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parameter)
  };

  const response = await fetch(url, requestOptions);
  const data = (await response.json()) as PalmEmbedTextResponseBody;
  if (response.status !== 200) {
    throw Error('PaLM API error' + JSON.stringify(data));
  }

  return data.embedding.value;
};
