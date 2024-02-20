import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  startLogoAnimation,
  startLogoBlinkAnimation,
  stopLogoAnimation
} from '../container-signal/container-signal';
import { FarsightContainerSignal } from '../container-signal/container-signal';
import type {
  PromptRunMessage,
  PromptPadContainer
} from '../promptpad-container/promptpad-container';

import '../container/container';
import '../container-lite/container-lite';
import '../container-signal/container-signal';
import '../promptpad-container/promptpad-container';
import '../article/article';

// Assets
import componentCSS from './article-page.css?inline';
import iconLogo from '../../images/icon-logo.svg?raw';
import iconGithub from '../../images/icon-github.svg?raw';
import iconVideo from '../../images/icon-play.svg?raw';
import iconFile from '../../images/icon-file.svg?raw';

const promptMap: Record<string, string> = {
  'Email Summarizer': `You are an expert in writing emails. Rewrite the given emails to make them shorter and better.

  Email: "Good morning, Alex. I wanted to write you this note because I think we should schedule a follow-up meeting. I am thinking we could meet next week, would that work for you? I think the deck is looking solid but I have some thoughts on it that I would like to share with you."
Rewrite: "Morning. Let's schedule a follow-up. Next week works? Deck's solid, but I have thoughts."

Email: "Alex, soooo hey, I think the current prototype isn't working so well unfortunately. Ok so how about
this as a proposal for a plan: I think we should schedule a meeting to chat early next week. And during that time we can try to debug it live together. What do you think? Nicole"
Rewrite:`,
  'Legal Brief Writer': `You are a great lawyer. Please help me write a legal brief based on the following information.

Case: Sunshine (Company) v. Evergreen (Company)
Date: 2023
Issue: Evergreen violates the contract signed with Sunshine in 2020.`,
  'French Translator': `Translate a sentence from English to French.

English: How are you?
French: Comment vas-tu?

English: Morning!
French:`,
  'Review Classifier': `Given a review, determine if it is a positive review or a negative review.

Input: The food was superb, and the service was top-notch.
Output: Positive

Input: The portions were tiny, and the prices were exorbitant.
Output: Negative

Input: I tried their signature dessert, and it was out of this world
Output:`,
  'Toxicity Detector': `Classify if the input sentence is toxic or non-toxic.

input: I will remove all your organs in alphabetical order.
output: toxic

input: Why is it that every Walmart worker chomps on their gum like a cow.
output: toxic

input: He is not living proof that gay conversion therapy works.
output:`,
  'Therapy Chatbot': `You are an expert in psychotherapy. A patient chats with you to seek help about their mental health. Your task is to give the best advice.

Patient: "I'm feeling really down lately."`,
  'Math Tutor': `You are a great math tutor. Given some mathematical equations or concepts, your will explain them in easy-to-understand terms. You will provide more than the basic definition and help the student to learn the underlying reasons.

User: What's the upper bound and lower bound of sin()?
Tutor: The upper bound of sin(x) is 1, and the lower bound is -1. This is because sin(x) is a periodic function with a period of 2π, meaning that it repeats itself every 2π radians. The maximum value of sin(x) occurs when x = π/2, and the minimum value occurs when x = -π/2.

User: What is an inverse of a matrix?
Tutor:`,
  'New Prompt': ''
};

const ENDPOINT =
  'https://e6uzge3qj1.execute-api.us-east-1.amazonaws.com/prod/run/';
// const ENDPOINT =
//   'https://nloror73zf.execute-api.localhost.localstack.cloud:4566/prod/run/';

/**
 * Demo page element.
 *
 */
@customElement('farsight-article-page')
export class FarsightArticlePage extends LitElement {
  // ===== Class properties ======
  @state()
  respondedPrompt = '';

  @state()
  showLite = true;

  @state()
  modalSizeDetermined = 'false';

  @state()
  selectedPrompt = 'Legal Brief Writer';
  // selectedPrompt = 'French Translator';

  @query('#farsight-dialog')
  farsightDialogElement: HTMLDialogElement | undefined;

  @query('promptpad-container')
  promptpadContainerElement: PromptPadContainer | undefined;

