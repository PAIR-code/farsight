import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import {
  customElement,
  property,
  state,
  query,
  queryAsync
} from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SupportedRemoteModel, textGenFarsight } from '../../llms/farsight-gen';

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
import componentCSS from './promptpad-container.css?inline';

export interface PromptRunMessage {
  prompt: string;
}

const DEV_MODE = import.meta.env.DEV;

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

  curModel: keyof typeof SupportedRemoteModel = 'gemini-pro-free';

  prompt = '';

  @state()
  respondedPrompt = '';

  @queryAsync('promptpad-editor')
  editorElement!: Promise<PromptPadEditor>;

  @state()
  promptOutput = '';

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  firstUpdated() {}

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
    // Get the endpoint from local storage
    const endPoint = localStorage.getItem('farsight-endpoint');
    if (endPoint === null) {
      throw Error('Farsight endpoint is not found.');
    }

    const result = textGenFarsight(
      `${this.requestID}`,
      endPoint,
      this.prompt,
      this.temperature,
      this.curModel,
      true,
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

  async overridePrompt(prompt: string) {
    const editorElement = await this.editorElement;
    editorElement.overridePrompt(prompt);
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
  async requestRun() {
    const editorElement = await this.editorElement;

    // Clear the last error message
    this.showError = false;

    // Pull the prompt (the prompt pushed from the child can be out of dated if
    // the user manually deletes the highlighted text)
    this.prompt = editorElement.getCurPrompt();

    // Start the inference
    this.startTextGen();
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="container">
        <promptpad-header
          requestID=${this.requestID}
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
