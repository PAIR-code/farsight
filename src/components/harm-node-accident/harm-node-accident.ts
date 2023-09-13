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
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { config } from '../../utils/config';

import { HarmCategory } from '../harm-panel/harm-types';
import type { HarmTaxonomy, HarmConfig } from '../harm-panel/harm-types';
import type {
  AccidentReportData,
  AccidentReport
} from '../../types/common-types';

import componentCSS from './harm-node-accident.scss?inline';
import caretDownIcon from '../../images/icon-caret-down.svg?raw';
import newsIcon from '../../images/icon-news-filled.svg?raw';

/**
 * Harm node accident element.
 *
 */
@customElement('farsight-harm-node-accident')
export class FarsightHarmNodeAccident extends LitElement {
  // ===== Class properties ======
  @property({ attribute: false })
  accidentReports: AccidentReport[] = [];

  @state()
  curReportIndex = 0;

  errorImageSrc = config.urls.errorImage;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  upButtonClicked(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.curReportIndex =
      (this.curReportIndex + 1) % this.accidentReports.length;
  }

  downButtonClicked(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.curReportIndex === 0) {
      this.curReportIndex = this.accidentReports.length - 1;
    } else {
      this.curReportIndex = this.curReportIndex - 1;
    }
  }

  // ===== Templates and Styles ======
  render() {
    const curReport =
      this.accidentReports.length > 0
        ? this.accidentReports[this.curReportIndex]
        : null;

    return html`
      <div class="section-header">
        <div class="header-container">
          <div class="svg-icon">${unsafeHTML(newsIcon)}</div>
          <div class="name">Related AI Accidents</div>
        </div>

        <div class="controller">
          <div
            class="left-button svg-icon"
            @click=${(e: MouseEvent) => this.upButtonClicked(e)}
          >
            ${unsafeHTML(caretDownIcon)}
          </div>
          <div
            class="right-button svg-icon"
            @click=${(e: MouseEvent) => this.downButtonClicked(e)}
          >
            ${unsafeHTML(caretDownIcon)}
          </div>
        </div>
      </div>

      <div class="section-content report-content">
        <div class="harm-node-accident">
          <div class="accident-card">
            <div class="left">
              <a href="${ifDefined(curReport?.url)}" target="_blank">
                <img
                  class="news-image"
                  src="${ifDefined(curReport?.imageURL)}"
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
    'farsight-harm-node-accident': FarsightHarmNodeAccident;
  }
}
