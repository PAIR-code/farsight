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

import { LitElement, css, unsafeCSS, html, TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';

import type { MenuItem, PanelName } from '../../types/common-types';

import menuCSS from './menu.scss?inline';
import userIcon from '../../images/icon-user.svg?raw';
import accidentIcon from '../../images/icon-chat.svg?raw';
import ecoIcon from '../../images/icon-eco.svg?raw';
import safetyIcon from '../../images/icon-safety-2.svg?raw';
import userIconOutline from '../../images/icon-user-outline.svg?raw';
import accidentIconOutline from '../../images/icon-chat-outline.svg?raw';
import ecoIconOutline from '../../images/icon-eco-outline.svg?raw';
import safetyIconOutline from '../../images/icon-safety-outline.svg?raw';

/**
 * A menu bar element.
 */
@customElement('farsight-menu')
export class FarsightMenu extends LitElement {
  // ===== Properties ======
  // This function is given from the parent
  @property()
  notifyMenuChanged = (_item: PanelName): void => {};

  @property({ type: String })
  activeMenuButton = '';

  menuItems: MenuItem[];

  // ===== Constructor ======
  constructor() {
    super();

    this.menuItems = [
      { name: 'use-case', svgIcon: userIconOutline, selectedSVGIcon: userIcon },
      { name: 'harm', svgIcon: safetyIconOutline, selectedSVGIcon: safetyIcon },
      {
        name: 'accident',
        svgIcon: accidentIconOutline,
        selectedSVGIcon: accidentIcon
      },
      {
        name: 'environment',
        svgIcon: ecoIconOutline,
        selectedSVGIcon: ecoIcon
      }
    ];

    this.initData();
  }

  // ===== Custom Methods ======
  initData = async () => {
    // const event = new Event()
  };

  // ===== Event Methods ======

  // ===== Templates and Styles ======
  render() {
    // Create button templates
    const buttonTemplates: TemplateResult[] = [];
    for (const item of this.menuItems) {
      const curTemplate = html`
        <button
          class="menu-button"
          ?selected="${this.activeMenuButton == item.name}"
          @click="${() => {
            this.activeMenuButton = item.name;
            this.notifyMenuChanged(item.name);
          }}"
        >
          <div class="svg-icon">
            ${this.activeMenuButton == item.name
              ? unsafeHTML(item.selectedSVGIcon)
              : unsafeHTML(item.svgIcon)}
          </div>
        </button>
      `;
      buttonTemplates.push(curTemplate);
    }

    return html` <div class="menu">${buttonTemplates}</div> `;
  }

  static styles = [
    css`
      ${unsafeCSS(menuCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'farsight-menu': FarsightMenu;
  }
}
