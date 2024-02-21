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
import type { NightjarYoutube } from '../youtube/youtube';

import '../youtube/youtube';

// Assets
import componentCSS from './article.css?inline';
import iconLogo from '../../images/icon-logo.svg?raw';
import textData from './article.yaml';
import iconCheckBox from '../../images/icon-check-box.svg?raw';
import iconCopy from '../../images/icon-copy-box.svg?raw';
import iconGT from '../../images/logo-gt.svg?raw';
import iconGoogle from '../../images/logo-google.svg?raw';
import iconEmory from '../../images/logo-emory.svg?raw';
import iconEbay from '../../images/logo-ebay.svg?raw';

interface FigureData {
  url: string;
  caption: string;
}

interface Author {
  name: string;
  url: string;
}

interface PaperData {
  bibtext: string;
  title: string;
  paperLink: string;
  venue: string;
  venueLink: string;
  authors: Author[];
}

interface TextData {
  intro: string[];
  usageIntro: string[];
  usageAlert: string[];
  usageIncident: string[];
  usageUseCase: string[];
  usageHarmEnvisioner: string[];
  whereTo: string[];
  development: string[];
  contribution: string[];
  learnMore: string[];
  who: string[];
  paper: PaperData;

  figures: {
    alert: FigureData;
  };

  videos: {
    alert: FigureData;
    incident: FigureData;
    useCase: FigureData;
    harmEnvisioner: FigureData;
    chromeExtension: FigureData;
    notebook: FigureData;
  };

  youtubeTimes: YoutubeChapter[];
}

interface YoutubeChapter {
  startTime: number;
  name: string;
  timestamp: string;
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
  @state()
  bibtexCopied = false;

  @state()
  bibtexHovering = false;

  @query('nightjar-youtube')
  youtubeComponent: NightjarYoutube | null | undefined;

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
    let usage = html`<h2 id="feature">
      What Can I Do with <span class="tool-name">Farsight</span>?
    </h2>`;

    for (const p of text.usageIntro) {
      usage = html`${usage}
        <p>${unsafeHTML(p)}</p>`;
    }

    // Usage: alert
    const usageAlert = html`<h4 id="alert-symbol">Alert Symbol</h4>
      <p>${unsafeHTML(text.usageAlert[0])}</p>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.alert.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 1. ${unsafeHTML(text.videos.alert.caption)}
        </div>
      </div>

      <p>${unsafeHTML(text.usageAlert[1])}</p>

      <div class="figure">
        <img src=${text.figures.alert.url} />
        <div class="figure-caption">
          Figure 1. ${unsafeHTML(text.figures.alert.caption)}
        </div>
      </div>
      <p>${unsafeHTML(text.usageAlert[2])}</p> `;

    // Usage: incident panel
    const usageIncident = html`<h4 id="incident-panel">
        Awareness Sidebar: Incident Panel
      </h4>
      <p>${unsafeHTML(text.usageIncident[0])}</p>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.incident.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 2. ${unsafeHTML(text.videos.incident.caption)}
        </div>
      </div>

      <p>${unsafeHTML(text.usageIncident[1])}</p>`;

    // Usage: use case panel
    const usageUseCase = html`<h4 id="use-case-panel">
        Awareness Sidebar: Use Case Panel
      </h4>
      <p>${unsafeHTML(text.usageUseCase[0])}</p>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.useCase.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 3. ${unsafeHTML(text.videos.useCase.caption)}
        </div>
      </div>

      <p>${unsafeHTML(text.usageUseCase[1])}</p>`;

    // Usage: harm envisioner
    const usageHarmEnvisioner = html`<h4 id="harm-envisioner">
        Harm Envisioner
      </h4>
      <p>${unsafeHTML(text.usageHarmEnvisioner[0])}</p>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.harmEnvisioner.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 4. ${unsafeHTML(text.videos.harmEnvisioner.caption)}
        </div>
      </div>

      <p>${unsafeHTML(text.usageHarmEnvisioner[1])}</p>`;

    // Where to
    const whereTo = html`
      <h2 id="where">
        Where Can I Use <span class="tool-name">Farsight</span>?
      </h2>
      <p>${unsafeHTML(text.whereTo[0])}</p>

      <h4 id="where-ai-prototyper">I'm an AI Prototyper</h4>
      <p>${unsafeHTML(text.whereTo[1])}</p>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.chromeExtension.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 5. ${unsafeHTML(text.videos.chromeExtension.caption)}
        </div>
      </div>

      <div class="video">
        <video autoplay loop muted playsinline>
          <source src=${text.videos.notebook.url} />
          <track kind="captions" />
        </video>

        <div class="figure-caption">
          Video 6. ${unsafeHTML(text.videos.notebook.caption)}
        </div>
      </div>

      <h4 id="where-developer">I'm a Developer of Prompting Tools</h4>
      <p>${unsafeHTML(text.whereTo[2])}</p>
    `;

