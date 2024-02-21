/// <reference types="youtube" />
import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import {
  customElement,
  property,
  state,
  query,
  queryAsync
} from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import componentCSS from './youtube.css?inline';

/**
 * Youtube element.
 *
 */
@customElement('nightjar-youtube')
export class NightjarYoutube extends LitElement {
  //==========================================================================||
  //                              Class Properties                            ||
  //==========================================================================||
  @property({ type: String })
  videoId: string;

  iframeApiReady = false;

  @state()
  player!: YT.Player;

  //==========================================================================||
  //                             Lifecycle Methods                            ||
  //==========================================================================||
  constructor() {
    super();

    window.addEventListener('iframeApiReady', () => {
      if (!this.shadowRoot) throw Error('No shadow root');
      const playerElement = this.shadowRoot.querySelector('#demo-video');
      this.player = new YT.Player(playerElement, {
        videoId: this.videoId,
        width: '780',
        height: '439',
        events: {
          onReady: () => this.onPlayerReady()
        }
      });
    });
  }

  firstUpdated() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      window.dispatchEvent(new Event('iframeApiReady'));
    };
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

  onPlayerReady() {
    this.player.unMute();
  }

  play(startSecond = 0) {
    this.player.seekTo(startSecond, true);
    this.player.playVideo();
  }

  //==========================================================================||
  //                              Event Handlers                              ||
  //==========================================================================||

  //==========================================================================||
  //                             Private Helpers                              ||
  //==========================================================================||

  //==========================================================================||
  //                           Templates and Styles                           ||
  //==========================================================================||
  render() {
    return html` <div class="youtube" id="demo-video"></div> `;
  }

  static styles = [
    css`
      ${unsafeCSS(componentCSS)}
    `
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'nightjar-youtube': NightjarYoutube;
  }
}
