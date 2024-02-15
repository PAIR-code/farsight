import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import '../promptpad-slider/slider';
import componentCSS from './footer.css?inline';

/**
 * Footer element.
 *
 */
@customElement('promptpad-footer')
export class PromptPadFooter extends LitElement {
  // ===== Class properties ======

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {}

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="footer">
        <div class="temperature-slider control-item">
          <span class="control-label">Temperature</span>
          <promptpad-slider></promptpad-slider>
        </div>
        <button class="run-button control-item">Run</button>
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
    'promptpad-footer': PromptPadFooter;
  }
}
