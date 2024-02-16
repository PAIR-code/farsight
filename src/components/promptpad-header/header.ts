import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { round } from '@xiaohk/utils';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SupportedRemoteModel } from '../../llms/farsight-gen';
import type { SelectChangedMessage } from '../promptpad-select/select';
import type { ValueChangedMessage } from '../promptpad-slider/slider';

import '../promptpad-slider/slider';
import '../promptpad-select/select';
import componentCSS from './header.css?inline';

const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 1;

export interface TemperatureChangedMessage {
  temperature: number;
}

export interface ModelChangedMessage {
  model: keyof typeof SupportedRemoteModel;
}

/**
 * Header element.
 *
 */
@customElement('promptpad-header')
export class PromptPadHeader extends LitElement {
  // ===== Class properties ======
  @property({ type: Number })
  requestID = 0;

  @property({ type: String })
  defaultModel = '';

  runningRequestID = -1;

  @state()
  curTemperature = 0.25;

  @state()
  running = false;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('requestID')) {
      if (this.requestID !== this.runningRequestID) {
        this.running = false;
      }
    }
  }

  // ===== Custom Methods ======
  async initData() {}

  // ===== Event Methods ======
  /**
   * Handle model change from the select
   * @param e Custom event from the select
   */
  modelSelectChanged(e: CustomEvent<SelectChangedMessage>) {
    // Notify the parent about model change
    const event = new CustomEvent('model-changed', {
      detail: {
        model: e.detail.selectedItem
      }
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle temperate change from the slider
   * @param e Custom event from the slider
   */
  temperatureSliderValueChanged(e: CustomEvent<ValueChangedMessage>) {
    this.curTemperature = round(e.detail.value, 2);

    const event = new CustomEvent<TemperatureChangedMessage>(
      'temperature-changed',
      {
        detail: {
          temperature: this.curTemperature
        }
      }
    );
    this.dispatchEvent(event);
  }

  /**
   * Handler for run clicking the run button
   * @param e Mouse event
   */
  runClicked(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.running) {
      console.error('Run button clicked in running state');
      return;
    }

    this.running = true;

    // Record the request ID for this run (used to stop the run when the request
    // ID is updated by the container)
    this.runningRequestID = this.requestID;

    // Notify the parent to request a run
    const event = new Event('request-run');
    this.dispatchEvent(event);
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="header">
        <div class="item-group">
          <div class="model-select control-item">
            <span class="control-label">LLM Model</span>
            <promptpad-select
              defaultItem=${this.defaultModel}
              @select-changed=${(e: CustomEvent<SelectChangedMessage>) =>
                this.modelSelectChanged(e)}
            ></promptpad-select>
          </div>
        </div>

        <div class="item-group">
          <div class="temperature-slider control-item">
            <span class="control-label">Temperature</span>
            <div class="temperature-input">
              <span class="temperature-value">${this.curTemperature}</span>
              <promptpad-slider
                min=${TEMPERATURE_MIN}
                max=${TEMPERATURE_MAX}
                curValue=${this.curTemperature}
                @valueChanged=${(e: CustomEvent<ValueChangedMessage>) =>
                  this.temperatureSliderValueChanged(e)}
              ></promptpad-slider>
            </div>
          </div>

          <button
            class="run-button control-item"
            ?is-running=${this.running}
            @click=${(e: MouseEvent) => this.runClicked(e)}
          >
            <span class="run-text">Run</span>
            <div class="loader-container">
              <div class="circle-loader"></div>
            </div>
          </button>
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
    'promptpad-header': PromptPadHeader;
  }
}
