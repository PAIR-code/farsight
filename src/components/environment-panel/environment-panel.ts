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
import { customElement, property } from 'lit/decorators.js';

import componentCSS from './environment-panel.scss?inline';

/**
 * Environment panel element.
 *
 */
@customElement('farsight-environment-panel')
export class FarsightEnvironmentPanel extends LitElement {
  // ===== Properties ======
  @property({ type: String })
  prompt = '';

  @property()
  apiKey: string | null = null;

  // ===== Constructor ======
  constructor() {
    super();
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======

  // ===== Templates and Styles ======
  render() {
    return html` <div class="environment-panel">Environment Panel</div> `;
  }

  static styles = [
    css`
      ${unsafeCSS(componentCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'farsight-environment-panel': FarsightEnvironmentPanel;
  }
}
