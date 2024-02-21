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
import { customElement, property, state, query } from 'lit/decorators.js';
import { TextGenFakeWorker } from '../../workers/text-gen-fake-worker';

import type { FakeWorker } from '../../workers/fake-worker';
import type {
  TextGenWorkerMessage,
  SimpleEventMessage
} from '../../types/common-types';

import TextGenWorkerInline from '../../workers/text-gen-worker?worker&inline';
import componentCSS from './modal-auth.scss?inline';

const USE_CACHE = import.meta.env.MODE !== 'x20';
const LIB_MODE = import.meta.env.MODE === 'library';
const EXTENSION_MODE = import.meta.env.MODE === 'extension';

/**
 * Modal auth element.
 *
 */
@customElement('farsight-modal-auth')
export class FarsightModalAuth extends LitElement {
  // ===== Properties ======
  @property({ type: String })
  apiKey = '';

  @query('.modal-auth')
  modalElement!: HTMLElement | null;

  @query('.message')
  messageElement!: HTMLElement | null;

  @query('#api-input')
  apiInputElement!: HTMLInputElement | null;

  @state()
  message = 'Verifying...';

  textGenWorker: Worker | FakeWorker<TextGenWorkerMessage>;
  textGenWorkerRequestID = 1;

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    if (!EXTENSION_MODE) {
      this.textGenWorker = new TextGenWorkerInline();
      this.textGenWorker.onmessage = (e: MessageEvent<TextGenWorkerMessage>) =>
        this.textGenWorkerMessageHandler(e);
    } else {
      const textGenWorkerMessageHandler = (
        e: MessageEvent<TextGenWorkerMessage>
      ) => {
        this.textGenWorkerMessageHandler(e);
      };
      this.textGenWorker = new TextGenFakeWorker(textGenWorkerMessageHandler);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.updateComplete.then(_ => {
      // Check if the user has already entered the API key. Show the modal if
      // there is no API key found.
      const apiKey = USE_CACHE ? localStorage.getItem('palmAPIKey') : null;

      if (apiKey === null) {
        window.setTimeout(() => {
          this.modalElement?.classList.add('displayed');
        }, 300);
      } else {
        const event = new CustomEvent<SimpleEventMessage>('api-key-added', {
          detail: {
            message: apiKey
          }
        });
        this.dispatchEvent(event);
      }
    });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    // Stop showing the modal if the API key is set from a different venue
    if (changedProperties.has('apiKey')) {
      if (this.apiKey !== '') {
        this.modalElement?.classList.remove('displayed');
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  authVerificationFailed = (message: string) => {
    // Show the error message in the auth dialog
    this.messageElement?.classList.remove('loading');
    this.messageElement?.classList.add('error');
    this.message = 'Invalid, try a different key';
    console.error(message);
  };

  authVerificationSucceeded = (apiKey: string) => {
    // Add the api key to the local storage
    if (USE_CACHE) {
      localStorage.setItem('palmAPIKey', apiKey);
    }

    const event = new CustomEvent<SimpleEventMessage>('api-key-added', {
      detail: {
        message: apiKey
      }
    });
    this.dispatchEvent(event);

    // Remove the auth dialog window
    this.modalElement?.classList.remove('displayed');
  };

  // ===== Event Methods ======
  submitButtonClicked = () => {
    const apiKey = this.apiInputElement?.value;
    if (apiKey === undefined || apiKey === '') {
      return;
    }

    // Start to verify the given key
    this.messageElement?.classList.remove('error');
    this.messageElement?.classList.add('displayed');
    this.messageElement?.classList.add('loading');
    this.message = 'Verifying';

    const message: TextGenWorkerMessage = {
      command: 'startTextGen',
      payload: {
        requestID: `auth-${this.textGenWorkerRequestID++}`,
        apiKey,
        prompt: 'The color of sky is',
        temperature: 0.7
      }
    };
    this.textGenWorker.postMessage(message);
  };

  textGenWorkerMessageHandler = (e: MessageEvent<TextGenWorkerMessage>) => {
    switch (e.data.command) {
      case 'finishTextGen': {
        // If the textGen is initialized in the auth function, add the api key
        // to the local storage
        if (e.data.payload.requestID.includes('auth')) {
          this.authVerificationSucceeded(e.data.payload.apiKey);
        }
        break;
      }

      case 'error': {
        // Error handling for the PaLM API calls
        if (e.data.payload.originalCommand === 'startTextGen') {
          this.authVerificationFailed(e.data.payload.message);
        }
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  };

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="modal-auth">
        <div class="dialog-window">
          <div class="header">Enter Gemini API Key</div>

          <div class="content">
            <span class="info-text">
              Find your key at
              <a href="https://aistudio.google.com/app/apikey" target="_blank"
                >Google AI Studio</a
              >
            </span>

            <input id="api-input" placeholder="API Key" />

            <div class="message">${this.message}</div>
          </div>

          <div class="footer">
            <button
              class="primary"
              @click="${() => this.submitButtonClicked()}"
            >
              Submit
            </button>
            <button disabled>Cancel</button>
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
    'farsight-modal-auth': FarsightModalAuth;
  }
}
