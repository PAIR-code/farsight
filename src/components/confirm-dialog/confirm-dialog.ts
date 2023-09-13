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

import componentCSS from './confirm-dialog.scss?inline';

export interface DialogInfo {
  header: string;
  message: string;
  yesButtonText: string;
  /**
   * Used to identify actions to skip
   */
  actionKey: string;
  confirmAction: () => void;
  show: boolean;
}

/**
 * Confirm dialog element.
 *
 */
@customElement('farsight-confirm-dialog')
export class FarsightConfirmDialog extends LitElement {
  // ===== Class properties ======
  @query('dialog')
  dialogElement: HTMLDialogElement | undefined;

  @property({ attribute: false })
  dialogInfo: DialogInfo = {
    header: 'Delete Item',
    message:
      'Are you sure you want to delete this item? This action cannot be undone.',
    yesButtonText: 'Delete',
    actionKey: 'deletion',
    show: false,
    confirmAction: () => {}
  };

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  firstUpdated() {
    window.setTimeout(() => {}, 1000);
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('dialogInfo')) {
      if (this.dialogInfo.show) {
        // First check if the user has skipped this action
        const skipDialog = localStorage.getItem(
          `<skip-confirm>${this.dialogInfo.actionKey}`
        );
        if (skipDialog === 'true') {
          this.dialogInfo.confirmAction();
        } else {
          if (this.dialogElement) {
            this.dialogElement.showModal();
          }
        }
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  dialogClicked(e: MouseEvent) {
    if (e.target === this.dialogElement) {
      this.dialogElement.close();
      this.dialogInfo.show = false;
    }
  }

  cancelClicked(e: MouseEvent) {
    e.stopPropagation();
    if (this.dialogElement) {
      this.dialogElement.close();
      this.dialogInfo.show = false;
    }
  }

  confirmClicked(e: MouseEvent) {
    e.stopPropagation();

    if (this.dialogElement) {
      // Update the local storage if user chooses to skip the action
      const checkbox = this.dialogElement.querySelector<HTMLInputElement>(
        '#checkbox-skip-confirmation'
      );
      if (checkbox && checkbox.checked) {
        const key = `<skip-confirm>${this.dialogInfo.actionKey}`;
        localStorage.setItem(key, 'true');
      }

      this.dialogInfo.show = false;
      this.dialogInfo.confirmAction();
      this.dialogElement.close();
    }
  }

  // ===== Templates and Styles ======
  render() {
    return html`
      <dialog
        class="confirm-dialog"
        @click=${(e: MouseEvent) => this.dialogClicked(e)}
      >
        <div class="header">
          <div class="header-name">${this.dialogInfo.header}</div>
        </div>

        <div class="content">
          <div class="message">${this.dialogInfo.message}</div>
          <div class="skip-bar">
            <input
              type="checkbox"
              id="checkbox-skip-confirmation"
              name="checkbox-skip-confirmation"
            />
            <label for="checkbox-skip-confirmation"
              >Don't ask me again about this action</label
            >
          </div>
        </div>

        <div class="button-block">
          <button
            class="cancel-button"
            @click=${(e: MouseEvent) => this.cancelClicked(e)}
          >
            Cancel
          </button>
          <button
            class="confirm-button"
            @click=${(e: MouseEvent) => this.confirmClicked(e)}
          >
            ${this.dialogInfo.yesButtonText}
          </button>
        </div>
      </dialog>
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
    'farsight-confirm-dialog': FarsightConfirmDialog;
  }
}
