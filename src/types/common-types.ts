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

/**
 * Type definitions
 */

export interface SimpleEventMessage {
  message: string;
}

export type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RectPoint {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PromptModel {
  task: string;
  prompt: string;
  variables: string[];
  temperature: number;
  stopSequences?: string[];
}

export type PanelName = 'harm' | 'use-case' | 'accident' | 'environment';

export interface AccidentReportData {
  [key: string]: AccidentReport;
}

export interface AccidentReport {
  reportNumber: number;
  url: string;
  title: string;
  text: string;
  imageURL: string;
  description: string;
  date: string;
  similarity?: number;
}

export type TextGenWorkerMessage =
  | {
      command: 'startTextGen';
      payload: {
        requestID: string;
        apiKey: string;
        prompt: string;
        temperature: number;
        stopSequences?: string[];
        detail?: string;
      };
    }
  | {
      command: 'finishTextGen';
      payload: {
        requestID: string;
        apiKey: string;
        result: string;
        prompt: string;
        detail: string;
      };
    }
  | {
      command: 'error';
      payload: {
        requestID: string;
        originalCommand: string;
        message: string;
      };
    };

export type TextEmbWorkerMessage =
  | {
      command: 'startEmbedding';
      payload: {
        requestID: string;
        apiKey: string;
        text: string;
      };
    }
  | {
      command: 'finishEmbedding';
      payload: {
        requestID: string;
        embedding: number[];
        apiKey: string;
      };
    }
  | {
      command: 'startQueryAccidents';
      payload: {
        requestID: string;
        apiKey: string;
        text: string;
        minScore: number;
      };
    }
  | {
      command: 'finishQueryAccidents';
      payload: {
        requestID: string;
        relevantAccidents: RelevantAccident[];
        text: string;
      };
    }
  | {
      command: 'error';
      payload: {
        requestID: string;
        originalCommand: string;
        message: string;
      };
    };

export interface RelevantAccident {
  accidentReportID: number;
  similarity: number;
}

export interface MenuItem {
  name: PanelName;
  svgIcon: string;
  selectedSVGIcon: string;
}

export interface AccidentEmbeddingData {
  embeddings: number[][];
  reportNumbers: number[];
}
