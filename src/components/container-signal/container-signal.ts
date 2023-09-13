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
import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state, query } from 'lit/decorators.js';
import { config } from '../../utils/config';
import { tooltipMouseEnter, tooltipMouseLeave } from '@xiaohk/utils';
import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom';

import type {
  TextEmbWorkerMessage,
  RelevantAccident
} from '../../types/common-types';
import type { TooltipConfig } from '@xiaohk/utils';

import componentCSS from './container-signal.scss?inline';
import telescopeIcon from '../../images/icon-logo.svg?raw';
import addIcon from '../../images/icon-plus-1.svg?raw';
import TextEmbWorkerInline from '../../workers/text-emb-worker?worker&inline';
import TextEmbWorker from '../../workers/text-emb-worker?worker';

type APIFormStatus = 'wait' | 'verify' | 'error';

const USE_CACHE = import.meta.env.MODE !== 'x20';
const REQUEST_NAME = 'farsight';
const DEV_MODE = import.meta.env.MODE === 'development';
const STORAGE = DEV_MODE ? localStorage : sessionStorage;
const LIB_MODE = import.meta.env.MODE === 'library';
const EXTENSION_MODE = import.meta.env.MODE === 'extension';

export type SignalMessage = {
  command: 'palmAPIKeyAdded';
  payload: {
    apiKey: string;
  };
};

/**
 * Container signal element.
 *
 */
@customElement('farsight-container-signal')
export class FarsightContainerSignal extends LitElement {
  // ===== Class properties ======

  @property({ attribute: false })
  apiKey: string | null;
  apiKeyPromise: Promise<void>;
  apiKeyPromiseResolve: () => void;

  @state()
  isLoading = false;
  isHovering = false;

  @state()
  apiFormStatus: APIFormStatus = 'wait';

  @state()
  showApiForm = false;

  @property({ type: String })
  prompt = '';

  @property({ type: String })
  embWorkerURL = '';

  @state()
  alertNum = 0;

  @state()
  warnNum = 0;

  @query('#input-api-key')
  apiInputElement!: HTMLInputElement | null;

  @query('#popper-tooltip-top')
  popperElementTop!: HTMLElement;
  tooltipTop: TooltipConfig | null = null;

  textEmbWorker: Worker | null = null;
  textEmbWorkerRequestID = 1;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
    this.apiKeyPromiseResolve = () => {};
    this.apiKeyPromise = new Promise((resolve, _) => {
      this.apiKeyPromiseResolve = resolve;
    });

    if (!EXTENSION_MODE) {
      this.textEmbWorker = new TextEmbWorkerInline();
      this.textEmbWorker.onmessage = (e: MessageEvent<TextEmbWorkerMessage>) =>
        this.textEmbWorkerMessageHandler(e);
    } else {
      // Need to create a worker to export the worker script
      const _temp = new TextEmbWorker();
    }

