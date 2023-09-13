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
import { LitElement, css, unsafeCSS, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { config } from '../../utils/config';

import '../menu/menu';
import '../use-case-panel/use-case-panel';
import '../harm-panel/harm-panel';
import '../accident-panel/accident-panel';
import '../environment-panel/environment-panel';
import '../modal-auth/modal-auth';

import type { PanelName, SimpleEventMessage } from '../../types/common-types';

import containerCSS from './container.scss?inline';

const USE_CACHE = import.meta.env.MODE !== 'x20';
const HOT_DEV_MODE = config.hotDev;

/**
 * A container wrapper element.
 */
@customElement('farsight-container')
export class FarsightContainer extends LitElement {
  // ===== Class properties ======
  @property({ type: String })
  prompt = '';

  @state()
  activeMenuButton: PanelName = 'harm';

  @state()
  apiKey: string | null = null;

  // ===== Constructor ======
  constructor() {
    super();

    if (HOT_DEV_MODE) {
      this.activeMenuButton = 'harm';
      // this.activeMenuButton = 'use-case';
    }

    this.initData();
  }

  // ===== Custom Methods ======
  initData = () => {
    if (USE_CACHE) {
      const apiKey = localStorage.getItem('palmAPIKey');
      if (apiKey !== null) this.apiKey = apiKey;
    }
  };

  // ===== Event Methods ======
  notifyMenuChanged = (itemName: PanelName) => {
    this.activeMenuButton = itemName;
  };

  handleAPIKeyAdded(e: CustomEvent<SimpleEventMessage>) {
    this.apiKey = e.detail.message;
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <link
        href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap"
        rel="stylesheet"
      />

      <div class="container">
        <farsight-menu
          .activeMenuButton="${this.activeMenuButton}"
          .notifyMenuChanged="${this.notifyMenuChanged}"
        ></farsight-menu>

        <div class="main-panel">
          <farsight-use-case-panel
            class="panel"
            .prompt="${this.prompt}"
            .apiKey="${this.apiKey}"
            ?displayed="${this.activeMenuButton == 'use-case'}"
          ></farsight-use-case-panel>

          <farsight-harm-panel
            class="panel"
            .prompt="${this.prompt}"
            .apiKey="${this.apiKey}"
            ?displayed="${this.activeMenuButton == 'harm'}"
          ></farsight-harm-panel>

          <farsight-accident-panel
            class="panel"
            .prompt="${this.prompt}"
            .apiKey="${this.apiKey}"
            ?displayed="${this.activeMenuButton == 'accident'}"
          ></farsight-accident-panel>

          <farsight-environment-panel
            class="panel"
            .prompt="${this.prompt}"
            .apiKey="${this.apiKey}"
            ?displayed="${this.activeMenuButton == 'environment'}"
          ></farsight-environment-panel>
        </div>

        <farsight-modal-auth
          class="modal"
          @api-key-added=${(e: CustomEvent<SimpleEventMessage>) =>
            this.handleAPIKeyAdded(e)}
        ></farsight-modal-auth>
      </div>
    `;
  }

  static styles = [
    css`
      ${unsafeCSS(containerCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'farsight-container': FarsightContainer;
  }
}
