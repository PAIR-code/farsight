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
import { LitElement, css, unsafeCSS, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state, query } from 'lit/decorators.js';

import componentCSS from './prompt-panel.scss?inline';
import arrowIcon from '../../images/icon-arrow.svg?raw';

const DEV_MODE = import.meta.env.MODE === 'development';

/**
 * Prompt panel element.
 *
 */
@customElement('farsight-prompt-panel')
export class FarsightPromptPanel extends LitElement {
  // ===== Properties ======
  @property()
  promptChangedCallback = (_prompt: string) => {};

  @state()
  randomPrompts: string[];

  @state()
  curPromptIndex = -1;

  @query('#prompt-textarea')
  promptTextareaElement!: HTMLTextAreaElement | null;

  randomIntGenerator: d3.RandomInt;

  // ===== Constructor ======
  constructor() {
    super();
    this.randomPrompts = [];

    // We use a random seed during development
    if (DEV_MODE) {
      const seed = 0.20230506;
      this.randomIntGenerator = d3.randomInt.source(d3.randomLcg(seed));
    } else {
      this.randomIntGenerator = d3.randomInt;
    }

    this.initData();
  }

  // ===== Custom Methods ======
  initData = async () => {
    // Load the embeddings for AI accidents
    this.randomPrompts = await fetch(
      `${import.meta.env.BASE_URL}data/random-prompts.json`
    )
      .then((response: Response) => response.json())
      .then((jsonData: string[]) => jsonData)
      .catch((error: Error) => {
        console.error(error);
        throw Error('Failed to load random prompts', error);
      });

    if (DEV_MODE) {
      this.curPromptIndex = 8;
    } else {
      this.curPromptIndex = this.randomIntGenerator(
        0,
        this.randomPrompts.length
      )();
    }

    await this.updateComplete;

    // Manually trigger the input event to sync the prompt in other components
    const event = new CustomEvent('input');
    this.promptTextareaElement?.dispatchEvent(event);
  };

  // ===== Event Methods ======
  promptInputChanged = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    this.promptChangedCallback(target.value);
  };

  arrowButtonClicked = async (increase: boolean) => {
    if (increase) {
      this.curPromptIndex = Math.min(
        this.randomPrompts.length,
        this.curPromptIndex + 1
      );
    } else {
      this.curPromptIndex = Math.max(0, this.curPromptIndex - 1);
    }

    await this.updateComplete;

    // Manually trigger the input event to sync the prompt in other components
    const event = new CustomEvent('input');
    this.promptTextareaElement?.dispatchEvent(event);
  };

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="prompt-panel">
        <div class="input-container">
          <textarea
            id="prompt-textarea"
            spellcheck="false"
            .value="${this.randomPrompts[this.curPromptIndex] === undefined
              ? ''
              : this.randomPrompts[this.curPromptIndex]}"
            @input="${(e: InputEvent) => this.promptInputChanged(e)}"
          ></textarea>
        </div>

        <div class="bottom-row">
          <div class="button-row">
            <button
              class="bottom-button"
              @click="${() => {
                this.arrowButtonClicked(false);
              }}"
            >
              <div class="svg-icon flip-horizontal">
                ${unsafeHTML(arrowIcon)}
              </div>
            </button>

            <span class="prompt-index-text"
              >${this.curPromptIndex + 1}/${this.randomPrompts.length} Random
              Prompts</span
            >

            <button
              class="bottom-button"
              @click="${() => {
                this.arrowButtonClicked(true);
              }}"
            >
              <div class="svg-icon">${unsafeHTML(arrowIcon)}</div>
            </button>
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
    'farsight-prompt-panel': FarsightPromptPanel;
  }
}
