import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import {
  customElement,
  property,
  state,
  query,
  queryAsync
} from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  startLogoAnimation,
  startLogoBlinkAnimation,
  stopLogoAnimation
} from '../container-signal/container-signal';

import componentCSS from './article.css?inline';
import iconLogo from '../../images/icon-logo.svg?raw';

/**
 * Article element.
 *
 */
@customElement('farsight-article')
export class FarsightArticle extends LitElement {
  //==========================================================================||
  //                              Class Properties                            ||
  //==========================================================================||

  //==========================================================================||
  //                             Lifecycle Methods                            ||
  //==========================================================================||
  constructor() {
    super();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {}

  //==========================================================================||
  //                              Custom Methods                              ||
  //==========================================================================||
  async initData() {}

  //==========================================================================||
  //                              Event Handlers                              ||
  //==========================================================================||
  logoContainerMouseEntered(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const leftCircle = target.querySelector('svg path#left-circle');
    const rightCircle = target.querySelector('svg path#right-circle');
    if (leftCircle && rightCircle) {
      if (Math.random() < 0.5) {
        startLogoAnimation(() => true, leftCircle, rightCircle);
      } else {
        startLogoBlinkAnimation(() => true, leftCircle, rightCircle);
      }
    }
  }

  logoContainerMouseLeft(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const leftCircle = target.querySelector('svg path#left-circle');
    const rightCircle = target.querySelector('svg path#right-circle');
    if (leftCircle && rightCircle) {
      stopLogoAnimation(leftCircle, rightCircle);
    }
  }

  //==========================================================================||
  //                             Private Helpers                              ||
  //==========================================================================||

  //==========================================================================||
  //                           Templates and Styles                           ||
  //==========================================================================||
  render() {
    return html`
      <div class="article">
        <h2
          id="tool"
          @mouseenter=${(e: MouseEvent) => this.logoContainerMouseEntered(e)}
          @mouseleave=${(e: MouseEvent) => this.logoContainerMouseLeft(e)}
        >
          <span>What is </span>
          <span class="svg-icon logo-icon">${unsafeHTML(iconLogo)}</span>
          <span><span class="tool-name">Farsight</span>?</span>
        </h2>
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
    'farsight-article': FarsightArticle;
  }
}
