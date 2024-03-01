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
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  UseCaseCategories,
  StakeholderCategory,
  HarmCategory
} from '../harm-panel/harm-types';
import {
  stopLogoAnimation,
  startLogoBlinkAnimation
} from '../container-signal/container-signal';

import iconPlus from '../../images/icon-plus.svg?raw';
import iconMinus from '../../images/icon-minus.svg?raw';
import iconHome from '../../images/icon-home-2.svg?raw';
import iconGithub from '../../images/icon-github.svg?raw';
import iconFile from '../../images/icon-file.svg?raw';
import iconPlay from '../../images/icon-play.svg?raw';
import iconLogo from '../../images/icon-logo-compact.svg?raw';
import checkIcon from '../../images/icon-check-2.svg?raw';
import crossIcon from '../../images/icon-cross-2.svg?raw';
import alertIcon from '../../images/icon-alert-2.svg?raw';
import directIcon from '../../images/icon-person-filled.svg?raw';
import indirectIcon from '../../images/icon-person-outline.svg?raw';
import allocativeIcon from '../../images/icon-allocative-solid.svg?raw';
import representationalIcon from '../../images/icon-representational-solid.svg?raw';
import qualityIcon from '../../images/icon-quality-solid.svg?raw';
import societalIcon from '../../images/icon-societal-solid.svg?raw';
import interpersonalIcon from '../../images/icon-interpersonal-solid.svg?raw';

import componentCSS from './footer.scss?inline';

export interface FooterInfo {
  [UseCaseCategories.HIGH_STAKES]: number;
  [UseCaseCategories.INTENDED]: number;
  [UseCaseCategories.MISUSE]: number;
  [StakeholderCategory.DIRECT]: number;
  [StakeholderCategory.INDIRECT]: number;
  [HarmCategory.ALLOCATIVE]: number;
  [HarmCategory.INTERPERSONAL]: number;
  [HarmCategory.QUALITY]: number;
  [HarmCategory.REPRESENTATIONAL]: number;
  [HarmCategory.SOCIETAL]: number;
}

export const getDefaultFooterInfo = (): FooterInfo => {
  return {
    [UseCaseCategories.HIGH_STAKES]: 0,
    [UseCaseCategories.INTENDED]: 0,
    [UseCaseCategories.MISUSE]: 0,
    [StakeholderCategory.DIRECT]: 0,
    [StakeholderCategory.INDIRECT]: 0,
    [HarmCategory.ALLOCATIVE]: 0,
    [HarmCategory.INTERPERSONAL]: 0,
    [HarmCategory.QUALITY]: 0,
    [HarmCategory.REPRESENTATIONAL]: 0,
    [HarmCategory.SOCIETAL]: 0
  };
};

/**
 * Footer element.
 *
 */
@customElement('farsight-footer')
export class FarsightFooter extends LitElement {
  // ===== Class properties ======
  @property({ attribute: false })
  footerInfo: FooterInfo = getDefaultFooterInfo();

  logoHovering = false;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate() {}

  // ===== Custom Methods ======
  initData = async () => {};

  getUseCaseTotalCount() {
    return (
      this.footerInfo[UseCaseCategories.HIGH_STAKES] +
      this.footerInfo[UseCaseCategories.INTENDED] +
      this.footerInfo[UseCaseCategories.MISUSE]
    );
  }

  getStakeholderTotalCount() {
    return (
      this.footerInfo[StakeholderCategory.DIRECT] +
      this.footerInfo[StakeholderCategory.INDIRECT]
    );
  }

  getHarmTotalCount() {
    return (
      this.footerInfo[HarmCategory.ALLOCATIVE] +
      this.footerInfo[HarmCategory.INTERPERSONAL] +
      this.footerInfo[HarmCategory.QUALITY] +
      this.footerInfo[HarmCategory.REPRESENTATIONAL] +
      this.footerInfo[HarmCategory.SOCIETAL]
    );
  }

  getHarmTooltipContent() {
    const content = html`
      <span class="svg-icon">${unsafeHTML(representationalIcon)}</span>${this
        .footerInfo[HarmCategory.REPRESENTATIONAL]}
      <span class="svg-icon">${unsafeHTML(allocativeIcon)}</span>${this
        .footerInfo[HarmCategory.ALLOCATIVE]}
      <span class="svg-icon">${unsafeHTML(qualityIcon)}</span>${this.footerInfo[
        HarmCategory.QUALITY
      ]} <span class="svg-icon">${unsafeHTML(interpersonalIcon)}</span>${this
        .footerInfo[HarmCategory.INTERPERSONAL]}
      <span class="svg-icon">${unsafeHTML(societalIcon)}</span>${this
        .footerInfo[HarmCategory.SOCIETAL]}
    `;
    return content;
  }

