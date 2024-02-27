import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import componentCSS from './editor.css?inline';

export interface promptUpdatedMessage {
  prompt: string;
}

const INIT_TEXT = '';

/**
 * Editor element.
 *
 */
@customElement('promptpad-editor')
export class PromptPadEditor extends LitElement {
  // ===== Class properties ======
  @query('.text-box')
  textBoxElement: HTMLElement | undefined;

  @property({ type: String })
  highlightText = '';

  prompt = '';

  // ===== Lifecycle Methods ======
  constructor() {
    super();
  }

  firstUpdated() {
    if (this.textBoxElement) {
      this.textBoxElement.focus();
    }
    this.notifyParentPromptUpdate(INIT_TEXT);
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('highlightText')) {
      const oldHighlightText =
        this.textBoxElement?.querySelector<HTMLSpanElement>(
          'span.highlight-text'
        );

      // Need to re-append the highlight span, as users can command-A and delete
      // everything in the contenteditable div
      if (oldHighlightText === null || oldHighlightText === undefined) {
        const highlightTextElement = document.createElement('span');
        highlightTextElement.innerText = this.highlightText;
        highlightTextElement.classList.add('highlight-text');
        highlightTextElement.setAttribute('spellcheck', 'off');
        this.textBoxElement?.append(highlightTextElement);
      } else {
        oldHighlightText.innerText = this.highlightText;
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  /**
   * Get the current prompt in the editor
   * @returns Current content in the editor
   */
  getCurPrompt() {
    let curPrompt = '';
    if (this.textBoxElement?.textContent) {
      curPrompt = this.textBoxElement?.textContent;
    }
    return curPrompt;
  }

  /**
   * Notify the parent about prompt change
   * @param prompt Prompt string
   */
  notifyParentPromptUpdate(prompt: string) {
    const event = new CustomEvent('prompt-changed', {
      detail: {
        prompt
      }
    });
    this.dispatchEvent(event);
  }

  overridePrompt(prompt: string) {
    if (this.textBoxElement) {
      this.textBoxElement.querySelectorAll('*').forEach(d => {
        d.remove();
      });
      this.textBoxElement!.innerText = prompt;
      this.prompt = prompt;
      this.notifyParentPromptUpdate(this.prompt);
    }
  }

  // ===== Event Methods ======

  /**
   * Update the prompt when the user changes the text box
   * @param e Input event
   */
  textBoxChanged(e: InputEvent) {
    const target = e.target as HTMLElement | null;
    if (target) {
      // Parse new prompt
      let newPrompt = '';

      // When a user presses enter, the browser puts a <p><br></p>
      // const pNodes = target.querySelectorAll('p');
      // for (const n of pNodes) {
      //   if (n.innerHTML === '<br>') {
      //     newPrompt += '\n';
      //   }
      //   if (n.textContent) {
      //     const curContent = n.textContent.replaceAll('<br>', '\n');
      //     newPrompt += curContent;
      //   }
      // }

      if (this.textBoxElement?.textContent) {
        newPrompt = this.textBoxElement?.textContent;
      }

      if (newPrompt) {
        this.prompt = newPrompt;
        this.notifyParentPromptUpdate(this.prompt);
      }
    }
  }

  textBoxKeyPressed(e: KeyboardEvent) {}

  // ===== Templates and Styles ======
  render() {
    return html`
      <div class="editor">
        <!-- prettier-ignore -->
        <div contenteditable class="text-box" tabindex="-1"
        @keypress=${(e: KeyboardEvent) => this.textBoxKeyPressed(e)}
        @input=${(e: InputEvent) => this.textBoxChanged(e)}
        ><p>${INIT_TEXT}</p></div>
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
    'promptpad-editor': PromptPadEditor;
  }
}