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
  tooltipMouseEnter,
  tooltipMouseLeave,
  TooltipConfig
} from '@xiaohk/utils';
import { Logger } from '@xiaohk/utils/logger';
import '../confirm-dialog/confirm-dialog';
import '../footer/footer';
import { getDefaultFooterInfo } from '../footer/footer';
import { LitElement, css, unsafeCSS, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { EnvisionTree, parseTags } from './envision-tree';
import { addLoader } from './envision-tree-draw';
import { config } from '../../utils/config';
import { summaryPrompt } from '../../data/static-data';
import {
  startLogoBlinkAnimation,
  stopLogoAnimation
} from '../container-signal/container-signal';

import deleteIcon from '../../images/icon-delete.svg?raw';
import editIcon from '../../images/icon-edit.svg?raw';
import logoIcon from '../../images/icon-logo.svg?raw';
import shareIcon from '../../images/icon-download.svg?raw';
import newIcon from '../../images/icon-eco-outline.svg?raw';
import addIcon from '../../images/icon-add.svg?raw';
import addMagicIcon from '../../images/icon-logo-compact.svg?raw';
import tagIcon from '../../images/icon-tag.svg?raw';
import checkIcon from '../../images/icon-check-2.svg?raw';
import crossIcon from '../../images/icon-cross-2.svg?raw';
import alertIcon from '../../images/icon-alert-2.svg?raw';
import directIcon from '../../images/icon-person-filled.svg?raw';
import indirectIcon from '../../images/icon-person-outline.svg?raw';
import saveIcon from '../../images/icon-download.svg?raw';

import type { PropertyValues } from 'lit';
import type { TextGenWorkerMessage } from '../../types/common-types';
import type { DialogInfo } from '../confirm-dialog/confirm-dialog';
import type { FooterInfo } from '../footer/footer';

import componentCSS from './harm-panel.scss?inline';
import TextGenWorkerInline from '../../workers/text-gen-worker?worker&inline';

const DEV_MODE = import.meta.env.MODE === 'development';
const LIB_MODE = import.meta.env.MODE === 'library';
const USE_CACHE = import.meta.env.MODE !== 'x20';
const STORAGE = DEV_MODE ? localStorage : sessionStorage;
const REQUEST_NAME = 'farsight';
const HOT_DEV_MODE = config.hotDev;
const IS_LOGGING = true;

enum PlayStage {
  SUMMARY = 'Summary',
  USECASE = 'Use Case',
  EDIT = 'Edit',
  BEFORE_STAKEHOLDER = 'Before Stakeholder',
  STAKEHOLDER = 'Stakeholder',
  SHARE = 'Share',
  DONE = 'Done'
}

/**
 * Harm panel element.
 *
 */
@customElement('farsight-harm-panel')
export class FarsightHarmPanel extends LitElement {
  // ===== Properties ======
  @property({ type: String })
  prompt = '';

  @property()
  apiKey: string | null = null;

  @query('#popper-tooltip-top')
  popperElementTop!: HTMLElement;

  @query('#popper-tooltip-bottom')
  popperElementBottom!: HTMLElement;

  @query('#popper-tooltip-outside')
  popperElementOutside!: HTMLElement;

  @state()
  tooltipOutside: TooltipConfig | null = null;

  @query('.message-window')
  messageWindowElement!: HTMLElement | null;

  @query('#summary-textarea')
  summaryTextareaElement!: HTMLTextAreaElement | null;

  @query('#summary-loader')
  summaryLoaderElement!: HTMLDivElement | null;

  @query('#summary-button')
  summaryButtonElement!: HTMLButtonElement | null;

  @state()
  curPlayStage: PlayStage = PlayStage.SUMMARY;

  @query('.envision-tree-pane')
  envisionTreePane!: HTMLElement | null;

  @state()
  hasFinishedOnboarding = false;

  @state()
  hasSkippedOnboarding = false;

  textGenWorker: Worker;
  textGenWorkerRequestID = 1;

  envisionTree: EnvisionTree | null = null;

  @state()
  hasFirstUseCaseExpanded = false;
  logoHovering = false;

  @state()
  footerInfo = getDefaultFooterInfo();

  // Dialog states
  @state()
  dialogInfo: DialogInfo = {
    header: 'Delete Item',
    message:
      'Are you sure you want to delete this item? This action cannot be undone.',
    yesButtonText: 'Delete',
    actionKey: 'deletion',
    confirmAction: () => {},
    show: false
  };

  // Logger
  logger: Logger | null = null;

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    this.textGenWorker = new TextGenWorkerInline();
    this.textGenWorker.onmessage = (e: MessageEvent<TextGenWorkerMessage>) => {
      this.textGenWorkerMessageHandler(e);
    };

    // Check if the user has finished onboarding before. If so, the user can skip
    // the tutorial
    const finishedResult = localStorage.getItem(
      'hasFinishedFarsightOnboarding'
    );
    if (finishedResult === 'true') {
      this.hasFinishedOnboarding = true;
    }

    // Check if the user has skipped the onboarding before. If so, we don't show
    // the tutorial
    const skippedResult = localStorage.getItem('hasSkippedFarsightOnboarding');
    if (skippedResult === 'true') {
      this.hasSkippedOnboarding = true;
    }

    // Set up a logger if needed
    if (IS_LOGGING) {
      this.logger = new Logger();
    }
  }

  firstUpdated() {
    // Add a loader to the summary panel
    d3.select(this.summaryLoaderElement!).call(selection => {
      addLoader(selection, false);
    });

    // Initialize the harm tree
    if (this.envisionTreePane === null) {
      throw Error('harm-tree-pane is not initialized.');
    }

    const firstUseCaseExpanded = () => {
      this.hasFirstUseCaseExpanded = true;
    };

    this.envisionTree = new EnvisionTree(
      this.envisionTreePane,
      this.popperElementTop,
      this.popperElementBottom,
      this.apiKey,
      this.logger,
      firstUseCaseExpanded,
      (dialogInfo: DialogInfo) => {
        this.showDialog(dialogInfo);
      },
      (newFooterInfo: FooterInfo) => {
        this.updateFooterInfo(newFooterInfo);
      }
    );

    if (this.popperElementOutside) {
      this.tooltipOutside = {
        tooltipElement: this.popperElementOutside,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }

    if (HOT_DEV_MODE) {
      this.progressPlayStage();
    }
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

      if (this.envisionTree) {
        this.envisionTree.apiKey = this.apiKey;
      }

      const oldPrompt = changedProperties.get('prompt');
      if (oldPrompt !== '' && oldPrompt !== this.prompt) {
        // Prompt has changed, restart at the summary stage
        this.envisionTree?.clearViews();

        this.summaryLoaderElement?.removeAttribute('hidden');
        this.summaryButtonElement?.setAttribute('disabled', 'true');

        if (this.summaryTextareaElement) {
          this.summaryTextareaElement.value = '';
        }

        this.curPlayStage = PlayStage.SUMMARY;
      }

      this.runSummaryPrompt(this.prompt);
    }

    if (changedProperties.has('popperElementTop')) {
      // If the envisionTree is initialized, pass the popperElement to it
      if (this.envisionTree) {
        this.envisionTree.popperElementTop = this.popperElementTop;
      }
    }

    if (changedProperties.has('popperElementBottom')) {
      // If the envisionTree is initialized, pass the popperElement to it
      if (this.envisionTree) {
        this.envisionTree.popperElementBottom = this.popperElementBottom;
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  progressPlayStage = (finishPlay: PlayStage.DONE | undefined = undefined) => {
    let curPlayStage = this.curPlayStage;
    if (finishPlay === PlayStage.DONE) {
      curPlayStage = PlayStage.SHARE;
    }

    switch (curPlayStage) {
      case PlayStage.SUMMARY: {
        // If the user has skipped the tutorial before, we don't show it anymore
        if (this.hasSkippedOnboarding) {
          this.curPlayStage = PlayStage.DONE;
        } else {
          // Move to use case
          this.curPlayStage = PlayStage.USECASE;
        }

        // Initialize the envision tree with a summary
        if (this.envisionTree === null) {
          throw Error('Envision Tree is not initialized yet.');
        }

        if (HOT_DEV_MODE) {
          // TODO: Remove me
          const tempSummary =
            // eslint-disable-next-line quotes
            "Generate a follow-up question to a client's injury.";
          this.envisionTree.initEnvisionTreeData(tempSummary);
          break;
        }

        const finalSummary = this.summaryTextareaElement!.value;
        this.envisionTree.initEnvisionTreeData(finalSummary);
        break;
      }

      case PlayStage.USECASE: {
        // Move to next stage
        this.curPlayStage = PlayStage.EDIT;

        break;
      }

      case PlayStage.EDIT: {
        // Move to next stage
        this.curPlayStage = PlayStage.BEFORE_STAKEHOLDER;

        break;
      }

      case PlayStage.BEFORE_STAKEHOLDER: {
        // Move to next stage
        this.curPlayStage = PlayStage.STAKEHOLDER;

        break;
      }

      case PlayStage.STAKEHOLDER: {
        // Move to next stage
        this.curPlayStage = PlayStage.SHARE;

        break;
      }

      case PlayStage.SHARE: {
        // Move to next stage
        this.curPlayStage = PlayStage.DONE;

        // Record that the user has gone through the tutorial
        if (USE_CACHE) {
          localStorage.setItem('hasFinishedFarsightOnboarding', 'true');
        }
        break;
      }

      case PlayStage.DONE: {
        break;
      }

      default: {
        console.error('Unknown current play stage');
        break;
      }
    }
  };

  /**
   * Function to update the view based on the given prompt summary
   * @param summary Summary of a user prompt
   */
  updatePromptSummary = (summary: string) => {
    if (this.summaryTextareaElement !== null) {
      // Show the prompt summary
      this.summaryLoaderElement?.setAttribute('hidden', 'true');
      this.summaryButtonElement?.removeAttribute('disabled');
      this.summaryTextareaElement.value = summary;
      this.summaryTextareaElement.focus();
    }
  };

  runSummaryPrompt = (userPrompt: string) => {
    if (this.apiKey === null) {
      throw Error('API Key is not set');
    }

    const compiledPrompt = summaryPrompt.prompt.replace(
      '{{userPrompt}}',
      userPrompt
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
        console.log('Skip text gen API call (prompt summary, cached)');
      window.setTimeout(
        () => {
          this.updatePromptSummary(response);
        },
        DEV_MODE ? 1000 : 0
      );
    } else {
      // API call
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-${this.textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0
        }
      };
      this.textGenWorker.postMessage(message);
    }
  };

  // ===== Event Methods ======
  /**
   * Helper function to route different web worker messages
   * @param e Web worker message event
   */
  textGenWorkerMessageHandler = (e: MessageEvent<TextGenWorkerMessage>) => {
    switch (e.data.command) {
      case 'finishTextGen': {
        if (e.data.payload.requestID.includes(REQUEST_NAME)) {
          const summaryResponse = e.data.payload.result;

          // Parse the summary
          const summary = parseTags(summaryResponse, 'summary')[0];
          this.updatePromptSummary(summary);

          // Save the (text => accidents) pair in the local storage cache to
          // save future API calls
          if (DEV_MODE && USE_CACHE) {
            const prompt = e.data.payload.prompt;
            STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, summary);
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

  showDialog(dialogInfo: DialogInfo) {
    this.dialogInfo = dialogInfo;
  }

  closeButtonClicked() {
    const event = new Event('close-farsight', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  shareButtonClicked(e: MouseEvent) {
    if (this.envisionTree) {
      this.envisionTree.exportTree(this.prompt);

      tooltipMouseEnter(
        e,
        'Copied',
        'bottom',
        this.tooltipOutside,
        100,
        undefined,
        8
      );
      window.setTimeout(() => {
        tooltipMouseLeave(this.tooltipOutside);
      }, 2000);
    }
  }

  updateFooterInfo(newFooterInfo: FooterInfo) {
    this.footerInfo = newFooterInfo;
  }

  // ===== Templates and Styles ======
  render() {
    let headerContent = html``;
    switch (this.curPlayStage) {
      case PlayStage.SUMMARY: {
        headerContent = html`Let's start to
          <strong>envision potential harms</strong> to different groups of
          people. It looks like you are prototyping an AI application that can:`;
        break;
      }

      case PlayStage.USECASE: {
        headerContent = html`Before identifying potential harms, we’ll want to
          think about different <strong class="use-case">use cases</strong> that
          people might use this application for. In addition to
          <span class="no-wrap use-case"
            ><strong>intended use</strong>
            <span class="svg-icon">${unsafeHTML(checkIcon)}</span></span
          >, let's think about
          <span class="no-wrap use-case"
            ><strong>high-stakes use</strong
            ><span class="svg-icon">${unsafeHTML(alertIcon)}</span></span
          >and
          <span class="no-wrap use-case"
            ><strong>misuse</strong>
            <span class="svg-icon">${unsafeHTML(crossIcon)}</span></span
          >`;
        break;
      }

      case PlayStage.EDIT: {
        headerContent = html`Farsight uses AI to generate a few suggestions to
          <strong>spark your imagination</strong>. Keep in mind, these are
          generated by AI and
          <strong class="harm">may not match reality</strong>. You can
          <span class="no-wrap"
            ><strong>edit</strong>
            <span class="svg-icon">${unsafeHTML(editIcon)}</span> </span
          >,
          <span class="no-wrap"
            ><strong>delete</strong>
            <span class="svg-icon">${unsafeHTML(deleteIcon)}</span> </span
          >,
          <span class="no-wrap"
            ><strong>label</strong>
            <span class="svg-icon">${unsafeHTML(tagIcon)}</span> </span
          >, and
          <span class="no-wrap"
            ><strong>add</strong>
            <span class="svg-icon">${unsafeHTML(addIcon)}</span>
          </span>
          new <strong class="use-case">use cases</strong>. What other
          <strong class="use-case">use cases</strong> can you think of?`;
        break;
      }

      case PlayStage.BEFORE_STAKEHOLDER: {
        headerContent = html` Once you're happy with the
          <strong class="use-case">use cases</strong> here, choose
          <strong class="use-case">one</strong> and envision
          <strong class="stakeholder">stakeholders</strong> who might be
          impacted and possible <strong class="harm">harms</strong>. You can
          click the
          <span class="svg-icon">${unsafeHTML(addMagicIcon)}</span> button to
          let AI generate a few suggestions.`;
        break;
      }

      case PlayStage.STAKEHOLDER: {
        headerContent = html`Think about both
          <span class="no-wrap stakeholder"
            ><strong>direct</strong>
            <span
              class="svg-icon"
              style="height: 13px; vertical-align: initial;"
              >${unsafeHTML(directIcon)}</span
            ></span
          >
          and
          <span class="no-wrap stakeholder"
            ><strong>indirect</strong>
            <span
              class="svg-icon"
              style="height: 13px; vertical-align: initial;"
              >${unsafeHTML(indirectIcon)}</span
            >
            <strong>stakeholders</strong></span
          >, as well as different types of
          <span class="no-wrap harm"><strong>harms</strong></span
          >. AI-generated suggestions may be inaccurate.
          <span class="no-wrap"
            ><strong>Edit</strong>
            <span class="svg-icon">${unsafeHTML(editIcon)}</span>
          </span>
          and
          <span class="no-wrap"
            ><strong>add</strong>
            <span class="svg-icon">${unsafeHTML(addIcon)}</span>
          </span>
          more entries as you go!`;
        break;
      }

      case PlayStage.SHARE: {
        headerContent = html`Repeat the envisioning process for other
          <strong class="use-case">use cases</strong>. When ready, click
          <span class="no-wrap"
            ><strong>Save</strong>
            <span class="svg-icon">${unsafeHTML(saveIcon)}</span>
          </span>
          to save all content for later review with others. Think about whose
          perspectives you might want to get on these
          <strong class="harm">potential harms</strong>, including from members
          of <strong class="stakeholder">stakeholder groups</strong>.`;
        break;
      }

      case PlayStage.DONE: {
        headerContent = html``;
        break;
      }

      default: {
        console.error('Unknown play stage type.');
        break;
      }
    }

    const messageWindow = html`
      <div
        class="message-window"
        ?at-top=${this.curPlayStage !== PlayStage.SUMMARY}
        ?hidden=${this.curPlayStage === PlayStage.DONE}
      >
        <div class="header">
          <div class="header-left">${headerContent}</div>
          <div class="header-right">
            <button
              id="top-button"
              class="primary"
              ?disabled=${this.curPlayStage === PlayStage.BEFORE_STAKEHOLDER &&
              !this.hasFirstUseCaseExpanded}
              @click=${() => {
                this.progressPlayStage();
              }}
            >
              ${this.curPlayStage === PlayStage.SHARE ? 'Start' : 'Next'}
            </button>
            <span
              class="skip-button"
              title="Skip the tutorial"
              ?hidden=${!this.hasFinishedOnboarding}
              @click=${() => {
                if (USE_CACHE) {
                  localStorage.setItem('hasSkippedFarsightOnboarding', 'true');
                }
                this.progressPlayStage(PlayStage.DONE);
              }}
              >skip</span
            >
          </div>
        </div>

        <div class="input-wrapper">
          <div id="summary-loader"></div>
          <textarea id="summary-textarea" autocorrect="off"></textarea>
        </div>

        <div class="footer">
          <button
            id="summary-button"
            class="primary"
            ?disabled=${true}
            @click="${() => {
              this.progressPlayStage();
            }}"
          >
            Yes
          </button>
        </div>
      </div>
    `;

    const envisionTree = html`
      <div class="envision-tree-pane">
        <div class="envision-tree-container">
          <div
            id="popper-tooltip-top"
            class="popper-tooltip hidden"
            role="tooltip"
          >
            <span class="popper-content"></span>
            <div class="popper-arrow"></div>
          </div>

          <div
            id="popper-tooltip-bottom"
            class="popper-tooltip hidden"
            role="tooltip"
          >
            <span class="popper-content"></span>
            <div class="popper-arrow"></div>
          </div>

          <div class="tree-content">
            <div class="annotation-group"></div>
            <div class="node-group"></div>
            <svg class="link-container"></svg>
            <svg class="back-container"></svg>
          </div>
        </div>
        <svg class="background-svg"></svg>
      </div>
    `;

    const topButtons = html`
      <div class="top-button-bar">
        <button class="button button-share">
          <span class="svg-icon">${unsafeHTML(logoIcon)}</span>
          <span class="name">New Farsight</span>
        </button>

        <button class="button button-share">
          <span class="svg-icon">${unsafeHTML(shareIcon)}</span>
          <span class="name">Share</span>
        </button>
      </div>
    `;

    const header = html`
      <div class="tool-header">
        <div
          class="title"
          @mouseenter=${() => {
            const leftCircle = this.shadowRoot?.querySelector(
              '.name-wrapper #left-circle'
            );
            const rightCircle = this.shadowRoot?.querySelector(
              '.name-wrapper #right-circle'
            );
            if (leftCircle && rightCircle) {
              this.logoHovering = true;
              startLogoBlinkAnimation(
                () => this.logoHovering,
                leftCircle,
                rightCircle
              );
            }
          }}
          @mouseleave=${() => {
            this.logoHovering = false;
            const leftCircle = this.shadowRoot?.querySelector(
              '.name-wrapper #left-circle'
            );
            const rightCircle = this.shadowRoot?.querySelector(
              '.name-wrapper #right-circle'
            );
            if (leftCircle && rightCircle) {
              this.logoHovering = false;
              stopLogoAnimation(leftCircle, rightCircle);
            }
          }}
        >
          <span class="name-wrapper">
            <span class="svg-icon">${unsafeHTML(logoIcon)}</span>
            <span class="name">Farsight</span>
          </span>
          <span class="tagline"
            >Your Sidekick for Responsible AI Innovation</span
          >
        </div>
        <div class="buttons">
          <div class="control-buttons">
            <button class="button">
              <span class="svg-icon">${unsafeHTML(newIcon)}</span>
              <span class="name">New</span>
            </button>

            <button
              class="button"
              @click=${(e: MouseEvent) => this.shareButtonClicked(e)}
            >
              <span class="svg-icon">${unsafeHTML(shareIcon)}</span>
              <span class="name">Export</span>
            </button>
          </div>

          <button
            class="button-close"
            @click=${() => this.closeButtonClicked()}
          >
            <span class="svg-icon">${unsafeHTML(crossIcon)}</span>
          </button>
        </div>
      </div>
    `;

    return html`
      <div class="harm-panel">
        <div
          id="popper-tooltip-outside"
          class="popper-tooltip hidden"
          role="tooltip"
        >
          <span class="popper-content"></span>
          <div class="popper-arrow"></div>
        </div>
        ${header} ${messageWindow} ${envisionTree}
        <farsight-confirm-dialog
          .dialogInfo=${this.dialogInfo}
        ></farsight-confirm-dialog>
        <farsight-footer .footerInfo=${this.footerInfo}></farsight-footer>
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
    'farsight-harm-panel': FarsightHarmPanel;
  }
}
