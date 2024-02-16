import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SupportedRemoteModel } from '../../llms/farsight-gen';

import componentCSS from './select.css?inline';

export interface SelectChangedMessage {
  selectedItem: keyof typeof SupportedRemoteModel;
}

/**
 * Select element.
 *
 */
@customElement('promptpad-select')
export class PromptPadSelect extends LitElement {
  // ===== Class properties ======
  @property({ type: String })
  defaultItem = '';

  @state()
  items: (keyof typeof SupportedRemoteModel)[] = [];

  @state()
  selectedItem: keyof typeof SupportedRemoteModel = 'gemini-pro-free';

  @query('.select-box')
  selectBoxElement: HTMLElement | undefined;

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    // Initialize the select options
    this.items = [];
    for (const key in SupportedRemoteModel) {
      this.items.push(key as keyof typeof SupportedRemoteModel);
    }
  }

  firstUpdated() {}

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('defaultItem')) {
      if (this.defaultItem !== '') {
        this.selectedItem = this
          .defaultItem as keyof typeof SupportedRemoteModel;
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  selectChanged(e: InputEvent) {
    const target = e.target as HTMLSelectElement;
    const index = parseInt(target.value.replace(/item-(\d+)/, '$1'));
    this.selectedItem = this.items[index];

    // Notify the parent about select change
    const event = new CustomEvent<SelectChangedMessage>('select-changed', {
      detail: {
        selectedItem: this.selectedItem
      }
    });
    this.dispatchEvent(event);
  }

  // ===== Templates and Styles ======
  render() {
    // Compile the select options
    let selectOption = html``;
    for (const [i, item] of this.items.entries()) {
      selectOption = html`${selectOption}
        <option value="item-${i}" ?selected=${item === this.selectedItem}>
          ${SupportedRemoteModel[item]}
        </option>`;
    }

    return html`
      <div class="select">
        <div class="select-box">
          <select
            class="hidden-select"
            @change=${(e: InputEvent) => this.selectChanged(e)}
          >
            ${selectOption}
          </select>
          ${SupportedRemoteModel[this.selectedItem]}
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
    'promptpad-select': PromptPadSelect;
  }
}
