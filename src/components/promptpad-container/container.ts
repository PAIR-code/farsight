import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { textGenPalm } from '../../llms/palm';
import { textGenGpt } from '../../llms/gpt';

import type {
  TemperatureChangedMessage,
  ModelChangedMessage
} from '../promptpad-header/header';
import type { TextGenWorkerMessage } from '../../llms/palm';
import type {
  promptUpdatedMessage,
  PromptPadEditor
} from '../promptpad-editor/editor';

import '../promptpad-header/header';
import '../promptpad-editor/editor';
import '../promptpad-footer/footer';
import componentCSS from './container.css?inline';

export interface PromptRunMessage {
  prompt: string;
}

const MODEL_LIST = ['GPT-3.5 Turbo', 'PaLM 2'];

/**
 * Container element.
 *
 */
@customElement('promptpad-container')
export class PromptPadContainer extends LitElement {
  // ===== Class properties ======
  @state()
  temperature = 0;

  @state()
  requestID = 0;

  @state()
  showError = false;

  curModel = MODEL_LIST[1];
  modelCallMap: Map<string, typeof textGenPalm>;

  prompt = '';

  @state()
  respondedPrompt = '';

  apiKeyMap = new Map<string, string>();

  @query('promptpad-editor')
  editorElement: PromptPadEditor | undefined;

  @state()
  promptOutput = '';

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    this.modelCallMap = new Map<string, typeof textGenPalm>();
    this.modelCallMap.set('PaLM 2', textGenPalm);
    this.modelCallMap.set('GPT-3.5 Turbo', textGenGpt);

    this.apiKeyMap.set(
      'GPT-3.5 Turbo',
      atob(
        'c2stdkJ5Y3RXeExZWGJ4U1hwa0UyTFFUM0JsYmtGSjFaZXprTXc0QVVkWGxzQTY2YkQy'
      )
    );
    this.apiKeyMap.set('PaLM 2', 'AIzaSyDDHPz7ZX4t3Db9OIghv_eF0WKjCeJYEQc');
  }

  firstUpdated() {
    setTimeout(() => {
      // this.showError = true;
      // this.startTextGen();
    }, 1000);
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {}

  // ===== Custom Methods ======
  initData = async () => {};

  /**
   * Start generating text based on the prompt.
   */
  startTextGen() {
    const curCallFunction = this.modelCallMap.get(this.curModel);
    const curApiKey = this.apiKeyMap.get(this.curModel);

    if (curCallFunction === undefined) {
      throw Error(`Cannot find ${this.curModel} in this.modelCallMap`);
    }

    if (curApiKey === undefined) {
      throw Error(`Cannot find ${this.curModel} in this.apiKeyMap`);
    }

    const result = curCallFunction(
      curApiKey,
      `${this.requestID}`,
      this.prompt,
      this.temperature,
      [],
      ''
    );

    result.then(value => {
      this.finishTextGen(value);
    });
  }

  /**
   * Callback function for the LLM API request
   * @param message Output of the LLM
   */
  finishTextGen(message: TextGenWorkerMessage) {
    switch (message.command) {
      case 'finishTextGen': {
        // Show the output in the editor
        this.promptOutput = message.payload.result;
        this.requestID++;

        // Notify the parent that the user has run a prompt
        this.respondedPrompt = this.prompt;
        const event = new CustomEvent<PromptRunMessage>('prompt-run', {
          detail: {
            prompt: this.prompt
          }
        });
        this.dispatchEvent(event);
        break;
      }

      case 'error': {
        this.showError = true;
        this.requestID++;
        break;
      }

      default: {
        console.error('Unknown text gen message.');
        return;
      }
    }
  }

  overridePrompt(prompt: string) {
    if (this.editorElement) {
      this.editorElement.overridePrompt(prompt);
    }
  }

  // ===== Event Methods ======
  /**
   * Handle temperature change from the header
   * @param e Custom event from the header
   */
  temperatureChanged(e: CustomEvent<TemperatureChangedMessage>) {
    this.temperature = e.detail.temperature;
  }

  /**
   * Handle model change from the header
   * @param e Custom event from the header
   */
  modelChanged(e: CustomEvent<ModelChangedMessage>) {
    this.curModel = e.detail.model;
  }

  /**
   * Handle prompt change from the editor
   * @param e Custom event from the edit
   */
  promptUpdated(e: CustomEvent<promptUpdatedMessage>) {
    this.prompt = e.detail.prompt;

    // Clean the output if the prompt is changed
    this.promptOutput = '';
  }

  /**
   * Handler when user clicks run in the header
   */
  requestRun() {
    // Clear the last error message
    this.showError = false;

    // Start the inference
    this.startTextGen();
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="container">
        <promptpad-header
          requestID=${this.requestID}
          .modelList=${MODEL_LIST}
          defaultModel=${this.curModel}
          @request-run=${() => this.requestRun()}
          @model-changed=${(e: CustomEvent<ModelChangedMessage>) =>
            this.modelChanged(e)}
          @temperature-changed=${(e: CustomEvent<TemperatureChangedMessage>) =>
            this.temperatureChanged(e)}
        ></promptpad-header>

        <promptpad-editor
          @prompt-changed=${(e: CustomEvent<promptUpdatedMessage>) =>
            this.promptUpdated(e)}
          highlightText=${this.promptOutput}
        ></promptpad-editor>

        <div class="error-message" ?is-hidden=${!this.showError}>
          The output was blocked due to safety concerns. Try a different prompt.
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
    'promptpad-container': PromptPadContainer;
  }
}
