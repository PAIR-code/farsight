import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import componentCSS from './select.css?inline';

export interface SelectChangedMessage {
  selectedItem: string;
}

/**
 * Select element.
 *
 */
@customElement('promptpad-select')
export class PromptPadSelect extends LitElement {
  // ===== Class properties ======
  @property({ attribute: false })
  items: string[] = [];

  @property({ type: String })
  defaultItem = '';

  @state()
  selectedItem = '';

  @query('.select-box')
  selectBoxElement: HTMLElement | undefined;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  firstUpdated() {}

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('items')) {
      if (this.items.length > 1) {
        this.selectedItem = this.items[0];
      }
    }

    if (changedProperties.has('defaultItem')) {
      if (this.defaultItem !== '') {
        this.selectedItem = this.defaultItem;
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
          ${item}
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
          ${this.selectedItem}
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