  // ===== Lifecycle Methods ======
  constructor() {
    super();
    localStorage.setItem('farsight-endpoint', ENDPOINT);
    localStorage.setItem('palmAPIKey', ENDPOINT);
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {}

  // ===== Custom Methods ======
  initData = async () => {};

  // ===== Event Methods ======
  /**
   * Handler for a prompt is run
   * @param e Custom event
   */
  promptRunHandler(e: CustomEvent<PromptRunMessage>) {
    this.respondedPrompt = e.detail.prompt;
  }

  /**
   * Handler when the signal is clicked and the API is set
   */
  signalClickedHandler() {
    // Flip displaying lite
    this.showLite = !this.showLite;
  }

  /**
   * Handler for clicking the launching button in lite
   */
  launchFarsightHandler() {
    this.farsightDialogElement?.showModal();
    this.modalSizeDetermined = 'true';
  }

  /**
   * Handler for clicking the close button in lite
   */
  closeLiteHandler() {
    this.showLite = false;
  }

  /**
   * Close the dialog if user clicks outside of the box
   * @param e Mouse event
   */
  dialogClickHandler(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target && this.farsightDialogElement) {
      if (target.nodeName === 'DIALOG') {
        this.farsightDialogElement.close();
      }
    }
  }

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

  // ===== Templates and Styles ======
  render() {
    let exampleButtons = html``;
    for (const name of Object.keys(promptMap)) {
      const clickHandler = () => {
        if (this.promptpadContainerElement) {
          this.selectedPrompt = name;
          const prompt = promptMap[name] as string;
          this.promptpadContainerElement.overridePrompt(prompt);
        }
      };
      exampleButtons = html`${exampleButtons}
        <button
          class="example-button"
          ?is-active=${this.selectedPrompt === name}
          @click=${() => {
            clickHandler();
          }}
        >
          ${name}
        </button>`;
    }

    return html`
      <div class="article-page">
        <div class="top-region">
          <div class="top-content">
            <div class="top-filler"></div>
            <div
              class="header-content"
              @mouseenter=${(e: MouseEvent) =>
                this.logoContainerMouseEntered(e)}
              @mouseleave=${(e: MouseEvent) => this.logoContainerMouseLeft(e)}
            >
              <div class="name">
                <span class="svg-icon">${unsafeHTML(iconLogo)}</span>
                <span class="name-text">Farsight</span>
              </div>

              <span class="tag-line">
                <em>In Situ</em> Widgets for Fostering Responsible AI Awareness
              </span>
            </div>

            <div class="left-content">
              <div class="content-wrapper">
                <span class="title">Example Prompts</span>
                <div class="example-buttons">${exampleButtons}</div>
              </div>

              <div class="content-wrapper link-wrapper">
                <span class="title">External Links</span>
                <div class="example-buttons">
                  <a
                    class="link-container example-button "
                    href="https://github.com/PAIR-code/farsight"
                    target="_blank"
                  >
                    <span class="svg-icon">${unsafeHTML(iconGithub)}</span>
                    <span class="link-name">Code</span>
                  </a>

                  <span
                    class="link-container example-button "
                    href=" https://youtu.be/BlSFbGkOlHk"
                    target="_blank"
                  >
                    <span class="svg-icon">${unsafeHTML(iconVideo)}</span>
                    <span class="link-name">Video</span>
                  </span>

                  <span
                    class="link-container example-button "
                    href="https://github.com/PAIR-code/farsight"
                    target="_blank"
                  >
                    <span class="svg-icon">${unsafeHTML(iconFile)}</span>
                    <span class="link-name">Paper</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="middle-content">
              <div class="promptpad-wrapper">
                <promptpad-container
                  @prompt-run=${(e: CustomEvent<PromptRunMessage>) =>
                    this.promptRunHandler(e)}
                >
                </promptpad-container>

                <farsight-container-signal
                  prompt=${this.respondedPrompt}
                  @clicked=${() => this.signalClickedHandler()}
                ></farsight-container-signal>
              </div>

              <div class="lite-wrapper" ?is-hidden=${!this.showLite}>
                <farsight-container-lite
                  prompt=${this.respondedPrompt}
                  @launch-farsight=${() => this.launchFarsightHandler()}
                  @close-lite=${() => this.closeLiteHandler()}
                ></farsight-container-lite>
              </div>
            </div>

            <div class="bottom-filler"></div>
          </div>
        </div>

        <dialog
          id="farsight-dialog"
          @click=${(e: MouseEvent) => this.dialogClickHandler(e)}
        >
          <div class="farsight-wrapper">
            <farsight-container
              prompt=${this.respondedPrompt}
              sizeDetermined=${this.modalSizeDetermined}
              @close-farsight=${() => {
                this.farsightDialogElement?.close();
              }}
            ></farsight-container>
          </div>
        </dialog>

        <farsight-article></farsight-article>
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
    'farsight-article-page': FarsightArticlePage;
  }
}