    // Check if we can load API key from the cache
    this.apiKey = null;
    if (USE_CACHE) {
      const result = localStorage.getItem('palmAPIKey');
      if (result !== null) {
        this.apiKey = result;
        this.apiKeyPromiseResolve();
      }
    }
  }

  firstUpdated() {
    // Check if the signal is positioned at the left or the right of the page
    const container = this.shadowRoot!.querySelector('.container-signal');
    const apiForm = this.shadowRoot!.querySelector('.api-form');

    if (container === null || apiForm === null) {
      console.error('Container or api form is not initialized!');
      return;
    }

    this.updateAPIFormPosition();

    // Bind the tooltip
    if (this.popperElementTop) {
      this.tooltipTop = {
        tooltipElement: this.popperElementTop,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (EXTENSION_MODE && changedProperties.has('embWorkerURL')) {
      if (this.embWorkerURL !== '') {
        this.textEmbWorker = new Worker(this.embWorkerURL, { type: 'module' });
        this.textEmbWorker.onmessage = (
          e: MessageEvent<TextEmbWorkerMessage>
        ) => this.textEmbWorkerMessageHandler(e);
        console.log(this.textEmbWorker);
      }
    }

    // If the prompt has been changed, we need to query new accidents
    if (changedProperties.has('prompt')) {
      // Skip query if the prompt has not been set yet
      if (this.prompt === undefined || this.prompt === '') return;

      this.alertNum = 0;
      this.warnNum = 0;

      // Update accidents and use cases once the api key is set
      this.apiKeyPromise.then(() => {
        this.isLoading = true;

        // Start playing the animation
        const leftCircle = this.shadowRoot!.querySelector('svg #left-circle');
        const rightCircle = this.shadowRoot!.querySelector('svg #right-circle');
        if (leftCircle && rightCircle) {
          startLogoAnimation(
            () => {
              return this.isLoading;
            },
            leftCircle,
            rightCircle
          );
        }

        this.handleNewPrompt();
      });
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  /**
   * Find similar accident reports.
   * This method should be called after the api key is set.
   */
  handleNewPrompt() {
    if (this.apiKey === null) {
      throw Error('handleNewPrompt: API key is not set yet.');
    }

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
        console.log('Skip embedding API call (cached, signal)');
      }

      window.setTimeout(
        () => {
          this.updateRiskScore(relevantAccidents);
        },
        DEV_MODE ? 1000 : 0
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
      this.textEmbWorker?.postMessage(message);
    }
  }

  /**
   * Compute risk score based on the relevant accidents
   * @param relevantAccidents New relevant accidents
   */
  updateRiskScore(relevantAccidents: RelevantAccident[]) {
    let alertNum = 0;
    let warnNum = 0;

    // The relevant accidents are already sorted
    for (const accident of relevantAccidents) {
      if (accident.similarity >= config.score.alertLowThreshold) {
        alertNum += 1;
      } else if (accident.similarity >= config.score.warnLowThreshold) {
        warnNum += 1;
      } else {
        break;
      }
    }

    this.alertNum = alertNum;
    this.warnNum = warnNum;
    this.isLoading = false;

    // Stop playing the animation
    const leftCircle = this.shadowRoot!.querySelector('svg #left-circle');
    const rightCircle = this.shadowRoot!.querySelector('svg #right-circle');
    if (leftCircle && rightCircle) {
      stopLogoAnimation(leftCircle, rightCircle);
    }
  }

  /**
   * Update the API Form's position based on the position of the signal container
   * @returns Void
   */
  updateAPIFormPosition() {
    const anchor =
      this.shadowRoot!.querySelector<HTMLElement>('.container-signal');
    const apiForm = this.shadowRoot!.querySelector<HTMLElement>('.api-form');

    if (apiForm === null || anchor === null) {
      console.error('Failed to query the API Form / container element');
      return;
    }

    const placement = 'right';
    const offsetAmount = 10;

    const arrowElement = apiForm.querySelector('.arrow')! as HTMLElement;

    arrowElement.classList.remove('hidden');
    computePosition(anchor, apiForm, {
      placement: placement,
      middleware: [
        offset(offsetAmount),
        flip(),
        shift(),
        arrow({ element: arrowElement })
      ]
    }).then(({ x, y, placement, middlewareData }) => {
      apiForm.style.left = `${x}px`;
      apiForm.style.top = `${y}px`;

      const { x: arrowX, y: arrowY } = middlewareData.arrow!;
      let staticSide: 'bottom' | 'left' | 'top' | 'right' = 'bottom';
      if (placement.includes('top')) staticSide = 'bottom';
      if (placement.includes('right')) staticSide = 'left';
      if (placement.includes('bottom')) staticSide = 'top';
      if (placement.includes('left')) staticSide = 'right';

      arrowElement.style.left = arrowX ? `${arrowX}px` : '';
      arrowElement.style.top = arrowY ? `${arrowY}px` : '';
      arrowElement.style.right = '';
      arrowElement.style.bottom = '';
      arrowElement.style[staticSide] = '-4px';

      // Add shadow to the arrow
      if (staticSide === 'top') {
        arrowElement.style.filter =
          'drop-shadow(hsla(0, 0%, 0%, 0.1) -2px -2px 2px';
      } else if (staticSide === 'bottom') {
        arrowElement.style.filter =
          'drop-shadow(hsla(0, 0%, 0%, 0.1) 2px 2px 2px';
      }
    });
  }

  // ===== Event Methods ======
  signalClicked(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Collect API key if it has not been set
    if (this.apiKey === null) {
      this.showApiForm = !this.showApiForm;
      return;
    }

    // Open or close the sidebar
    const event = new Event('clicked', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  signalMouseEnter() {
    const leftCircle = this.shadowRoot!.querySelector('svg #left-circle');
    const rightCircle = this.shadowRoot!.querySelector('svg #right-circle');
    if (leftCircle && rightCircle) {
      this.isHovering = true;

      // Randomly choose blink / search animation
      const time = new Date().getTime();
      if (time % 2 === 1) {
        startLogoAnimation(
          () => {
            return this.isHovering;
          },
          leftCircle,
          rightCircle
        );
      } else {
        startLogoBlinkAnimation(
          () => {
            return this.isHovering;
          },
          leftCircle,
          rightCircle
        );
      }
    }
  }

  signalMouseLeave() {
    const leftCircle = this.shadowRoot!.querySelector('svg #left-circle');
    const rightCircle = this.shadowRoot!.querySelector('svg #right-circle');
    if (leftCircle && rightCircle) {
      this.isHovering = false;
      stopLogoAnimation(leftCircle, rightCircle);
    }
  }

  apiSubmitButtonClicked() {
    if (this.apiInputElement) {
      const value = this.apiInputElement.value;
      if (value === '') return;

      this.apiFormStatus = 'verify';
      const message: TextEmbWorkerMessage = {
        command: 'startEmbedding',
        payload: {
          apiKey: value,
          requestID: `auth-${this.textEmbWorkerRequestID++}`,
          text: 'Vengeance is a dish best served cold.'
        }
      };

      this.textEmbWorker?.postMessage(message);
    }
  }

  textEmbWorkerMessageHandler(e: MessageEvent<TextEmbWorkerMessage>) {
    switch (e.data.command) {
      case 'finishEmbedding': {
        if (e.data.payload.requestID.includes('auth')) {
          // Add the api key to the local storage
          if (USE_CACHE) {
            localStorage.setItem('palmAPIKey', e.data.payload.apiKey);
          }

          // Remove the auth dialog window
          this.apiKey = e.data.payload.apiKey;
          this.apiKeyPromiseResolve();
          this.showApiForm = false;

          // Send a message to window and update the api key in lite
          const windowMessage: SignalMessage = {
            command: 'palmAPIKeyAdded',
            payload: {
              apiKey: this.apiKey
            }
          };
          window.postMessage(windowMessage);
        }
        break;
      }

      case 'finishQueryAccidents': {
        if (e.data.payload.requestID.includes(REQUEST_NAME)) {
          const relevantAccidents = e.data.payload.relevantAccidents;
          this.updateRiskScore(relevantAccidents);

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
        if (e.data.payload.requestID.includes('auth')) {
          this.apiFormStatus = 'error';
          this.apiInputElement!.value = '';
        }
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  }

  badgeMouseEntered(e: MouseEvent) {
    const content = `Farsight finds <strong class="warn-text">${
      this.warnNum > 99 ? '99+' : this.warnNum
    } moderately relevant</strong> AI incident report${
      this.warnNum > 1 ? 's' : ''
    }.<br><span class="instruction-text">Click to review</span>`;
    tooltipMouseEnter(e, content, 'right', this.tooltipTop, 200, undefined, 8);
  }

  alertMouseEntered(e: MouseEvent) {
    const content = `Farsight finds <strong class="alert-text">${
      this.alertNum > 99 ? '99+' : this.alertNum
    } relevant</strong> AI incident report${
      this.alertNum > 1 ? 's' : ''
    }.<br><span class="instruction-text">Click to review</span>`;
    tooltipMouseEnter(e, content, 'right', this.tooltipTop, 200, undefined, 8);
  }

  tooltipMouseLeft() {
    tooltipMouseLeave(this.tooltipTop);
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <div
        class="container-signal"
        @click=${(e: MouseEvent) => this.signalClicked(e)}
        @mouseenter=${() => this.signalMouseEnter()}
        @mouseleave=${() => this.signalMouseLeave()}
      >
        <div
          class="signal"
          ?loading=${this.isLoading}
          ?no-api-key=${this.apiKey === null}
        >
          <div class="svg-icon logo-icon">${unsafeHTML(telescopeIcon)}</div>
          <div
            class="badge ${this.warnNum > 99 ? 'overflow' : ''}"
            @mouseenter=${(e: MouseEvent) => {
              this.badgeMouseEntered(e);
            }}
            @mouseleave=${() => {
              this.tooltipMouseLeft();
            }}
            ?hidden=${this.warnNum === 0}
          >
            ${Math.min(99, this.warnNum)}
            <div class="svg-icon">${unsafeHTML(addIcon)}</div>
          </div>
        </div>

        <div
          class="alert ${this.alertNum > 99 ? 'overflow' : ''}"
          @mouseenter=${(e: MouseEvent) => {
            this.alertMouseEntered(e);
          }}
          @mouseleave=${() => {
            this.tooltipMouseLeft();
          }}
          ?hidden=${this.alertNum === 0}
        >
          ${Math.min(99, this.alertNum)}
          <div class="svg-icon">${unsafeHTML(addIcon)}</div>
        </div>
      </div>

      <div class="api-form" ?hidden=${!this.showApiForm}>
        <div class="header">
          <span class="command-message">Enter API Key</span>
          <span class="error-message" ?hidden=${this.apiFormStatus !== 'error'}
            >Try another key</span
          >
          <span
            class="verifying-message"
            ?hidden=${this.apiFormStatus !== 'verify'}
            >Verifying</span
          >
        </div>
        <div class="content">
          <input id="input-api-key" placeholder="Paste PaLM API key" />
          <button
            class="button-submit"
            @click=${() => this.apiSubmitButtonClicked()}
          >
            OK
          </button>
        </div>
        <div class="arrow"></div>
      </div>

      <div id="popper-tooltip-top" class="popper-tooltip hidden" role="tooltip">
        <span class="popper-content"></span>
        <div class="popper-arrow"></div>
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
    'farsight-container-signal': FarsightContainerSignal;
  }
}

/**
 * Start playing the logo's searching animation.
 */
export const startLogoAnimation = (
  shouldContinue: () => boolean,
  leftCircle: Element,
  rightCircle: Element
) => {
  const rxs = [23, 78];
  const rys = [54, 54];
  const r = 2;

  const logoAnimate = () => {
    const rotTween = (j: number) => {
      const rx = rxs[j];
      const ry = rys[j];

      const i = d3.interpolate(-Math.PI, Math.PI);

      return (t: number) => {
        const x = Math.sin(i(t)) * r;
        const y = Math.cos(i(t)) * r;
        const alpha = (-i(t - 2 * Math.PI) / (Math.PI * 2)) * 360;
        return `translate(${x}, ${y}) rotate(${alpha}, ${rx}, ${ry})`;
      };
    };

    for (const [j, curCircle] of [
      d3.select(leftCircle),
      d3.select(rightCircle)
    ].entries()) {
      curCircle
        .transition('loop')
        .ease(d3.easeLinear)
        .duration(1400)
        .attrTween('transform', () => rotTween(j))
        .on('end', () => {
          if (shouldContinue()) {
            logoAnimate();
          } else {
            curCircle.attr('transform', null);
          }
        })
        .on('interrupt', () => {
          curCircle.attr('transform', null);
        })
        .on('cancel', () => {
          curCircle.attr('transform', null);
        });
    }
  };
  logoAnimate();
};

/**
 * Start playing the logo's searching animation.
 */
export const startLogoBlinkAnimation = (
  shouldContinue: () => boolean,
  leftCircle: Element,
  rightCircle: Element
) => {
  const rxs = [23, 78];
  const rys = [54.5, 54.5];

  const logoAnimate = (delayTime = 1000) => {
    const rotTween = (j: number) => {
      const rx = rxs[j];
      const ry = rys[j];

      const i = d3.interpolate(-1, 1);

      return (t: number) => {
        return `translate(${rx}, ${ry}) scale(${1}, ${i(
          t
        )}) translate(${-rx}, ${-ry})`;
      };
    };

    for (const [j, curCircle] of [
      d3.select(leftCircle),
      d3.select(rightCircle)
    ].entries()) {
      curCircle
        .transition('loop')
        .ease(d3.easeQuadInOut)
        .duration(600)
        .delay(delayTime)
        .attrTween('transform', () => rotTween(j))
        .on('end', () => {
          if (shouldContinue()) {
            logoAnimate();
          } else {
            curCircle.attr('transform', null);
          }
        })
        .on('interrupt', () => {
          curCircle.attr('transform', null);
        })
        .on('cancel', () => {
          curCircle.attr('transform', null);
        });
    }
  };

  logoAnimate(0);
};

/**
 * Interrupt the logo's searching animation.
 */
export const stopLogoAnimation = (
  leftCircle: Element,
  rightCircle: Element
) => {
  for (const [_, curCircle] of [
    d3.select(leftCircle),
    d3.select(rightCircle)
  ].entries()) {
    curCircle.interrupt('loop');
  }
};
