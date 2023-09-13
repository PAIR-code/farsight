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

import d3 from '../../utils/d3-import';
import {
  LitElement,
  css,
  unsafeCSS,
  html,
  PropertyValues,
  TemplateResult
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { config } from '../../utils/config';
import '../accident-card/accident-card';

import type {
  TextEmbWorkerMessage,
  AccidentReport,
  AccidentReportData,
  RelevantAccident
} from '../../types/common-types';

import TextEmbWorkerInline from '../../workers/text-emb-worker?worker&inline';
import componentCSS from './accident-panel.scss?inline';

const MAX_REPORT_NUM = 10;
const REQUEST_NAME = 'farsight';
const DEV_MODE = import.meta.env.MODE === 'development';
const USE_CACHE = import.meta.env.MODE !== 'x20';
const LIB_MODE = import.meta.env.MODE === 'library';

/**
 * Accident panel element.
 *
 */
@customElement('farsight-accident-panel')
export class FarsightAccidentPanel extends LitElement {
  // ===== Properties ======
  @property({ type: String })
  prompt = '';

  @property()
  apiKey: string | null = null;

  textEmbWorker: Worker;
  textEmbWorkerRequestID = 1;

  accidentReportMap: Map<number, AccidentReport> = new Map<
    number,
    AccidentReport
  >();

  @state()
  curRelevantAccidentReports: AccidentReport[] = [];

  /**
   * A promise that is fulfilled when this.initData() is complete
   */
  dataInitialized: Promise<void>;

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    this.textEmbWorker = new TextEmbWorkerInline();
    this.dataInitialized = this.initData().then(_ => {
      this.textEmbWorker.onmessage = (
        e: MessageEvent<TextEmbWorkerMessage>
      ) => {
        this.textEmbWorkerMessageHandler(e);
      };
    });
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    // If the prompt has been changed, we need to query relevant accidents based
    // on the new prompt. We update accidents in willUpdate() so that we can trigger
    // a new cycle of update.
    if (changedProperties.has('prompt') || changedProperties.has('apiKey')) {
      // Skip query if the prompt has not been set yet
      if (this.prompt === undefined || this.prompt === '') return;

      // Skip query if apiKey has not been set yet
      if (this.apiKey === null) return;

      // Remove current relevant accidents and show a loader
      this.curRelevantAccidentReports = [];

      // Check if we have already queried this item in the local storage cache
      const relevantAccidentsString = USE_CACHE
        ? localStorage.getItem(`<${REQUEST_NAME}>` + this.prompt)
        : null;

      if (relevantAccidentsString !== null) {
        const relevantAccidents = JSON.parse(
          relevantAccidentsString
        ) as RelevantAccident[];

        // Skip API call
        // Time out to mock the API call delay
        if (DEV_MODE) console.log('Skip embedding API call (cached)');
        window.setTimeout(
          () => {
            this.updateRelevantAccidents(relevantAccidents);
          },
          DEV_MODE ? 800 : 0
        );
      } else {
        // API call
        const message: TextEmbWorkerMessage = {
          command: 'startQueryAccidents',
          payload: {
            apiKey: this.apiKey,
            requestID: `${REQUEST_NAME}-${this.textEmbWorkerRequestID++}`,
            text: this.prompt,
            minScore: 0.6
          }
        };
        this.textEmbWorker.postMessage(message);
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {
    const accidentReports = await d3.json<AccidentReportData>(
      config.urls.accidentReports
    );
    if (accidentReports === undefined) {
      throw Error(
        `Failed to load accident reports from ${config.urls.accidentReports}`
      );
    }

    // Convert the object to a map
    for (const k of Object.keys(accidentReports)) {
      this.accidentReportMap.set(parseInt(k), accidentReports[k]);
    }
  };

  /**
   * Show the top k relevant reports
   * @param relevantAccidents New relevant accidents
   */
  updateRelevantAccidents = async (relevantAccidents: RelevantAccident[]) => {
    await this.dataInitialized;

    // Update the relevant accidents by choosing the top k relevant reports
    const newRelevantAccidentReports: AccidentReport[] = [];
    for (const [i, accident] of relevantAccidents.entries()) {
      if (i >= MAX_REPORT_NUM) break;
      const curReport = this.accidentReportMap.get(+accident.accidentReportID);
      if (curReport === undefined) {
        throw Error(
          `Cannot find report ${accident.accidentReportID} in the map.`
        );
      }

      curReport.similarity = accident.similarity;
      newRelevantAccidentReports.push(curReport);
    }

    this.curRelevantAccidentReports = newRelevantAccidentReports;
  };

  /**
   * Find relevant AI accidents based on the current prompt.
   */
  queryRelevantAccidents = () => {};

  // ===== Event Methods ======
  /**
   * Helper function to route different web worker messages
   * @param e Web worker message event
   */
  textEmbWorkerMessageHandler = (e: MessageEvent<TextEmbWorkerMessage>) => {
    switch (e.data.command) {
      case 'finishEmbedding': {
        if (e.data.payload.requestID.includes(REQUEST_NAME)) {
          console.log('finished embedding');
        }
        break;
      }

      case 'finishQueryAccidents': {
        if (e.data.payload.requestID.includes(REQUEST_NAME)) {
          const relevantAccidents = e.data.payload.relevantAccidents;
          this.updateRelevantAccidents(relevantAccidents);

          // Save the (text => accidents) pair in the local storage cache to
          // save future API calls
          const text = e.data.payload.text;
          if (USE_CACHE) {
            localStorage.setItem(
              `<${REQUEST_NAME}>` + text,
              JSON.stringify(relevantAccidents)
            );
          }
        }
        break;
      }

      case 'error': {
        // Error handling for the PaLM API calls
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  };

  // ===== Templates and Styles ======
  render() {
    // Create the template for card collections
    const cardsTemplate: TemplateResult[] = [];
    for (const item of this.curRelevantAccidentReports) {
      const curTemplate = html`
        <farsight-accident-card .accidentReport=${item}>
        </farsight-accident-card>
      `;
      cardsTemplate.push(curTemplate);
    }

    return html`
      <div
        class="loader-container"
        .hidden="${this.curRelevantAccidentReports.length !== 0}"
      >
        <div class="circle-loader"></div>
        <span class="loader-label">Searching...</span>
      </div>
      <div class="accident-panel">${cardsTemplate}</div>
    `;
  }

  static styles = [
    css`
      ${unsafeCSS(componentCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'farsight-accident-panel': FarsightAccidentPanel;
  }
}
