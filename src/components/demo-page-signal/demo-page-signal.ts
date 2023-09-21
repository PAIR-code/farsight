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
import '../container-signal/container-signal';
import '../prompt-panel/prompt-panel';

import componentCSS from './demo-page-signal.scss?inline';

interface NotebookEventData extends Event {
  prompt: string;
}

const NOTEBOOK_MODE = import.meta.env.MODE === 'notebook';

/**
 * Demo page signal element.
 *
 */
@customElement('farsight-demo-page-signal')
export class FarsightDemoPageSignal extends LitElement {
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
        <div class="demo-page-signal">
          <img src="/images/background.png" />
          <div class="signal-content">
            <farsight-container-signal
              prompt=${this.promptToChild}
              @launch-farsight=${() => {
                alert('Farsight time!');
              }}
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
        <div ?notebook-mode=${NOTEBOOK_MODE} class="demo-page-signal">
          <div class="signal-content">
            <farsight-container-signal
              prompt=${this.promptToChild}
              @launch-farsight=${() => {}}
            ></farsight-container-signal>
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
    'farsight-demo-page-lite': FarsightDemoPageSignal;
  }
}
