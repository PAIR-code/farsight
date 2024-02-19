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
import textData from './article.yaml';

interface FigureData {
  url: string;
  caption: string;
}

interface TextData {
  intro: string[];
  usageIntro: string[];
  usageAlert: string[];
  usageIncident: string[];
  usageUseCase: string[];
  usageHarmEnvisioner: string[];

  figures: {
    alert: FigureData;
  };

  videos: {
    alert: FigureData;
  };
}

const text = textData as TextData;

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
    // Introduction
    let introduction = html`<h2
      id="tool"
      @mouseenter=${(e: MouseEvent) => this.logoContainerMouseEntered(e)}
      @mouseleave=${(e: MouseEvent) => this.logoContainerMouseLeft(e)}
    >
      <span>What is </span>
      <span class="svg-icon logo-icon">${unsafeHTML(iconLogo)}</span>
      <span><span class="tool-name">Farsight</span>?</span>
    </h2>`;

    for (const p of text.intro) {
      introduction = html`${introduction}
        <p>${unsafeHTML(p)}</p>`;
    }

    // Usage
    let usage = html`<h2>What Can I Do with Farsight?</h2>`;

    for (const p of text.usageIntro) {
      usage = html`${usage}
        <p>${unsafeHTML(p)}</p>`;
    }

    // Usage: alert
    const usageAlert = html`<h4>Alert Symbol</h4>
      <p>${unsafeHTML(text.usageAlert[0])}</p>
      <p>${unsafeHTML(text.usageAlert[1])}</p>

      <div class="figure">
        <img src=${text.figures.alert.url} />
        <div class="figure-caption">
          Figure 1. ${unsafeHTML(text.figures.alert.caption)}
        </div>
      </div>
      <p>${unsafeHTML(text.usageAlert[2])}</p> `;

    // Usage: incident panel
    const usageIncident = html`<h4>Awareness Sidebar: Incident Panel</h4>
      <p>${unsafeHTML(text.usageIncident[0])}</p>
      <p>${unsafeHTML(text.usageIncident[1])}</p>`;

    // Usage: use case panel
    const usageUseCase = html`<h4>Awareness Sidebar: Use Case Panel</h4>
      <p>${unsafeHTML(text.usageUseCase[0])}</p>
      <p>${unsafeHTML(text.usageUseCase[1])}</p>`;

    // Usage: harm envisioner
    const usageHarmEnvisioner = html`<h4>Harm Envisioner</h4>
      <p>${unsafeHTML(text.usageHarmEnvisioner[0])}</p>
      <p>${unsafeHTML(text.usageHarmEnvisioner[1])}</p>`;

    return html`
      <div class="article">
        ${introduction} ${usage} ${usageAlert} ${usageIncident} ${usageUseCase}
        ${usageHarmEnvisioner}
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