  getUseCaseTooltipContent() {
    const content = html`
      <span class="svg-icon">${unsafeHTML(checkIcon)}</span>${this.footerInfo[
        UseCaseCategories.INTENDED
      ]} <span class="svg-icon">${unsafeHTML(alertIcon)}</span>${this
        .footerInfo[UseCaseCategories.HIGH_STAKES]}
      <span class="svg-icon">${unsafeHTML(crossIcon)}</span>${this.footerInfo[
        UseCaseCategories.MISUSE
      ]}
    `;
    return content;
  }

  getStakeholderTooltipContent() {
    const content = html`
      <span class="svg-icon">${unsafeHTML(directIcon)}</span>${this.footerInfo[
        StakeholderCategory.DIRECT
      ]} <span class="svg-icon">${unsafeHTML(indirectIcon)}</span>${this
        .footerInfo[StakeholderCategory.INDIRECT]}
    `;
    return content;
  }

  // ===== Event Methods ======
  notifyParent(eventName: string) {
    const event = new Event(eventName, {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="footer-container">
        <div class="zoom-control">
          <button
            class="zoom-button zoom-button-reset"
            @click=${() => {
              this.notifyParent('zoom-reset');
            }}
          >
            <div class="svg-icon">${unsafeHTML(iconHome)}</div>
          </button>
        </div>

        <div class="zoom-control">
          <button
            class="zoom-button zoom-button-plus"
            @click=${() => {
              this.notifyParent('zoom-in');
            }}
          >
            <div class="svg-icon">${unsafeHTML(iconPlus)}</div>
          </button>
          <button
            class="zoom-button zoom-button-minus"
            @click=${() => {
              this.notifyParent('zoom-out');
            }}
          >
            <div class="svg-icon">${unsafeHTML(iconMinus)}</div>
          </button>
        </div>

        <div class="footer">
          <span
            class="name"
            @mouseenter=${() => {
              const leftCircle =
                this.shadowRoot?.querySelector('.name #left-circle');
              const rightCircle = this.shadowRoot?.querySelector(
                '.name #right-circle'
              );
              if (leftCircle && rightCircle) {
                this.logoHovering = true;
                startLogoBlinkAnimation(
                  () => this.logoHovering,
                  leftCircle,
                  rightCircle
                );
              }
            }}
            @mouseleave=${() => {
              const leftCircle =
                this.shadowRoot?.querySelector('.name #left-circle');
              const rightCircle = this.shadowRoot?.querySelector(
                '.name #right-circle'
              );
              if (leftCircle && rightCircle) {
                this.logoHovering = false;
                stopLogoAnimation(leftCircle, rightCircle);
              }
            }}
            ><span class="svg-icon">${unsafeHTML(iconLogo)}</span>Farsight
          </span>
          <div class="splitter"></div>

          <a href="https://arxiv.org/abs/2402.15350" target="_blank"
            ><span class="item">
              <span class="svg-icon">${unsafeHTML(iconFile)}</span>
              Paper
            </span></a
          >
          <div class="splitter"></div>

          <a href="https://github.com/PAIR-code/farsight" target="_blank"
            ><span class="item">
              <span class="svg-icon">${unsafeHTML(iconGithub)}</span>
              Code
            </span></a
          >
          <div class="splitter"></div>

          <a href="https://youtu.be/BlSFbGkOlHk" target="_blank"
            ><span class="item">
              <span class="svg-icon">${unsafeHTML(iconPlay)}</span>
              Video
            </span></a
          >
          <div class="splitter"></div>

          <span class="item">
            <span class="total-count"
              >${this.getUseCaseTotalCount()} Use Cases
            </span>
          </span>

          <div class="splitter"></div>

          <span class="item">
            <span class="total-count"
              >${this.getStakeholderTotalCount()} Stakeholders
            </span>
          </span>

          <div class="splitter"></div>

          <span class="item">
            <span class="total-count">${this.getHarmTotalCount()} Harms</span>
          </span>
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
    'farsight-footer': FarsightFooter;
  }
}
