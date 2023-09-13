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

import { LitElement, css, unsafeCSS, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { config } from '../../utils/config';
import type { AccidentReport } from '../../types/common-types';

import componentCSS from './accident-card.scss?inline';

/**
 * Accident card element.
 *
 */
@customElement('farsight-accident-card')
export class FarsightAccidentCard extends LitElement {
  // ===== Class properties ======
  @property({ type: Object })
  accidentReport: AccidentReport | null = null;

  errorImageSrc = config.urls.errorImage;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="accident-card">
        <div class="left">
          <a href="${ifDefined(this.accidentReport?.url)}" target="_blank">
            <img
              class="news-image"
              src="${ifDefined(this.accidentReport?.imageURL)}"
              @error="${(e: ErrorEvent) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = this.errorImageSrc;
              }}"
            />
          </a>
        </div>
        <div class="right">
          <div class="title">
            <a href="${ifDefined(this.accidentReport?.url)}" target="_blank"
              >${this.accidentReport?.title}</a
            >
          </div>
          <div class="description">${this.accidentReport?.text}</div>
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
    'farsight-accident-card': FarsightAccidentCard;
  }
}
