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

/* eslint-disable lit/attribute-value-entities */
import d3 from '../../utils/d3-import';
import {
  downloadText,
  tooltipMouseEnter,
  tooltipMouseLeave
} from '@xiaohk/utils';
import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import {
  startLogoBlinkAnimation,
  stopLogoAnimation
} from '../container-signal/container-signal';
import type { SignalMessage } from '../container-signal/container-signal';
import { config } from '../../utils/config';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  parseUseCaseResponse,
  parseStakeholderResponse,
  parseHarmResponse,
  parseTags,
  createEmptyChild
} from '../harm-panel/envision-tree';
import { addLoader } from '../harm-panel/envision-tree-draw';
import { UseCaseCategories } from '../harm-panel/harm-types';
import {
  summaryPrompt,
  useCasePrompt,
  stakeholderPrompt,
  harmPrompt
} from '../../data/static-data';
import { TextEmbFakeWorker } from '../../workers/text-emb-fake-worker';
import { TextGenFakeWorker } from '../../workers/text-gen-fake-worker';

import type {
  UseCaseNodeData,
  StakeholderNodeData
} from '../harm-panel/harm-types';
import type { TooltipConfig } from '@xiaohk/utils';
import type { FakeWorker } from '../../workers/fake-worker';
import type {
  AccidentReportData,
  AccidentReport,
  RelevantAccident,
  TextEmbWorkerMessage,
  TextGenWorkerMessage,
  SimpleEventMessage
} from '../../types/common-types';

import '../modal-auth/modal-auth';

import componentCSS from './container-lite.scss?inline';
import TextEmbWorkerInline from '../../workers/text-emb-worker?worker&inline';
import TextGenWorkerInline from '../../workers/text-gen-worker?worker&inline';

import checkIcon from '../../images/icon-check-5.svg?raw';
import crossIcon from '../../images/icon-cross-5.svg?raw';
import alertIcon from '../../images/icon-alert-5.svg?raw';
import questionIcon from '../../images/icon-question.svg?raw';
import logoIcon from '../../images/icon-logo.svg?raw';
import angleIcon from '../../images/icon-angle.svg?raw';
import crossStrokeIcon from '../../images/icon-cross-2.svg?raw';
import harmIcon from '../../images/icon-arrow-down-right.svg?raw';
import playIcon from '../../images/icon-binocular.svg?raw';

// TODO: remove me after user study
const LITE_MODE = false;

const USE_API = true;
const USE_CACHE = import.meta.env.MODE !== 'x20';
const DEV_MODE = import.meta.env.MODE === 'development';
const LIB_MODE = import.meta.env.MODE === 'library';
const EXTENSION_MODE = import.meta.env.MODE === 'extension';
let MAX_ACCIDENTS_PER_PAGE = 4;
const MAX_ACCIDENTS = 20;
const MAX_USE_CASE_PER_CAT = 3;
const REQUEST_NAME = 'farsight';
const ACCIDENT_CARD_HEIGHT = 35;
const ACCIDENT_LIST_GAP = 9;
const STORAGE = DEV_MODE ? localStorage : sessionStorage;

enum UseCaseTab {
  ALL = 'All',
  INTENDED = 'Intended',
  HIGH_STAKES = 'High-stakes',
  MISUSE = 'Misuse'
}

enum AccidentTab {
  LATEST = 'Latest',
  RELATED = 'Related'
}

interface UseCaseData extends UseCaseNodeData {
  harm: string;
}

const ALL_CATEGORY_COMPOSITION = {
  [UseCaseCategories.INTENDED]: 1,
  [UseCaseCategories.HIGH_STAKES]: 1,
  [UseCaseCategories.MISUSE]: 1
};
const USE_CASE_ICON_MAP = {
  [UseCaseCategories.INTENDED]: unsafeHTML(checkIcon),
  [UseCaseCategories.HIGH_STAKES]: unsafeHTML(alertIcon),
  [UseCaseCategories.MISUSE]: unsafeHTML(crossIcon)
};

/**
 * Container lite element.
 */
@customElement('farsight-container-lite')
export class FarsightContainerLite extends LitElement {
  // ===== Class properties ======
  @property({ type: String })
  prompt = '';
  summary = '';

  @property({ attribute: false })
  apiKey: string | null = null;
  apiKeyPromise: Promise<void>;
  apiKeyPromiseResolve: () => void;

  @property({ type: Boolean })
  notebookMode = false;

  @state()
  selectedUseCaseTab = UseCaseTab.ALL;

  @state()
  selectedAccidentTab = AccidentTab.LATEST;

  @state()
  curLatestAccidentPage = 0;
  totalLatestAccidentPage = 1;

  @state()
  curRelevantAccidentPage = 0;
  totalRelevantAccidentPage = 1;

  @query('.tab-indicator-use-case')
  useCaseTabIndicatorElement: HTMLElement | undefined;

  @query('.tab-indicator-accident')
  accidentTabIndicatorElement: HTMLElement | undefined;

  @query('.container-lite')
  containerElement: HTMLElement | undefined;

  @query('#popper-tooltip-top')
  popperElementTop!: HTMLElement;
  tooltipTop: TooltipConfig | null = null;

  @state()
  useCases: { [key in UseCaseTab]: UseCaseData[] };

  @state()
  pendingHarmUseCaseIDs = new Set<string>();

  @state()
  isUseCaseGenFailed = false;

  @state()
  generatingNewUseCases = false;

  @state()
  useCasesInitialized = false;

  dataInitialized: Promise<void>;
  isLoading = false;

  accidentReportMap: Map<number, AccidentReport> = new Map<
    number,
    AccidentReport
  >();
  errorImageSrc = config.urls.errorImage;

  @state()
  curRelevantAccidentReports: AccidentReport[] = [];

  @state()
  latestAccidentReports: AccidentReport[] = [];

