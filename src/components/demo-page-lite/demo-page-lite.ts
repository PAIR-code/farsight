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
import '../container-lite/container-lite';
import '../container-signal/container-signal';
import '../prompt-panel/prompt-panel';

import componentCSS from './demo-page-lite.scss?inline';

interface NotebookEventData extends Event {
  prompt: string;
}

// const NOTEBOOK_MODE = import.meta.env.MODE === 'notebook';
const NOTEBOOK_MODE = true;

/**
 * Demo page lite element.
 *
 */
@customElement('farsight-demo-page-lite')
export class FarsightDemoPageLite extends LitElement {
  // ===== Class properties ======
  @state()
  prompt = '';

  @state()
  promptToChild = '';

  tagline = 'A Companion to Cultivate Responsible AI Awareness';

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    // Listen to notebook widget's event
    if (NOTEBOOK_MODE) {
      document.addEventListener('farsightData', (e: Event) => {
        const notebookEvent = e as NotebookEventData;
        this.prompt = notebookEvent.prompt;
        this.promptToChild = notebookEvent.prompt;
      });
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  promptChangedCallback = (prompt: string) => {
    this.prompt = prompt;
    window.setTimeout(() => {
      this.promptToChild = this.prompt;
    }, 1000);
  };

  // ===== Templates and Styles ======
  render() {
    if (!NOTEBOOK_MODE) {
      return html`
        <div class="demo-page-lite">
          <img src="/images/background.png" />
          <div class="lite-content">
            <farsight-container-lite
              prompt=${this.promptToChild}
              @launch-farsight=${() => {}}
            ></farsight-container-lite>
          </div>

          <div class="signal-content">
            <farsight-container-signal
              prompt=${this.promptToChild}
              @clicked=${() => {}}
            ></farsight-container-signal>
          </div>

          <div class="prompt-panel">
            <farsight-prompt-panel
              .promptChangedCallback="${this.promptChangedCallback}"
            ></farsight-prompt-panel>
          </div>
        </div>
      `;
    } else {
      return html`
        <div ?notebook-mode=${NOTEBOOK_MODE} class="demo-page-lite">
          <div class="lite-content">
            <farsight-container-lite
              prompt=${this.promptToChild}
              ?notebookMode=${NOTEBOOK_MODE}
              @launch-farsight=${() => {}}
            ></farsight-container-lite>
          </div>
        </div>
      `;
    }
  }

  static styles = [
    css`
      ${unsafeCSS(componentCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'farsight-demo-page-lite': FarsightDemoPageLite;
  }
}
