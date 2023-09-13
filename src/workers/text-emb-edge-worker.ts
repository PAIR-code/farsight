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

// Commented out now, use this file for in-browser embedding computation

// // import { env, pipeline } from '@xenova/transformers';
// import { tensor2d } from '@tensorflow/tfjs';
// // import type { Tensor } from '@xenova/transformers';

// import type {
//   TextEmbWorkerMessage,
//   AccidentEmbeddingData,
//   RelevantAccident
// } from '../types/common-types';
// import type { Tensor2D } from '@tensorflow/tfjs';

// const EMBEDDING_SIZE = 768;
// const MAX_RELEVANT_ACCIDENT_SIZE = 100;
// const LIB_MODE = import.meta.env.MODE === 'library';
// const EMBEDDING_JSON_REMOTE_URL =
//   'https://pub-4602ad2b5d204607b63517411edf79ca.r2.dev/data/accident-report-embeddings.json';

// // @ts-ignore
// env.allowLocalModels = false;

// // Load the embeddings for AI accidents
// let accidentEmbedding: Tensor2D | null = null;
// let accidentReportIDs: number[] | null = null;

// let jsonURL = `${import.meta.env.BASE_URL}data/accident-report-embeddings.json`;
// if (LIB_MODE) {
//   jsonURL = EMBEDDING_JSON_REMOTE_URL;
// }
// const accidentPromise = fetch(jsonURL)
//   .then((response: Response) => response.json())
//   .then((jsonData: AccidentEmbeddingData) => {
//     // Convert the embedding matrix to a tf tensor
//     accidentEmbedding = tensor2d(jsonData.embeddings, [
//       jsonData.embeddings.length,
//       jsonData.embeddings[0].length
//     ]);
//     accidentReportIDs = jsonData.reportNumbers;
//   })
//   .catch((error: Error) => {
//     throw Error('Failed to load accident report embeddings', error);
//   });

// /**
//  * Helper function to handle calls from the main thread
//  * @param e Message event
//  */
// self.onmessage = (e: MessageEvent<TextEmbWorkerMessage>) => {
//   switch (e.data.command) {
//     case 'startEmbedding': {
//       console.log('start!');
//       startEmbedding(e.data.payload.requestID, e.data.payload.text);
//       break;
//     }

//     case 'startQueryAccidents': {
//       startQueryAccidents(
//         e.data.payload.requestID,
//         e.data.payload.text,
//         e.data.payload.minScore
//       );
//       break;
//     }

//     default: {
//       console.error('Worker: unknown message', e.data.command);
//       break;
//     }
//   }
// };

// /**
//  * Use PaLM API to generate text embedding for the given text
//  * @param apiKey PaLM API key
//  * @param requestID Worker request ID
//  * @param text Text to generate embedding from
//  */
// const startEmbedding = async (requestID: string, text: string) => {
//   try {
//     const embedding = [123];

//     console.time('generating embedding');
//     let extractor = await pipeline(
//       'feature-extraction',
//       'xiaohk/all-MiniLM-L6-v2'
//     );
//     let output = (await extractor(text, {
//       pooling: 'mean',
//       normalize: true
//     })) as Tensor;

//     console.timeEnd('generating embedding');
//     console.log(output.tolist());

//     // Send back the data to the main thread
//     const message: TextEmbWorkerMessage = {
//       command: 'finishEmbedding',
//       payload: {
//         requestID,
//         embedding
//       }
//     };
//     postMessage(message);
//   } catch (error) {
//     // Throw the error to the main thread
//     const message: TextEmbWorkerMessage = {
//       command: 'error',
//       payload: {
//         requestID,
//         originalCommand: 'startEmbedding',
//         message: error as string
//       }
//     };
//     postMessage(message);
//   }
// };

// const startQueryAccidents = async (
//   requestID: string,
//   text: string,
//   minScore: number
// ) => {
//   try {
//     // First wait until we have loaded the accident report embeddings
//     await accidentPromise;
//     if (accidentEmbedding === null || accidentReportIDs === null) {
//       throw Error('Failed to load accident embedding data');
//     }

//     // Find the most similar accident reports
//     const embedding = [123];
//     const embeddingTensor = tensor2d(embedding, [embedding.length, 1]);

//     // Similarity score is a dot product of two embeddings, because PaLM embeddings
//     // have been normalized
//     const similarityScores = (
//       accidentEmbedding
//         .matMul(embeddingTensor)
//         .reshape([1, accidentEmbedding.shape[0]])
//         .arraySync() as number[][]
//     )[0];

//     // Collect all report IDs with similarity score above the minScore
//     const relevantAccidents: RelevantAccident[] = [];
//     for (const [i, s] of similarityScores.entries()) {
//       if (s >= minScore) {
//         relevantAccidents.push({
//           accidentReportID: accidentReportIDs[i],
//           similarity: s
//         });
//       }
//     }

//     // Sort the relevant accidents based on the similarity score
//     relevantAccidents.sort((a, b) => b.similarity - a.similarity);

//     // Send back the data to the main thread
//     const message: TextEmbWorkerMessage = {
//       command: 'finishQueryAccidents',
//       payload: {
//         requestID,
//         // Only keep the top accidents (the results can be 2k+)
//         relevantAccidents: relevantAccidents.slice(
//           0,
//           MAX_RELEVANT_ACCIDENT_SIZE
//         ),
//         text
//       }
//     };
//     postMessage(message);
//   } catch (error) {
//     // Throw the error to the main thread
//     const message: TextEmbWorkerMessage = {
//       command: 'error',
//       payload: {
//         requestID,
//         originalCommand: 'startEmbedding',
//         message: error as string
//       }
//     };
//     postMessage(message);
//   }
// };