  textEmbWorker: Worker | FakeWorker<TextEmbWorkerMessage>;
  textEmbWorkerRequestID = 1;

  textGenWorker: Worker | FakeWorker<TextGenWorkerMessage>;
  textGenWorkerRequestID = 1;

  randomSeed = d3.randomLcg(0.20230505);
  shuffle = d3.shuffler(this.randomSeed);

  resizeObserver: ResizeObserver;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
    this.apiKeyPromiseResolve = () => {};
    this.apiKeyPromise = new Promise((resolve, _) => {
      this.apiKeyPromiseResolve = resolve;
    });

    this.useCases = this.createNewEmptyUseCases();

    this.resizeObserver = new ResizeObserver(() => {
      // Update the tab indicator position when the user resizes the component
      this.positionTabIndicator(false, 'use-case');
      this.positionTabIndicator(false, 'accident');
    });

    this.dataInitialized = this.initData();

    if (!EXTENSION_MODE) {
      this.textGenWorker = new TextGenWorkerInline();
      this.textGenWorker.onmessage = (
        e: MessageEvent<TextGenWorkerMessage>
      ) => {
        this.textGenWorkerMessageHandler(e);
      };

      this.textEmbWorker = new TextEmbWorkerInline();
      this.textEmbWorker.onmessage = (
        e: MessageEvent<TextEmbWorkerMessage>
      ) => {
        this.textEmbWorkerMessageHandler(e);
      };
    } else {
      // Use fake workers for extension build
      const textGenWorkerMessageHandler = (
        e: MessageEvent<TextGenWorkerMessage>
      ) => {
        this.textGenWorkerMessageHandler(e);
      };
      this.textGenWorker = new TextGenFakeWorker(textGenWorkerMessageHandler);

      const textEmbWorkerMessageHandler = (
        e: MessageEvent<TextEmbWorkerMessage>
      ) => {
        this.textEmbWorkerMessageHandler(e);
      };
      this.textEmbWorker = new TextEmbFakeWorker(textEmbWorkerMessageHandler);
    }
  }

  firstUpdated() {
    this.resizeObserver.observe(this.containerElement!);

    // Change the number of incidents per page depending on the sidebar height
    if (this.containerElement) {
      const bbox = this.containerElement.getBoundingClientRect();
      if (bbox.height < 510) {
        MAX_ACCIDENTS_PER_PAGE = 2;
      } else if (bbox.height < 750) {
        MAX_ACCIDENTS_PER_PAGE = 3;
      }
    }

    // Set a minimum height for the accident list to avoid flickering between
    // loading.
    const accidentList = this.renderRoot.querySelector(
      '.accident-list'
    ) as HTMLElement;
    if (accidentList) {
      accidentList.style.setProperty(
        'height',
        `${
          ACCIDENT_CARD_HEIGHT * MAX_ACCIDENTS_PER_PAGE +
          (MAX_ACCIDENTS_PER_PAGE - 1) * ACCIDENT_LIST_GAP
        }px`
      );
    }

    // Set up the loaders
    const loaderAccident = this.renderRoot.querySelector(
      '#loader-container-accident'
    ) as HTMLDivElement;
    addLoader(d3.select(loaderAccident), false);

    const loaderUseCase = this.renderRoot.querySelector(
      '#loader-container-use-case'
    ) as HTMLDivElement;
    addLoader(d3.select(loaderUseCase), false);

    // Bind the tooltip
    if (this.popperElementTop) {
      this.tooltipTop = {
        tooltipElement: this.popperElementTop,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }

    // Listen to API set event from the signal
    window.addEventListener('message', (e: MessageEvent<SignalMessage>) => {
      if (e.data.command && e.data.command === 'palmAPIKeyAdded') {
        this.apiKey = e.data.payload.apiKey;
        this.apiKeyPromiseResolve();
      }
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
    if (changedProperties.has('prompt')) {
      // Skip query if the prompt has not been set yet
      if (this.prompt === undefined || this.prompt === '') return;

      if (changedProperties.get('prompt') === '') {
        // Switch the accident tab if it's the first time that the user gives a
        // prompt
        this.selectedAccidentTab = AccidentTab.RELATED;
        this.positionTabIndicator(true, 'accident');
      }

      this.generatingNewUseCases = true;

      // Update accidents and use cases once the api key is set
      this.apiKeyPromise.then(() => {
        this.handleNewPrompt();
      });
    }
  }

  // ===== Custom Methods ======
  async initData() {
    const accidentReports = await d3.json<AccidentReportData>(
      config.urls.accidentReports
    );

    if (accidentReports === undefined) {
      throw Error(
        `Failed to load accident reports from ${config.urls.accidentReports}`
      );
    }

    // Convert the object to a map
    type DateIDPair = [Date, number];

    const reportDateIDs: DateIDPair[] = [];
    for (const k of Object.keys(accidentReports)) {
      this.accidentReportMap.set(parseInt(k), accidentReports[k]);
      const curDate = new Date(accidentReports[k].date);
      reportDateIDs.push([curDate, parseInt(k)]);

      // If the report is a tweet, use its content as title
      const tweetRegex = /Tweet: @.*/;
      if (tweetRegex.test(accidentReports[k].title)) {
        accidentReports[k].title = accidentReports[k].text;
      }
    }

    // Get the latest K reports
    const latestIDs = d3
      .quickselect(
        reportDateIDs,
        MAX_ACCIDENTS - 1,
        0,
        reportDateIDs.length - 1,
        (a, b) =>
          +(b as unknown as DateIDPair)[0] - +(a as unknown as DateIDPair)[0]
      )
      .slice(0, MAX_ACCIDENTS)
      .sort((a, b) => +b[0] - +a[0]);

    this.latestAccidentReports = latestIDs.map(
      d => this.accidentReportMap.get(d[1])!
    );

    // Update the page information
    this.totalLatestAccidentPage = Math.ceil(
      this.latestAccidentReports.length / MAX_ACCIDENTS_PER_PAGE
    );
  }

  createNewEmptyUseCases() {
    const useCases: { [key in UseCaseTab]: UseCaseData[] } = {
      [UseCaseTab.ALL]: [],
      [UseCaseTab.INTENDED]: [],
      [UseCaseTab.HIGH_STAKES]: [],
      [UseCaseTab.MISUSE]: []
    };
    return useCases;
  }

  /**
   * Find similar accident reports, generate summary and use cases for the new
   * prompt. This method should be called after the api key is set.
   */
  handleNewPrompt() {
    if (this.apiKey === null) {
      throw Error('handleNewPrompt: API key is not set yet.');
    }

    this.isUseCaseGenFailed = false;

    // Reset the relevant accident pagination
    this.curRelevantAccidentPage = 0;

    // Remove current relevant accidents and show a loader
    this.curRelevantAccidentReports = [];

    // Query embedding and surface relevant accidents
    // Check if we have already queried this item in the local storage cache
    const relevantAccidentsString = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + this.prompt)
      : null;

    if (relevantAccidentsString !== null) {
      const relevantAccidents = JSON.parse(
        relevantAccidentsString
      ) as RelevantAccident[];

      // Skip API call
      // Time out to mock the API call delay
      if (DEV_MODE) {
        console.log('Skip embedding API call (cached, lite)');
      }

      window.setTimeout(
        () => {
          this.dataInitialized.then(() => {
            this.updateRelevantAccidents(relevantAccidents);
          });
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

    // Generate a summary for the prompt
    const compiledPrompt = summaryPrompt.prompt.replace(
      '{{userPrompt}}',
      this.prompt
    );

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;
    if (DEV_MODE && response !== null) {
      // Skip API call
      // Time out to mock the API call delay
      if (DEV_MODE)
        console.log('Skip text gen API call (prompt summary, cached, lite)');
      window.setTimeout(
        () => {
          this.generateUseCases(response);
        },
        DEV_MODE ? 1000 : 0
      );
    } else {
      // API call
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-summary-${this.textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0
        }
      };
      this.textGenWorker.postMessage(message);
    }
  }

  /**
   * Generate use cases from the prompt summary
   * @param summary Prompt summary
   */
  generateUseCases(summary: string) {
    // Call the LLM API to generate use cases
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    const compiledPrompt = useCasePrompt.prompt.replace(
      `{{${useCasePrompt.variables[0]}}}`,
      summary
    );

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (DEV_MODE && response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE)
        console.log('Skip text gen API call (use case, cached, lite)');
      window.setTimeout(
        () => {
          this.useCaseResponseUpdated(response);
        },
        DEV_MODE ? 100 : 800
      );
    } else {
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-use-case-${this
            .textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0
        }
      };
      this.textGenWorker.postMessage(message);
    }
  }

  async useCaseResponseUpdated(response: string) {
    const [_, useCases] = parseUseCaseResponse(response);

    // Put use cases into different categories
    const newUseCases = this.createNewEmptyUseCases();
    this.generatingNewUseCases = false;

    for (const useCase of useCases) {
      const useCaseWithHarm = useCase as UseCaseData;
      useCaseWithHarm.harm = '';
      switch (useCase.category) {
        case UseCaseCategories.INTENDED: {
          if (newUseCases.Intended.length < MAX_USE_CASE_PER_CAT) {
            newUseCases.Intended.push(useCaseWithHarm);
          }
          break;
        }

        case UseCaseCategories.HIGH_STAKES: {
          if (newUseCases['High-stakes'].length < MAX_USE_CASE_PER_CAT) {
            newUseCases['High-stakes'].push(useCaseWithHarm);
          }
          break;
        }

        case UseCaseCategories.MISUSE: {
          if (newUseCases.Misuse.length < MAX_USE_CASE_PER_CAT) {
            newUseCases.Misuse.push(useCaseWithHarm);
          }
          break;
        }

        default: {
          throw Error(`Unknown category ${useCase.category}`);
        }
      }
    }

    // Sample use cases from these three categories to the 'All' category
    newUseCases.All.push(
      ...newUseCases.Intended.slice(0, ALL_CATEGORY_COMPOSITION['Intended'])
    );
    newUseCases.All.push(
      ...newUseCases['High-stakes'].slice(
        0,
        ALL_CATEGORY_COMPOSITION['High-stakes']
      )
    );
    newUseCases.All.push(
      ...newUseCases.Misuse.slice(0, ALL_CATEGORY_COMPOSITION['Misuse'])
    );

    this.useCases = newUseCases;

    // Create loaders if this is the first time use cases are added
    await this.updateComplete;
    if (!this.useCasesInitialized) {
      const loaderWrappers = this.shadowRoot?.querySelectorAll<HTMLDivElement>(
        '.use-case-loader-wrapper'
      );
      if (loaderWrappers) {
        for (const loaderWrapper of loaderWrappers) {
          const select = d3.select(loaderWrapper);
          addLoader(select, true);
        }
      }
    }

    // Automatically generate stakeholders and harms for the use cases shown in
    // the "all" panel
    for (const useCase of newUseCases.All) {
      this.pendingHarmUseCaseIDs.add(useCase.id);
      this.generateStakeholders(useCase);
    }

    this.useCasesInitialized = true;
    this.requestUpdate();
  }

  generateStakeholders = (useCaseNodeData: UseCaseNodeData) => {
    // Call the LLM API to generate use cases
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    const compiledPrompt = stakeholderPrompt.prompt
      .replace('{{functionality}}', this.summary)
      .replace('{{usecase}}', useCaseNodeData.text);

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE) console.log('Skip text gen API call (stakeholder, cached)');
      window.setTimeout(
        () => {
          this.stakeholderResponseUpdated(useCaseNodeData.id, response);
        },
        DEV_MODE ? 100 : 800
      );
    } else {
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-stakeholder-${this
            .textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0,
          detail: useCaseNodeData.id
        }
      };
      if (stakeholderPrompt.stopSequences !== undefined) {
        message.payload.stopSequences = stakeholderPrompt.stopSequences;
      }
      this.textGenWorker.postMessage(message);
    }
  };

  /**
   * Find the use case node data with the id string
   * @param useCaseNodeDataID ID for the use case node
   */
  _getUseCaseNode(useCaseNodeDataID: string) {
    let useCaseNode: UseCaseData | null = null;
    for (const key of [
      UseCaseTab.ALL,
      UseCaseTab.HIGH_STAKES,
      UseCaseTab.INTENDED,
      UseCaseTab.MISUSE
    ]) {
      const curKey = key as UseCaseTab;
      const curUseCases = this.useCases[curKey];

      for (const useCase of curUseCases) {
        if (useCase.id === useCaseNodeDataID) {
          useCaseNode = useCase;
          break;
        }
      }

      if (useCaseNode !== null) break;
    }
    return useCaseNode;
  }

  stakeholderResponseUpdated(useCaseNodeDataID: string, response: string) {
    // Find the use case node
    const useCaseNode = this._getUseCaseNode(useCaseNodeDataID);

    if (useCaseNode !== null) {
      const [_, stakeholders] = parseStakeholderResponse(response);
      // Generate harm for the first stakeholder
      if (stakeholders.length > 0) {
        useCaseNode.children.push(stakeholders[0]);
        this.generateHarms(useCaseNode, stakeholders[0].text);
      }
    }
  }

  /**
   * Use AI to generate harms
   */
  generateHarms = (useCaseNodeData: UseCaseNodeData, stakeholder: string) => {
    // Call the LLM API to generate harms
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    const compiledPrompt = harmPrompt.prompt
      .replace('{{functionality}}', this.summary)
      .replace('{{usecase}}', useCaseNodeData.text)
      .replace('{{stakeholder}}', stakeholder);

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE) console.log('Skip text gen API call (harm, cached)');
      window.setTimeout(
        () => {
          this.harmResponseUpdated(useCaseNodeData.id, stakeholder, response);
        },
        DEV_MODE ? 100 : 800
      );
    } else {
      const detail = JSON.stringify([useCaseNodeData.id, stakeholder]);
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-harm-${this.textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0,
          detail
        }
      };
      if (harmPrompt.stopSequences !== undefined) {
        message.payload.stopSequences = harmPrompt.stopSequences;
      }
      this.textGenWorker.postMessage(message);
    }
  };

  harmResponseUpdated(
    useCaseNodeDataID: string,
    stakeholder: string,
    response: string
  ) {
    const useCaseNode = this._getUseCaseNode(useCaseNodeDataID);
    const emptyStakeholderNode = createEmptyChild(
      'stakeholder'
    ) as StakeholderNodeData;
    emptyStakeholderNode.text = stakeholder;

    const [_, harmCandidateNodes] = parseHarmResponse(
      response,
      emptyStakeholderNode
    );

    if (useCaseNode && harmCandidateNodes.length > 0) {
      useCaseNode.harm = harmCandidateNodes[0].text;
    }

    // Stop the loader
    this.pendingHarmUseCaseIDs.delete(useCaseNodeDataID);

    this.requestUpdate();
  }

  /**
   * Move the tab indicator to the right position based on the currently selected
   * use case tab item.
   */
  positionTabIndicator(showTransition: boolean, list: 'use-case' | 'accident') {
    let tabIndicatorElement = this.useCaseTabIndicatorElement;
    let selectedTab: UseCaseTab | AccidentTab = this.selectedUseCaseTab;
    let color = config.colors['blue-600'];

    if (list === 'use-case') {
      switch (selectedTab) {
        case UseCaseTab.INTENDED: {
          color = config.colors['green-500'];
          break;
        }
        case UseCaseTab.HIGH_STAKES: {
          color = config.colors['orange-500'];
          break;
        }
        case UseCaseTab.MISUSE: {
          color = config.colors['red-500'];
          break;
        }
        default: {
          break;
        }
      }
    }

    if (list === 'accident') {
      tabIndicatorElement = this.accidentTabIndicatorElement;
      selectedTab = this.selectedAccidentTab;
    }

    // Get the bbox of the target tab item
    const tabNode = this.renderRoot.querySelector(
      `#tab-item-${selectedTab.toLowerCase()}`
    );
    if (tabNode === null) {
      throw Error(
        `Failed to find tab node '${selectedTab.toLocaleLowerCase()}.'`
      );
    }

    const containerBBox = this.containerElement!.getBoundingClientRect();
    const bbox = tabNode.getBoundingClientRect();
    const xOffset = bbox.x - containerBBox.x;

    // Move the tab indicator
    if (tabIndicatorElement !== undefined) {
      if (!showTransition) {
        tabIndicatorElement?.classList.add('no-transition');
      }

      tabIndicatorElement.style.width = `${Math.min(100, bbox.width)}px`;
      tabIndicatorElement.style.left = `${xOffset + bbox.width / 2}px`;
      tabIndicatorElement.style.backgroundColor = color;

      if (!showTransition) {
        window.setTimeout(() => {
          tabIndicatorElement?.classList.remove('no-transition');
        }, 0);
      }
    } else {
      console.error('Undefined tabIndicator');
    }
  }

  /**
   * Show the top k relevant reports
   * @param relevantAccidents New relevant accidents
   */
  updateRelevantAccidents(relevantAccidents: RelevantAccident[]) {
    // Update the relevant accidents by choosing the top k relevant reports
    const newRelevantAccidentReports: AccidentReport[] = [];
    for (const [i, accident] of relevantAccidents.entries()) {
      if (i >= MAX_ACCIDENTS) break;
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

    // Update the page information for the relevant accidents
    this.totalRelevantAccidentPage = Math.ceil(
      this.curRelevantAccidentReports.length / MAX_ACCIDENTS_PER_PAGE
    );
  }

  // ===== Event Methods ======
  useCaseTabClicked(tab: UseCaseTab) {
    this.selectedUseCaseTab = tab;
    this.positionTabIndicator(true, 'use-case');
  }

  accidentTabClicked(tab: AccidentTab) {
    this.selectedAccidentTab = tab;
    this.positionTabIndicator(true, 'accident');
  }

  handleAPIKeyAdded(e: CustomEvent<SimpleEventMessage>) {
    this.apiKey = e.detail.message;
    this.apiKeyPromiseResolve();
  }

  segueButtonClicked(e: MouseEvent) {
    if (this.prompt === '') return;

    if (LITE_MODE) {
      let html =
        '<table><tr><th>Select</th><th>Use Case</th><th>Stakeholder</th><th>Harm</th></tr>';

      for (const tab of [
        UseCaseTab.INTENDED,
        UseCaseTab.HIGH_STAKES,
        UseCaseTab.MISUSE
      ]) {
        for (const useCase of this.useCases[tab]) {
          const useCaseText = `${useCase.text}`;

          if (useCase.harm !== '') {
            const harmText = useCase.harm.replace('/\n/g', '');
            html += `<tr>
              <td></td>
              <td>${useCaseText}</td>
              <td>${useCase.children[0].text}</td>
              <td>${harmText}</td>
            </tr>`;
          } else {
            html += `<tr>
              <td></td>
              <td>${useCaseText}</td>
              <td></td>
              <td></td>
            </tr>`;
          }
        }
      }
      html += '</table>';

      const blobInput = new Blob([html], { type: 'text/html' });
      const clipboardItemInput = new ClipboardItem({ 'text/html': blobInput });
      navigator.clipboard.write([clipboardItemInput]);

      tooltipMouseEnter(e, 'Copied', 'top', this.tooltipTop, 100, undefined, 6);
      window.setTimeout(() => {
        tooltipMouseLeave(this.tooltipTop);
      }, 2000);
      return;
    }

    const event = new Event('launch-farsight', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  closeButtonClicked() {
    const event = new Event('close-lite', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Helper function to route different web worker messages
   * @param e Web worker message event
   */
  async textEmbWorkerMessageHandler(e: MessageEvent<TextEmbWorkerMessage>) {
    await this.dataInitialized;
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
            STORAGE.setItem(
              `<${REQUEST_NAME}>` + text,
              JSON.stringify(relevantAccidents)
            );
          }
        }
        break;
      }

      case 'error': {
        // Error handling for the PaLM API calls
        console.error('PaLM API error during text emb: ', e.data);
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  }

  /**
   * Helper function to route different web worker messages
   * @param e Web worker message event
   */
  textGenWorkerMessageHandler(e: MessageEvent<TextGenWorkerMessage>) {
    const responseRequestID = e.data.payload.requestID;
    switch (e.data.command) {
      case 'finishTextGen': {
        if (responseRequestID.includes(REQUEST_NAME)) {
          if (responseRequestID.includes('summary')) {
            const summaryResponse = e.data.payload.result;

            // Parse the summary
            this.summary = parseTags(summaryResponse, 'summary')[0];
            this.generateUseCases(this.summary);

            // Save the (text => accidents) pair in the local storage cache to
            // save future API calls
            if (DEV_MODE && USE_CACHE) {
              const prompt = e.data.payload.prompt;
              STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, this.summary);
            }
          } else if (responseRequestID.includes('use-case')) {
            const useCaseResponse = e.data.payload.result;
            this.useCaseResponseUpdated(useCaseResponse);

            // Save the API response in the local storage cache to
            if (DEV_MODE) {
              const prompt = e.data.payload.prompt;
              if (USE_CACHE) {
                STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, useCaseResponse);
              }
            }
          } else if (responseRequestID.includes('stakeholder')) {
            const stakeholderResponse = e.data.payload.result;
            const nodeDataID = e.data.payload.detail;
            this.stakeholderResponseUpdated(nodeDataID, stakeholderResponse);

            // Save the API response in the local storage cache to
            if (DEV_MODE) {
              const prompt = e.data.payload.prompt;
              if (USE_CACHE) {
                STORAGE.setItem(
                  `<${REQUEST_NAME}>` + prompt,
                  stakeholderResponse
                );
              }
            }
          } else if (responseRequestID.includes('harm')) {
            const harmResponse = e.data.payload.result;
            const [useCaseNodeDataID, stakeholder] = JSON.parse(
              e.data.payload.detail
            ) as [string, string];

            this.harmResponseUpdated(
              useCaseNodeDataID,
              stakeholder,
              harmResponse
            );

            // Save the API response in the local storage cache
            if (USE_CACHE) {
              const prompt = e.data.payload.prompt;
              STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, harmResponse);
            }
          }
        }
        break;
      }

      case 'error': {
        // Error handling for the PaLM API calls
        this.isUseCaseGenFailed = true;
        console.error('PaLM API error during text gen: ', e.data);
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  }

  accidentInfoMouseEntered(e: MouseEvent) {
    const content = `
      <div class="accident-tooltip-content">
        <p>Headlines of previous real AI incidents indexed in the AI Incident Database.</p>
        <p><strong class="info">Latest</strong>: the most recent incidents</p>
        <p><strong class="info">Related</strong>: incidents may be relevant to your prompt based on article-prompt embedding similarities</p>
      </div>
    `;
    tooltipMouseEnter(e, content, 'right', this.tooltipTop, 200, undefined, 15);
  }

  useCaseInfoMouseEntered(e: MouseEvent) {
    const content = `
      <div class="accident-tooltip-content">
        <p>AI-generated use cases based on your prompt — helping you reflect on how people might use a product built using your prompt.</p>
        <p><strong class="intended">Intended</strong>: uses within scope for products</p>
        <p><strong class="high-stakes">High-stakes</strong>: uses that involves critical risks</p>
        <p><strong class="misuse">Misuse</strong>: malicious uses by bad actors</p>
      </div>
    `;

    tooltipMouseEnter(e, content, 'right', this.tooltipTop, 200, undefined, 15);
  }

  imageMouseEnter(e: MouseEvent, similarity: number | undefined) {
    let content = '<span>Remotely relevant to your prompt</span>';
    if (similarity) {
      if (similarity >= config.score.alertLowThreshold) {
        content =
          '<span><strong class="alert">Relevant</strong> to your prompt</span>';
      } else if (similarity >= config.score.warnLowThreshold) {
        content =
          '<span><strong class="warn">Moderately relevant</strong> to your prompt</span>';
      }
    }
    tooltipMouseEnter(e, content, 'top', this.tooltipTop, 200, undefined, 6);
  }

  tooltipMouseLeft() {
    tooltipMouseLeave(this.tooltipTop);
  }

  headerMouseEnter() {
    const leftCircle = this.shadowRoot!.querySelector(
      '.lite-header svg #left-circle'
    );
    const rightCircle = this.shadowRoot!.querySelector(
      '.lite-header svg #right-circle'
    );
    if (leftCircle && rightCircle) {
      this.isLoading = true;
      startLogoBlinkAnimation(
        () => {
          return this.isLoading;
        },
        leftCircle,
        rightCircle
      );
    }
  }

  headerMouseLeave() {
    const leftCircle = this.shadowRoot!.querySelector(
      '.lite-header svg #left-circle'
    );
    const rightCircle = this.shadowRoot!.querySelector(
      '.lite-header svg #right-circle'
    );
    if (leftCircle && rightCircle) {
      this.isLoading = false;
      stopLogoAnimation(leftCircle, rightCircle);
    }
  }

  segueButtonMouseEnter() {
    const leftCircle = this.shadowRoot!.querySelector(
      '.segue-button svg #left-circle'
    );
    const rightCircle = this.shadowRoot!.querySelector(
      '.segue-button svg #right-circle'
    );
    if (leftCircle && rightCircle) {
      this.isLoading = true;
      startLogoBlinkAnimation(
        () => {
          return this.isLoading;
        },
        leftCircle,
        rightCircle
      );
    }
  }

  segueButtonMouseLeave() {
    const leftCircle = this.shadowRoot!.querySelector(
      '.segue-button svg #left-circle'
    );
    const rightCircle = this.shadowRoot!.querySelector(
      '.segue-button svg #right-circle'
    );
    if (leftCircle && rightCircle) {
      this.isLoading = false;
      stopLogoAnimation(leftCircle, rightCircle);
    }
  }

  // ===== Templates and Styles ======
  render() {
    const noPromptNoteContent = html`
      <span class="note-icon">(·_·)</span>
      <span class="note-title">No Prompt Detected</span>
      <span class="note-description">Run your current prompt to start</span>
    `;

    // Compile the use case list in the use case section
    let useCaseListTemplate = html``;

    for (const [i, useCase] of this.useCases[
      this.selectedUseCaseTab
    ].entries()) {
      useCaseListTemplate = html`
        ${useCaseListTemplate}
        <div
          class="use-case-item"
          id=${useCase.id}
          title="${useCase.category} use case"
        >
          <span class="svg-icon use-case-icon ${useCase.category.toLowerCase()}"
            >${USE_CASE_ICON_MAP[useCase.category]}</span
          >
          <span class="use-case-text"
            >${useCase.text}<span
              class="svg-icon envision-icon ${useCase.category.toLowerCase()}"
              ?hide=${this.pendingHarmUseCaseIDs.has(useCase.id)}
              ?disabled=${useCase.harm !== ''}
              title=""
              @mouseenter=${(e: MouseEvent) => {
                tooltipMouseEnter(
                  e,
                  'Envision a potential harm of this use case',
                  'top',
                  this.tooltipTop,
                  200,
                  undefined,
                  6
                );
              }}
              @mouseleave=${() => {
                this.tooltipMouseLeft();
              }}
              @click=${() => {
                this.pendingHarmUseCaseIDs.add(useCase.id);
                this.generateStakeholders(useCase);
                this.requestUpdate();
              }}
              >${unsafeHTML(playIcon)}<span
                class="use-case-loader-wrapper ${useCase.category.toLowerCase()}"
                ?hide=${!this.pendingHarmUseCaseIDs.has(useCase.id)}
                @mouseenter=${(e: MouseEvent) => {
                  tooltipMouseEnter(
                    e,
                    'Envisioning potential harms...',
                    'top',
                    this.tooltipTop,
                    200,
                    undefined,
                    6
                  );
                }}
                @mouseleave=${() => {
                  this.tooltipMouseLeft();
                }}
              ></span></span
          ></span>

          <span
            class="use-case-harm"
            id=${useCase.id}
            title="Potential harm of this use case"
          >
            <span
              class="svg-icon harm-icon ${useCase.category.toLowerCase()}"
              ?hidden=${useCase.harm === ''}
              >${unsafeHTML(harmIcon)}</span
            >${useCase.harm}
          </span>
        </div>
        ${i === this.useCases[this.selectedUseCaseTab].length - 1
          ? html``
          : html`<div class="separator"></div>`}
      `;
    }

    // Compile the accident section
    let accidentTemplate = html``;

    const curAccidentReports =
      this.selectedAccidentTab === AccidentTab.LATEST
        ? this.latestAccidentReports
        : this.curRelevantAccidentReports;

    const curAccidentPage =
      this.selectedAccidentTab === AccidentTab.LATEST
        ? this.curLatestAccidentPage
        : this.curRelevantAccidentPage;

    const totalAccidentTotalPage =
      this.selectedAccidentTab === AccidentTab.LATEST
        ? this.totalLatestAccidentPage
        : this.totalRelevantAccidentPage;

    const curPageAccidentReports = curAccidentReports.slice(
      curAccidentPage * MAX_ACCIDENTS_PER_PAGE,
      (curAccidentPage + 1) * MAX_ACCIDENTS_PER_PAGE
    );

    // Helper to map similarity score to accident card class
    const getCardClassName = (report: AccidentReport) => {
      if (report.similarity) {
        if (report.similarity >= config.score.alertLowThreshold) {
          return 'alert';
        } else if (report.similarity >= config.score.warnLowThreshold) {
          return 'warn';
        } else {
          return '';
        }
      } else {
        return '';
      }
    };

    for (const curReport of curPageAccidentReports) {
      accidentTemplate = html`
        ${accidentTemplate}

        <div class="accident-card" style="height: ${ACCIDENT_CARD_HEIGHT}px">
          <div class="left">
            <a
              href="${ifDefined(curReport?.url)}"
              class="news-image-wrapper ${getCardClassName(curReport)} ${this
                .selectedAccidentTab === AccidentTab.LATEST
                ? 'latest'
                : 'related'}"
              target="_blank"
            >
              <img
                class="news-image"
                src="${ifDefined(curReport?.imageURL)}"
                @mouseenter=${(e: MouseEvent) =>
                  this.imageMouseEnter(e, curReport.similarity)}
                @mouseleave=${() => {
                  this.tooltipMouseLeft();
                }}
                @error="${(e: ErrorEvent) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = this.errorImageSrc;
                }}"
              />
            </a>
          </div>
          <div class="right">
            <div class="title" title=${ifDefined(curReport?.title)}>
              <a href="${ifDefined(curReport?.url)}" target="_blank"
                >${curReport?.title}</a
              >
            </div>
          </div>
        </div>
      `;
    }

    // Compile the pagination row for the accidents
    let pageCircleTemplate = html``;
    for (let i = 0; i < totalAccidentTotalPage; i++) {
      pageCircleTemplate = html`${pageCircleTemplate}
        <div
          class="page-circle"
          ?selected=${curAccidentPage === i}
          @click=${() => {
            if (this.selectedAccidentTab === AccidentTab.LATEST) {
              this.curLatestAccidentPage = i;
            } else {
              this.curRelevantAccidentPage = i;
            }
          }}
        ></div> `;
    }

    const accidentPaginationTemplate = html`
      <div
        class="accident-pagination"
        ?hidden=${curAccidentReports.length === 0}
      >
        <div
          class="svg-icon"
          @click=${() => {
            if (this.selectedAccidentTab === AccidentTab.LATEST) {
              this.curLatestAccidentPage = Math.max(
                0,
                this.curLatestAccidentPage - 1
              );
            } else {
              this.curRelevantAccidentPage = Math.max(
                0,
                this.curRelevantAccidentPage - 1
              );
            }
          }}
        >
          ${unsafeHTML(angleIcon)}
        </div>
        <div class="page-circles">${pageCircleTemplate}</div>
        <div
          class="svg-icon page-right"
          @click=${() => {
            if (this.selectedAccidentTab === AccidentTab.LATEST) {
              this.curLatestAccidentPage = Math.min(
                this.curLatestAccidentPage + 1,
                this.totalLatestAccidentPage - 1
              );
            } else {
              this.curRelevantAccidentPage = Math.min(
                this.curRelevantAccidentPage + 1,
                this.totalRelevantAccidentPage - 1
              );
            }
          }}
        >
          ${unsafeHTML(angleIcon)}
        </div>
      </div>
    `;

    // Add a modal to collect API key if we need to make API calls
    let modalTemplate = html``;
    if (USE_API) {
      modalTemplate = html`
        <farsight-modal-auth
          class="modal"
          apiKey=${ifDefined(this.apiKey ?? undefined)}
          @api-key-added=${(e: CustomEvent<SimpleEventMessage>) =>
            this.handleAPIKeyAdded(e)}
        ></farsight-modal-auth>
      `;
    }

    return html`
      <link
        href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap"
        rel="stylesheet"
      />

      <div class="container-lite">
        <div class="lite-header">
          <a
            class="left"
            href="https://google.com"
            target="_blank"
            title="Interactive Companion for Responsible AI"
            @mouseenter=${() => this.headerMouseEnter()}
            @mouseleave=${() => this.headerMouseLeave()}
          >
            <div class="svg-icon">${unsafeHTML(logoIcon)}</div>
            <div class="name">Farsight</div>
          </a>

          <div
            class="svg-icon cross-icon"
            @click=${() => this.closeButtonClicked()}
          >
            ${unsafeHTML(crossStrokeIcon)}
          </div>
        </div>
        <div class="container-separator"></div>

        <div class="section-container section-related-accidents">
          <div class="header header-accident">
            <div class="header-container">
              <span class="header-name"
                >Real AI Incidents
                <span
                  class="svg-icon"
                  @mouseenter=${(e: MouseEvent) =>
                    this.accidentInfoMouseEntered(e)}
                  @mouseleave=${() => this.tooltipMouseLeft()}
                  >${unsafeHTML(questionIcon)}</span
                ></span
              >
              <span class="description"
                >Cautionary tales for your AI product</span
              >
            </div>
          </div>

          <div class="tab-bar">
            <div class="tab-indicator tab-indicator-accident"></div>
            <div
              class="tab-item"
              id="tab-item-latest"
              ?selected=${this.selectedAccidentTab === AccidentTab.LATEST}
              @click=${() => this.accidentTabClicked(AccidentTab.LATEST)}
            >
              <div class="tab-item-inner">
                <span class="item-show">Latest</span>
              </div>
            </div>
            <div
              class="tab-item"
              id="tab-item-related"
              ?selected=${this.selectedAccidentTab === AccidentTab.RELATED}
              @click=${() => this.accidentTabClicked(AccidentTab.RELATED)}
            >
              <div class="tab-item-inner">
                <span class="item-text">Related</span>
              </div>
            </div>
          </div>

          <div class="content accident-content">
            <div class="accident-list">
              <div
                class="no-prompt-note"
                id="no-prompt-note-accident"
                ?shown=${this.selectedAccidentTab === AccidentTab.RELATED &&
                this.prompt === ''}
              >
                ${noPromptNoteContent}
              </div>

              <div
                class="loader-container"
                ?shown=${this.selectedAccidentTab === AccidentTab.RELATED &&
                this.prompt !== '' &&
                this.curRelevantAccidentReports.length === 0}
                id="loader-container-accident"
              >
                <span class="loader-text">Searching accidents...</span>
              </div>
              ${accidentTemplate}
            </div>
            ${accidentPaginationTemplate}
          </div>
        </div>

        <div class="container-separator"></div>

        <div class="section-container section-use-case">
          <div class="header">
            <div class="header-container">
              <span class="header-name"
                >Potential Use Cases
                <span
                  class="svg-icon"
                  @mouseenter=${(e: MouseEvent) =>
                    this.useCaseInfoMouseEntered(e)}
                  @mouseleave=${() => this.tooltipMouseLeft()}
                  >${unsafeHTML(questionIcon)}</span
                >
              </span>
              <span class="description"
                >Ways users might use your AI product</span
              >
            </div>
          </div>

          <div class="content">
            <div class="tab-bar">
              <div class="tab-indicator tab-indicator-use-case"></div>
              <div
                class="tab-item"
                id="tab-item-all"
                ?selected=${this.selectedUseCaseTab === UseCaseTab.ALL}
                @click=${() => this.useCaseTabClicked(UseCaseTab.ALL)}
              >
                <div class="tab-item-inner">
                  <span class="item-show">Mix</span>
                </div>
              </div>
              <div
                class="tab-item intended"
                id="tab-item-intended"
                ?selected=${this.selectedUseCaseTab === UseCaseTab.INTENDED}
                @click=${() => this.useCaseTabClicked(UseCaseTab.INTENDED)}
              >
                <div class="tab-item-inner intended">
                  <span class="item-text">Intended</span>
                  <span class="svg-icon intended"
                    >${unsafeHTML(checkIcon)}</span
                  >
                </div>
              </div>
              <div
                class="tab-item high-stakes"
                id="tab-item-high-stakes"
                ?selected=${this.selectedUseCaseTab === UseCaseTab.HIGH_STAKES}
                @click=${() => this.useCaseTabClicked(UseCaseTab.HIGH_STAKES)}
              >
                <div class="tab-item-inner high-stakes">
                  <span class="item-text">High-stakes</span>
                  <span class="svg-icon high-stakes"
                    >${USE_CASE_ICON_MAP['High-stakes']}</span
                  >
                </div>
              </div>
              <div
                class="tab-item misuse"
                id="tab-item-misuse"
                ?selected=${this.selectedUseCaseTab === UseCaseTab.MISUSE}
                @click=${() => this.useCaseTabClicked(UseCaseTab.MISUSE)}
              >
                <div class="tab-item-inner misuse">
                  <span class="item-text">Misuse</span>
                  <span class="svg-icon misuse"
                    >${USE_CASE_ICON_MAP['Misuse']}</span
                  >
                </div>
              </div>
            </div>

            <div class="use-case-list-container">
              <div class="use-case-list" ?hidden=${this.generatingNewUseCases}>
                <div
                  class="no-prompt-note"
                  id="no-prompt-note-use-case"
                  ?shown=${this.prompt === ''}
                >
                  ${noPromptNoteContent}
                </div>

                <div
                  class="loader-container"
                  id="loader-container-use-case"
                  ?shown=${this.generatingNewUseCases &&
                  this.prompt !== '' &&
                  !this.isUseCaseGenFailed}
                >
                  <span class="loader-text">Generating use cases...</span>
                </div>

                <div
                  class="error-container"
                  id="error-container-use-case"
                  ?shown=${this.isUseCaseGenFailed}
                >
                  <span class="loader-text"
                    >The AI model fails to envision use cases due to safety
                    concerns.</span
                  >

                  <span class="loader-text">Try a different prompt</span>
                </div>
                ${useCaseListTemplate}
              </div>
            </div>
          </div>
        </div>

        <div class="container-separator"></div>

        <div class="section-container section-button">
          <div
            class="segue-button"
            ?disabled=${this.prompt === ''}
            ?is-hidden=${this.notebookMode}
            @click=${(e: MouseEvent) => this.segueButtonClicked(e)}
            @mouseenter=${() => this.segueButtonMouseEnter()}
            @mouseleave=${() => this.segueButtonMouseLeave()}
          >
            <span class="svg-icon">${unsafeHTML(logoIcon)}</span>
            <span class="button-text button-text-long"
              >${LITE_MODE
                ? 'Copy Use Cases & Harms'
                : 'Envision Consequences & Harms'}</span
            >
            <span class="button-text button-text-short">Envision Harms</span>
          </div>
        </div>

        ${modalTemplate}

        <div
          id="popper-tooltip-top"
          class="popper-tooltip hidden"
          role="tooltip"
        >
          <span class="popper-content"></span>
          <div class="popper-arrow"></div>
        </div>
      </div>
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
    'farsight-container-lite': FarsightContainerLite;
  }
}
