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

import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../harm-summary/harm-summary';

import TextEmbWorkerInline from '../../workers/text-emb-worker?worker&inline';
import componentCSS from './use-case-panel.scss?inline';

const LIB_MODE = import.meta.env.MODE === 'library';

/**
 * Use case panel element.
 *
 */
@customElement('farsight-use-case-panel')
export class FarsightUseCasePanel extends LitElement {
  // ===== Properties ======
  @property({ type: String })
  prompt = '';

  @property()
  apiKey: string | null = null;

  @query('#popper-tooltip-top')
  popperElementTop!: HTMLElement;

  @query('#popper-tooltip-bottom')
  popperElementBottom!: HTMLElement;

  textEmbWorker: Worker;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
    this.textEmbWorker = new TextEmbWorkerInline();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  // willUpdate(changedProperties: PropertyValues<this>) {}

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="use-case-panel">
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

        <farsight-harm-summary
          .popperElementTop=${this.popperElementTop}
          .popperElementBottom=${this.popperElementBottom}
        ></farsight-harm-summary>
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
    'farsight-use-case-panel': FarsightUseCasePanel;
  }
}
