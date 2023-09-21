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
import { FarsightContainer } from '../container/container';
import '../container/container';
import '../prompt-panel/prompt-panel';

import componentCSS from './demo-page.scss?inline';

interface NotebookEventData extends Event {
  prompt: string;
}

const NOTEBOOK_MODE = import.meta.env.MODE === 'notebook';

/**
 * A container wrapper element.
 *
 */
@customElement('farsight-demo-page')
export class FarsightDemoPage extends LitElement {
  // ===== Properties ======
  @state()
  prompt = '';

  // ===== Constructor ======
  constructor() {
    super();

    this.initData();

    // Listen to notebook widget's event
    if (NOTEBOOK_MODE) {
      document.addEventListener('farsightData', (e: Event) => {
        const notebookEvent = e as NotebookEventData;
        this.prompt = notebookEvent.prompt;
      });
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  menuChanged = (item: string) => {
    console.log(item);
  };

  promptChangedCallback = (prompt: string) => {
    this.prompt = prompt;
  };

  // ===== Templates and Styles ======
  render() {
    let promptPanel = html``;

    if (!NOTEBOOK_MODE) {
      promptPanel = html`
        <farsight-prompt-panel
          .promptChangedCallback="${this.promptChangedCallback}"
        ></farsight-prompt-panel>
        <div class="top-content">
          <span class="tool-name">Farsight</span>
        </div>
      `;
    }

    return html`
      <div class="demo-page" ?notebook-mode=${NOTEBOOK_MODE}>
        ${promptPanel}
        <div class="bottom-content">
          <farsight-container
            .prompt="${this.prompt}"
            sizeDetermined="true"
          ></farsight-container>
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
    'farsight-demo-page': FarsightDemoPage;
  }
}