    // Demo video
    let videoTimeList = html``;
    for (const time of text.youtubeTimes) {
      videoTimeList = html`${videoTimeList}
        <li
          class="video-link"
          @click=${() => this.youtubeComponent?.play(time.startTime)}
        >
          ${time.name}
          <small>${time.timestamp}</small>
        </li> `;
    }

    const demoVideo = html`
      <h2 id="youtube-video">Demo Video</h2>

      <ul class="video-list">
        ${videoTimeList}
      </ul>

      <div class="youtube-video">
        <nightjar-youtube
          videoId="BlSFbGkOlHk"
          playerId="demo-video"
        ></nightjar-youtube>
      </div>
    `;

    // Development
    const development = html`
      <h2 id="development">
        How is <span class="tool-name">Farsight</span>&nbsp;Developed?
      </h2>
      <p>${unsafeHTML(text.development[0])}</p>
    `;

    // Who
    const who = html`
      <h2 id="creator">
        Who Developed <span class="tool-name">Farsight</span>?
      </h2>
      <p>${unsafeHTML(text.who[0])}</p>
      <p>${unsafeHTML(text.who[1])}</p>
    `;

    // Contribution
    const contribution = html`
      <h2 id="contribute">How Can I Contribute?</h2>
      <p>${unsafeHTML(text.contribution[0])}</p>
      <p>${unsafeHTML(text.contribution[1])}</p>
    `;

    // Learn more
    const learnMore = html`
      <h2 id="learn-more">How to Learn More?</h2>
      <p>${unsafeHTML(text.learnMore[0])}</p>
    `;

    // Paper info
    let copyButton = html`
      <span class="svg-icon check">${unsafeHTML(iconCheckBox)}</span>
      <span class="copy-label check">Copied!</span>
    `;

    if (!this.bibtexCopied) {
      copyButton = html`
        <span class="svg-icon copy">${unsafeHTML(iconCopy)}</span>
        <span class="copy-label copy">Copy</span>
      `;
    }

    let authorList = html``;
    for (const [i, author] of text.paper.authors.entries()) {
      authorList = html`${authorList}
        <a href=${author.url} target="_blank">
          ${author.name}${i === text.paper.authors.length - 1 ? '' : ','}
        </a> `;
    }

    const paperInfo = html`
      <div class="paper-info">
        <div class="left">
          <a target="_blank" href=${text.paper.paperLink}
            ><img
              src="https://github.com/xiaohk/xiaohk/assets/15007159/d02c9339-90b5-4555-bfcb-0c220d5799fa"
          /></a>
        </div>
        <div class="right">
          <a target="_blank" href=${text.paper.paperLink}
            ><span class="paper-title">${text.paper.title}</span></a
          >
          <a target="_blank" href=${text.paper.venueLink}
            ><span class="paper-venue">${text.paper.venue}</span></a
          >
          <div class="paper-authors">${authorList}</div>
        </div>
      </div>
      <div
        class="bibtex-block"
        @mouseenter=${() => {
          this.bibtexHovering = true;
        }}
        @mouseleave=${() => {
          this.bibtexHovering = false;
        }}
      >
        <div class="bibtex">${unsafeHTML(text.paper.bibtext)}</div>

        <div
          class="copy-button"
          ?is-hidden=${!this.bibtexHovering}
          @click=${() => {
            navigator.clipboard.writeText(text.paper.bibtext).then(() => {
              this.bibtexCopied = true;
            });
          }}
          @mouseleave=${() => {
            setTimeout(() => {
              this.bibtexCopied = false;
            }, 500);
          }}
        >
          ${copyButton}
        </div>
      </div>
    `;

    // Footer
    const footer = html`
      <div class="article-footer">
        <div class="footer-main">
          <div class="footer-logo">
            <a target="_blank" href="https://research.google/">
              <div class="svg-logo" title="Georgia Tech">
                ${unsafeHTML(iconGoogle)}
              </div>
            </a>

            <a target="_blank" href="https://www.gatech.edu/">
              <div class="svg-logo" title="Georgia Tech">
                ${unsafeHTML(iconGT)}
              </div>
            </a>

            <a target="_blank" href="https://www.emory.edu/">
              <div class="svg-logo" title="Emory University">
                ${unsafeHTML(iconEmory)}
              </div>
            </a>

            <a target="_blank" href="https://www.ebayinc.com/company/">
              <div class="svg-logo" title="eBay">${unsafeHTML(iconEbay)}</div>
            </a>
          </div>

          <div class="footer-cp">
            Copyright © ${new Date().getFullYear()} Google LLC
          </div>
        </div>
      </div>
    `;

    return html`
      <div class="article">
        ${introduction} ${usage} ${usageAlert} ${usageIncident} ${usageUseCase}
        ${usageHarmEnvisioner} ${whereTo} ${demoVideo} ${development} ${who}
        ${contribution} ${learnMore} ${paperInfo}
      </div>
      ${footer}
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
