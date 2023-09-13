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

import d3 from '../../utils/d3-import';
import { LitElement, css, unsafeCSS, html, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { updatePopperTooltip } from '@xiaohk/utils';
import '../harm-node-accident/harm-node-accident';

import { HarmCategory } from '../harm-panel/harm-types';
import type {
  HarmTaxonomy,
  HarmConfig,
  HarmJSONData,
  FailureModeItem,
  FailureMode
} from '../harm-panel/harm-types';
import { config } from '../../utils/config';
import type { TooltipConfig } from '@xiaohk/utils';
import type {
  AccidentReportData,
  AccidentReport
} from '../../types/common-types';

import componentCSS from './harm-summary.scss?inline';
import harmTaxonomyData from './harm-taxonomy.json';
import representationalIcon from '../../images/icon-representational.svg?raw';
import allocativeIcon from '../../images/icon-allocative.svg?raw';
import qualityIcon from '../../images/icon-quality.svg?raw';
import interpersonalIcon from '../../images/icon-interpersonal.svg?raw';
import societalIcon from '../../images/icon-societal.svg?raw';
import caretDownIcon from '../../images/icon-caret-down.svg?raw';
import newsIcon from '../../images/icon-news-filled.svg?raw';
import userIcon from '../../images/icon-person-filled.svg?raw';
import noteIcon from '../../images/icon-note-filled.svg?raw';
import bugIcon from '../../images/icon-bug-filled.svg?raw';
import fireIcon from '../../images/icon-fire.svg?raw';
import magicIcon from '../../images/icon-magic.svg?raw';
import expandIcon from '../../images/icon-expand.svg?raw';
import shrinkIcon from '../../images/icon-shrink.svg?raw';
import deleteIcon from '../../images/icon-delete.svg?raw';
import restartIcon from '../../images/icon-restart.svg?raw';

const harmData = harmTaxonomyData as HarmJSONData;
const harmTaxonomy = harmData.harmTaxonomy;
const failureModes = harmData.failureModes;

const LAYOUT_CONFIG = config.layout.treeLayout;

const themeNames = [
  HarmCategory.REPRESENTATIONAL,
  HarmCategory.ALLOCATIVE,
  HarmCategory.QUALITY,
  HarmCategory.INTERPERSONAL,
  HarmCategory.SOCIETAL
];

const failureModeKeys: FailureMode[] = [
  'unsafe',
  'toxic',
  'inaccurate',
  'opinionated',
  'privacy',
  'illegal'
];

const harmIconMap = {
  [HarmCategory.REPRESENTATIONAL]: unsafeHTML(representationalIcon),
  [HarmCategory.ALLOCATIVE]: unsafeHTML(allocativeIcon),
  [HarmCategory.QUALITY]: unsafeHTML(qualityIcon),
  [HarmCategory.INTERPERSONAL]: unsafeHTML(interpersonalIcon),
  [HarmCategory.SOCIETAL]: unsafeHTML(societalIcon)
};

/**
 * Harm node element.
 *
 */
@customElement('farsight-harm-summary')
export class FarsightHarmSummary extends LitElement {
  // ===== Class properties ======
  @property({ attribute: false })
  stakeholders: string[] = [];

  @state()
  expandedHarms = new Set<string>();

  @state()
  harmConfig = new Map<string, HarmConfig>();

  @property({ attribute: false })
  popperElementTop: HTMLElement | null = null;

  @property({ attribute: false })
  popperElementBottom: HTMLElement | null = null;

  @property({ attribute: false })
  curTransform: d3.ZoomTransform = d3.zoomIdentity;

  @property({ attribute: false })
  preLayerHeight = 5000;

  // @property({ attribute: false })
  // liteHeight: number | null = null;

  @state()
  tooltipTop: TooltipConfig | null = null;

  @state()
  tooltipBottom: TooltipConfig | null = null;

  @state()
  isLite = true;

  @query('.harm-summary')
  harmNodeElement!: HTMLElement;

  @query('.lite-container')
  liteContainerElement!: HTMLElement;

  @query('.expanded-container')
  expandedContainerElement!: HTMLElement;

  accidentReportMap: Map<number, AccidentReport> = new Map<
    number,
    AccidentReport
  >();

  @state()
  dataInitialized = false;

  borderWidthOffset = 0;
  expandedYOffset = 0;

  // ===== Lifecycle Methods ======
  constructor() {
    super();

    if (this.popperElementTop) {
      this.tooltipTop = {
        tooltipElement: this.popperElementTop,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }

    if (this.popperElementBottom) {
      this.tooltipBottom = {
        tooltipElement: this.popperElementBottom,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }

    this.initData();

    this.stakeholders = [
      'Lawyer',
      'Witness',
      'Judge',
      'Opposing counsel',
      'Family and friends of the witness',
      'Lawyers who do not use this AI product'
    ];
  }

  firstUpdated() {
    // Change the size of lite and expanded containers
  }

  /**
   * This method is called before new DOM is updated and rendered
   * @param changedProperties Property that has been changed
   */
  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('popperElementTop')) {
      this.tooltipTop = {
        tooltipElement: this.popperElementTop!,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }

    if (changedProperties.has('popperElementBottom')) {
      this.tooltipBottom = {
        tooltipElement: this.popperElementBottom!,
        mouseenterTimer: null,
        mouseleaveTimer: null
      };
    }
  }

  // ===== Custom Methods ======
  initData = async () => {
    // Initialize the mappings
    for (const themeName of themeNames) {
      const theme = harmTaxonomy[themeName];

      for (const harm of theme.harms) {
        const curConfig: HarmConfig = {
          severity: 0,
          failureModes: harm.failureModes
        };

        this.harmConfig.set(harm.name, curConfig);
      }
    }

    const accidentReports = await d3.json<AccidentReportData>(
      config.urls.accidentReports
    );

    if (accidentReports === undefined) {
      throw Error(
        `Failed to load accident reports from ${config.urls.accidentReports}`
      );
    }

    // Convert the object to a map
    for (const k of Object.keys(accidentReports)) {
      this.accidentReportMap.set(parseInt(k), accidentReports[k]);
    }

    this.dataInitialized = true;
  };

  setHarmSeverity = (harmName: string, severity: number) => {
    const curHarmConfig = this.harmConfig.get(harmName);
    if (curHarmConfig === undefined) {
      throw Error(`Fail to find harm ${harmName} in harmConfig.`);
    }

    curHarmConfig.severity = severity;
    this.requestUpdate();
  };

  transitionMode = async () => {
    this.borderWidthOffset =
      this.harmNodeElement.offsetWidth - this.harmNodeElement.clientWidth;

    const animateProperty: KeyframeAnimationOptions = {
      duration: 700,
      easing: 'ease-in-out',
      fill: 'both'
    };

    // Transition from lite to expanded using width and height. We don't use FLIP
    // because we need to keep the border width coherent during animation
    if (this.isLite) {
      const firstBBox = this.liteContainerElement.getBoundingClientRect();
      const firstWidth = firstBBox.width / this.curTransform.k;
      const firstHeight = firstBBox.height / this.curTransform.k;

      const lastWidth = LAYOUT_CONFIG.expandedSummaryWidth;
      const lastHeight = Math.min(800, this.preLayerHeight);

      // Translate the box so the (0, 50%) point doesn't change
      const yOffset = -((lastHeight - firstHeight) / 2);

      // Animate
      const animation = this.harmNodeElement.animate(
        [
          {
            transformOrigin: 'top left',
            transform: 'none',
            width: `${firstWidth + this.borderWidthOffset}px`,
            height: `${firstHeight + this.borderWidthOffset}px`
          },
          {
            transformOrigin: 'top left',
            transform: `translate(0px, ${yOffset}px)`,
            width: `${lastWidth + this.borderWidthOffset}px`,
            height: `${lastHeight + this.borderWidthOffset}px`
          }
        ],
        animateProperty
      );

      this.liteContainerElement.animate(
        [
          {
            opacity: 1
          },
          {
            opacity: 0
          }
        ],
        animateProperty
      );

      animation.onfinish = () => {
        this.isLite = false;
        this.harmNodeElement.style.setProperty(
          'transform',
          `translate(0px, ${yOffset}px)`
        );
        this.harmNodeElement.style.removeProperty('width');
        this.harmNodeElement.style.removeProperty('height');
      };
    } else {
      const firstBBox = this.expandedContainerElement.getBoundingClientRect();
      const firstWidth = firstBBox.width / this.curTransform.k;
      const firstHeight = firstBBox.height / this.curTransform.k;
      const oldTransform = this.harmNodeElement.style.transform;
      this.harmNodeElement.style.removeProperty('transform');

      this.isLite = true;
      await this.updateComplete;

      const lastBBox = this.liteContainerElement.getBoundingClientRect();
      const lastWidth = LAYOUT_CONFIG.rectWidth;
      const lastHeight = lastBBox.height / this.curTransform.k;
      this.harmNodeElement.style.transform = oldTransform;

      // Prepare for animation
      this.harmNodeElement.style.removeProperty('transform');
      this.isLite = false;
      await this.updateComplete;

      // Animate
      const animation = this.harmNodeElement.animate(
        [
          {
            transformOrigin: 'top left',
            transform: oldTransform,
            width: `${firstWidth + this.borderWidthOffset}px`,
            height: `${firstHeight + this.borderWidthOffset}px`
          },
          {
            transformOrigin: 'top left',
            transform: 'none',
            width: `${lastWidth + this.borderWidthOffset}px`,
            height: `${lastHeight + this.borderWidthOffset}px`
          }
        ],
        animateProperty
      );

      this.expandedContainerElement.animate(
        [
          {
            transformOrigin: 'top left',
            opacity: 1
          },
          {
            transformOrigin: 'top left',
            opacity: 0
          }
        ],
        animateProperty
      );

      animation.onfinish = () => {
        this.isLite = true;
        this.harmNodeElement.style.removeProperty('transform');
        this.harmNodeElement.style.removeProperty('width');
        this.harmNodeElement.style.removeProperty('height');
      };
    }

    // Need to know the ending size
  };

  // ===== Event Methods ======
  harmDetailClicked(e: MouseEvent, harmName: string) {
    e.stopPropagation();
    e.preventDefault();

    if (this.expandedHarms.has(harmName)) {
      this.expandedHarms.delete(harmName);
    } else {
      this.expandedHarms.add(harmName);
    }
    this.expandedHarms = cloneSet(this.expandedHarms);
  }

  harmSeverityClicked = (harmName: string, severity: number) => {
    const curHarmConfig = this.harmConfig.get(harmName);
    if (curHarmConfig === undefined) {
      throw Error(`Fail to find harm ${harmName} in harmConfig.`);
    }

    // Special case: e.g., if the severity is 1, and the user clicks the first
    // fire again => set the severity to 0
    if (curHarmConfig.severity === severity) {
      this.setHarmSeverity(harmName, severity - 1);
    } else {
      this.setHarmSeverity(harmName, severity);
    }
  };

  buttonMouseEnter(
    e: Event,
    name: string,
    position: 'bottom' | 'left' | 'top' | 'right'
  ) {
    const target = e.target as HTMLElement;
    if (this.tooltipTop) {
      if (this.tooltipTop.tooltipElement.classList.contains('hidden')) {
        if (this.tooltipTop.mouseenterTimer !== null) {
          clearTimeout(this.tooltipTop.mouseenterTimer);
          this.tooltipTop.mouseenterTimer = null;
        }

        this.tooltipTop.mouseenterTimer = window.setTimeout(() => {
          updatePopperTooltip(
            this.tooltipTop!.tooltipElement,
            target,
            name,
            position,
            true
          );

          this.tooltipTop!.tooltipElement.classList.remove('hidden');
          this.tooltipTop!.mouseenterTimer = null;
        }, 500);
      } else {
        if (this.tooltipTop.mouseleaveTimer !== null) {
          clearTimeout(this.tooltipTop.mouseleaveTimer);
          this.tooltipTop.mouseleaveTimer = null;
        }

        updatePopperTooltip(
          this.tooltipTop!.tooltipElement,
          target,
          name,
          position,
          true
        );
      }
    }
  }

  tooltipTopMouseLeave(delay = 500) {
    if (this.tooltipTop) {
      if (this.tooltipTop.mouseenterTimer !== null) {
        clearTimeout(this.tooltipTop.mouseenterTimer);
        this.tooltipTop.mouseenterTimer = null;
      }

      if (this.tooltipTop.mouseleaveTimer !== null) {
        clearTimeout(this.tooltipTop.mouseleaveTimer);
        this.tooltipTop.mouseleaveTimer = null;
      }

      this.tooltipTop.mouseleaveTimer = window.setTimeout(() => {
        this.tooltipTop!.tooltipElement.classList.add('hidden');
        this.tooltipTop!.mouseleaveTimer = null;
      }, delay);
    }
  }

  resizeButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    this.tooltipTopMouseLeave(0);
    this.transitionMode();
  }

  dblClickBlocker(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  // ===== Templates and Styles ======

  /**
   * Generate template for the expanded node
   * @returns HTML template for the expanded list
   */
  _createExpandedTemplate() {
    // Add themes in the expanded version
    let themes = html``;

    for (const [themeIndex, themeName] of themeNames.entries()) {
      const theme = harmTaxonomy[themeName];

      let harmList = html``;

      for (const [harmIndex, harm] of theme.harms.entries()) {
        const accidentReports: AccidentReport[] = [];

        // Find the associated AI accidents
        if (this.dataInitialized) {
          for (const reportNumber of harm.reportNumbers) {
            const curReport = this.accidentReportMap.get(reportNumber);
            if (curReport === undefined) {
              throw Error(`Cannot find report ${reportNumber}`);
            }
            accidentReports.push(curReport);
          }
        }

        // Generate the failure mode panel
        let failureModeElement = html``;
        for (const [failureIndex, failure] of failureModeKeys.entries()) {
          const checkboxName = `failure-checkbox-${themeIndex}-${harmIndex}-${failureIndex}`;
          failureModeElement = html`${failureModeElement}
            <div class="tag tag-failure">
              <input
                type="checkbox"
                ?checked=${this.harmConfig
                  .get(harm.name)!
                  .failureModes.includes(failure)}
                id=${checkboxName}
                name=${checkboxName}
              />
              <label for=${checkboxName}>${failureModes[failure].name}</label>
            </div>`;
        }

        // Generate the stakeholder panel
        let stakeholderElement = html``;
        for (const [
          stakeholderIndex,
          stakeholder
        ] of this.stakeholders.entries()) {
          const checkboxName = `stakeholder-checkbox-${themeIndex}-${harmIndex}-${stakeholderIndex}`;
          stakeholderElement = html`${stakeholderElement}
            <div class="tag tag-stakeholder">
              <input
                type="checkbox"
                ?checked=${false}
                id=${checkboxName}
                name=${checkboxName}
              />
              <label for=${checkboxName}>${stakeholder}</label>
            </div>`;
        }

        harmList = html`
          ${harmList}
          <div class="harm-list">
            <div
              class="harm-header"
              @click=${(e: MouseEvent) => this.harmDetailClicked(e, harm.name)}
              ?expanded=${this.expandedHarms.has(harm.name)}
            >
              <div
                class="svg-icon"
                title="Show details"
                ?testing=${true}
                ?expanded=${this.expandedHarms.has(harm.name)}
              >
                ${unsafeHTML(caretDownIcon)}
              </div>

              <div class="harm-name">${harm.name}</div>
            </div>

            <div
              class="harm-content"
              ?expanded=${this.expandedHarms.has(harm.name)}
            >
              <div
                class="harm-section harm-report"
                ?expanded=${this.expandedHarms.has(harm.name)}
              >
                <farsight-harm-node-accident
                  .accidentReports=${accidentReports}
                ></farsight-harm-node-accident>
              </div>

              <div
                class="harm-section harm-report"
                ?expanded=${this.expandedHarms.has(harm.name)}
              >
                <div class="section-header">
                  <div class="header-container">
                    <div class="svg-icon">${unsafeHTML(bugIcon)}</div>
                    <div class="name">Associated Failure Modes</div>
                  </div>
                </div>

                <div class="section-content tag-content failure-content">
                  ${failureModeElement}
                </div>
              </div>

              <div
                class="harm-section harm-report"
                ?expanded=${this.expandedHarms.has(harm.name)}
              >
                <div class="section-header">
                  <div class="header-container">
                    <div class="svg-icon">${unsafeHTML(userIcon)}</div>
                    <div class="name">Impacted Stakeholders</div>
                  </div>
                </div>

                <div class="section-content tag-content stakeholder-content">
                  ${stakeholderElement}
                </div>
              </div>

              <div
                class="harm-section harm-report"
                ?expanded=${this.expandedHarms.has(harm.name)}
              >
                <div class="section-header">
                  <div class="header-container">
                    <div class="svg-icon">${unsafeHTML(noteIcon)}</div>
                    <div class="name">Notes</div>
                  </div>

                  <div class="rating">
                    <span>Severity:</span>
                    <span class="fire-container">
                      <span
                        class="svg-icon"
                        ?activated=${this.harmConfig.get(harm.name)!.severity >=
                        1}
                        @click=${() => this.harmSeverityClicked(harm.name, 1)}
                        >${unsafeHTML(fireIcon)}</span
                      >
                      <span
                        class="svg-icon"
                        ?activated=${this.harmConfig.get(harm.name)!.severity >=
                        2}
                        @click=${() => this.harmSeverityClicked(harm.name, 2)}
                        >${unsafeHTML(fireIcon)}</span
                      >
                      <span
                        class="svg-icon"
                        ?activated=${this.harmConfig.get(harm.name)!.severity >=
                        3}
                        @click=${() => this.harmSeverityClicked(harm.name, 3)}
                        >${unsafeHTML(fireIcon)}</span
                      >
                    </span>
                  </div>
                </div>

                <div class="section-content note-content">
                  <textarea rows="3"></textarea>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      themes = html`
        ${themes}
        <div class="theme-item">
          <div class="theme-header">
            <div class="theme-name-icon svg-icon">
              ${harmIconMap[themeName]}
            </div>
            <div class="theme-name">${theme.name}</div>
          </div>

          ${harmList}
          </div>
        </div>
      `;
    }

    const template = html`<div
      class="expanded-container"
      @mousedown=${(e: MouseEvent) => {
        // Block panning/zooming on dragging
        e.stopPropagation();
      }}
      @wheel=${(e: MouseEvent) => {
        // Block panning/zooming on dragging
        e.stopPropagation();
      }}
      @touchstart=${(e: MouseEvent) => {
        // Block panning/zooming on dragging
        e.stopPropagation();
      }}
    >
      ${themes}
    </div>`;

    return template;
  }

  _createLiteTemplate() {
    let harmList = html``;

    const cleanHarmTheme = (themeName: string) => {
      return themeName.replace(/(.*)\sharms/, '$1');
    };

    for (const [_, themeName] of themeNames.entries()) {
      const theme = harmTaxonomy[themeName];
      harmList = html`${harmList}<span class="description"
          >${cleanHarmTheme(theme.name)}</span
        >`;
    }

    let lite = html` <div
      class="lite-container"
      style="min-width: ${LAYOUT_CONFIG.rectWidth}px;"
    >
      <div class="header">
        <div class="content">
          <div class="right">
            <span class="header">Harm Summary</span>
            ${harmList}
          </div>
        </div>
      </div>
    </div>`;

    lite = lite;

    return lite;
  }

  render() {
    const expandedTemplate = this._createExpandedTemplate();
    const liteTemplate = this._createLiteTemplate();

    return html`
      <div class="harm-summary">
        <div class="top-buttons">
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              this.buttonMouseEnter(
                e,
                this.isLite ? 'Expand' : 'Minimize',
                'top'
              )}
            @mouseleave=${(_: MouseEvent) => this.tooltipTopMouseLeave()}
            @click=${(e: MouseEvent) => this.resizeButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(this.isLite ? expandIcon : shrinkIcon)}
          </div>
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              this.buttonMouseEnter(e, 'Clear all content', 'top')}
            @mouseleave=${(_: MouseEvent) => this.tooltipTopMouseLeave()}
            @click=${(e: MouseEvent) => this.resizeButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(deleteIcon)}
          </div>
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              this.buttonMouseEnter(e, 'Auto-fill all content', 'top')}
            @mouseleave=${(_: MouseEvent) => this.tooltipTopMouseLeave()}
            @click=${(e: MouseEvent) => this.resizeButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(magicIcon)}
          </div>
        </div>
        <div class="harm-summary-content">
          <div class="content">
            ${this.isLite ? liteTemplate : expandedTemplate}
          </div>
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
    'farsight-harm-summary': FarsightHarmSummary;
  }
}

/**
 * Create a set clone
 * @param curSet A set to be cloned
 * @returns A new set cloned from curSet
 */
const cloneSet = <T>(curSet: Set<T>) => {
  const newSet = new Set<T>();
  for (const item of curSet) {
    newSet.add(item);
  }
  return newSet;
};
