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

import {
  updatePopperTooltip,
  tooltipMouseEnter,
  tooltipMouseLeave
} from '@xiaohk/utils';
import d3 from '../../utils/d3-import';
import {
  LitElement,
  css,
  unsafeCSS,
  html,
  TemplateResult,
  PropertyValues
} from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state, query } from 'lit/decorators.js';
import {
  UseCaseCategories,
  StakeholderCategory,
  HarmCategory,
  SubHarmCategory,
  subHarmCategoryMap,
  subHarmStringMap
} from '../harm-panel/harm-types';
import { startLogoBlinkAnimation } from '../container-signal/container-signal';
import { addLoader } from '../harm-panel/envision-tree-draw';

import type {
  EnvisionTreeNodeEvent,
  EnvisionTreeNodeEventDetail,
  LayerType
} from '../harm-panel/harm-types';
import type { TooltipConfig } from '@xiaohk/utils';

import componentCSS from './envision-node.scss?inline';
import deleteIcon from '../../images/icon-delete.svg?raw';
import editIcon from '../../images/icon-edit.svg?raw';
import refreshIcon from '../../images/icon-refresh.svg?raw';
import refresh2Icon from '../../images/icon-refresh-2.svg?raw';
import addIcon from '../../images/icon-add.svg?raw';
import addMagicIcon from '../../images/icon-logo-compact.svg?raw';
import expandIcon from '../../images/icon-expand-2.svg?raw';
import shrinkIcon from '../../images/icon-shrink-2.svg?raw';
import tagIcon from '../../images/icon-tag.svg?raw';
import checkIcon from '../../images/icon-check-2.svg?raw';
import crossIcon from '../../images/icon-cross-2.svg?raw';
import alertIcon from '../../images/icon-alert-2.svg?raw';
import directIcon from '../../images/icon-person-filled.svg?raw';
import indirectIcon from '../../images/icon-person-outline.svg?raw';
import thinkingIcon from '../../images/icon-thinking-alpha.svg?raw';
import allocativeIcon from '../../images/icon-allocative-solid.svg?raw';
import representationalIcon from '../../images/icon-representational-solid.svg?raw';
import qualityIcon from '../../images/icon-quality-solid.svg?raw';
import societalIcon from '../../images/icon-societal-solid.svg?raw';
import interpersonalIcon from '../../images/icon-interpersonal-solid.svg?raw';
import fireIcon from '../../images/icon-fire.svg?raw';

const SHOW_BLINK_ANIMATION = false;

type EventName =
  | 'nodeClicked'
  | 'textChanged'
  | 'addClicked'
  | 'regenerateChildrenClicked'
  | 'severityUpdated'
  | 'editModeEntered'
  | 'editModeExited'
  | 'deleteClicked'
  | 'refreshClicked';
let nodeClickTimer: number | null = null;

const getHarmSeverityLabel = (severity: number) => {
  switch (severity) {
    case 0: {
      return 'Unset severity';
    }
    case 1: {
      return 'Moderately severe';
    }
    case 2: {
      return 'Severe';
    }
    case 3: {
      return 'Very severe';
    }
    default: {
      return '';
    }
  }
};

export const harmThemeCategoryList: [string, string][] = [];
for (const subHarm of Object.keys(subHarmCategoryMap)) {
  harmThemeCategoryList.push([
    subHarm,
    subHarmCategoryMap[subHarm as SubHarmCategory] as string
  ]);
}

/**
 * Envision node element.
 */
@customElement('farsight-envision-node')
export class FarsightEnvisionNode extends LitElement {
  // ===== Class properties ======
  @property({ type: String })
  type: LayerType = 'use-case';

  @property({ type: String })
  nodeID = '';

  @property({ type: String })
  nodeText = '';

  @property({ type: String })
  placeholderText = 'Double click to edit';

  @property({ type: String })
  nodeCategory:
    | UseCaseCategories
    | StakeholderCategory
    | SubHarmCategory
    | null = null;

  @property({ type: Number })
  userRatedHarmSeverity = 0;

  @property({ type: Boolean })
  hasShownChild = false;

  @property({ type: Boolean })
  hasHiddenChild = false;

  @property({ type: Boolean })
  hasParent = false;

  @property({ type: Boolean })
  disableAddButton = false;

  @property({ attribute: false })
  popperElementTop: HTMLElement | null = null;

  @property({ attribute: false })
  popperElementBottom: HTMLElement | null = null;

  @state()
  tooltipTop: TooltipConfig | null = null;

  @state()
  tooltipBottom: TooltipConfig | null = null;

  @query('.node')
  node!: HTMLElement;

  @query('.content-watermark')
  watermarkElement!: HTMLElement;

  @state()
  isContentEditable = false;

  @query('.content')
  contentElement!: HTMLElement;

  @query('.fire-icon-2')
  fireIconAnchor!: HTMLElement;

  magicAddHovering = false;

  @query('.loader-container')
  loaderContainerElement: HTMLDivElement | undefined;

  @state()
  isWaitingNodeTextToUpdate = false;

  hasTextEdited = false;

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
  }

  firstUpdated() {
    // Need to manually bind the input event because LIT doesn't work
    // This function fires when users change the text content
    this.contentElement.oninput = () => {
      this.contentChanged();
    };

    // Add the internal loader element (used for refreshing)
    if (this.loaderContainerElement) {
      addLoader(d3.select(this.loaderContainerElement), false);
    }
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

    // Transition for the placeholder text
    if (changedProperties.has('placeholderText')) {
      const placeholderTextElement = this.shadowRoot?.querySelector(
        '.placeholder .left .description'
      );
      if (placeholderTextElement) {
        console.log(placeholderTextElement);
      }
    }
  }

  // ===== Custom Methods ======
  initData = async () => {};

  enterEditMode = async (e: Event) => {
    this.dispatchNewEvent('editModeEntered', e);
    this.isContentEditable = true;

    // Show the blinking caret at the end
    this.contentElement.focus();

    if (this.nodeText === '') {
      this.nodeText = ' ';
      await this.updateComplete;
    }

    const range = document.createRange();
    const sel = window.getSelection();

    const childNodes = this.contentElement.childNodes;
    if (childNodes.length >= 0) {
      let target = this.contentElement;
      if (this.nodeText !== ' ') {
        target = childNodes[0] as HTMLElement;
      }
      range.setStart(target, (childNodes[0] as Text).length);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  exitEditMode = (e: Event) => {
    if (this.isContentEditable) {
      this.isContentEditable = false;
      this.dispatchNewEvent('editModeExited', e);
      const textContent = this.contentElement.textContent;

      if (textContent === ' ') {
        this.nodeText = '';
      } else {
        if (this.nodeText !== textContent) {
          // Notify the parent that the node text is updated
          this.nodeText = textContent ? textContent : '';
          this.hasTextEdited = true;
          this.dispatchNewEvent('textChanged', e);
        }
      }

      // Cancel selection if any
      if (window.getSelection()) {
        window.getSelection()?.empty();
      }

      // Chrome still focuses on the element after the enter key
      // We need to manually blur it
      this.contentElement.blur();
    }
  };

  // ===== Event Methods ======
  dispatchNewEvent = (name: EventName, originalEvent: Event) => {
    const detail: EnvisionTreeNodeEventDetail = {
      id: this.nodeID,
      originalEvent: originalEvent,
      type: this.type,
      text: this.nodeText,
      userRatedHarmSeverity: this.userRatedHarmSeverity
    };

    if (name === 'refreshClicked') {
      detail.startHandler = () => {
        if (this.loaderContainerElement) {
          this.loaderContainerElement.setAttribute('shown', '');
          this.contentElement.setAttribute('no-show', '');
          this.isWaitingNodeTextToUpdate = true;
        }
      };

      detail.endHandler = () => {
        // Received new text for the refresh action
        if (this.loaderContainerElement) {
          this.loaderContainerElement.removeAttribute('shown');
          this.contentElement.removeAttribute('no-show');
          this.isWaitingNodeTextToUpdate = false;
        }
      };
    }

    if (name === 'regenerateChildrenClicked') {
      detail.endHandler = () => {
        this.hasTextEdited = false;
      };
    }

    const event = new CustomEvent(name, { detail }) as EnvisionTreeNodeEvent;
    this.dispatchEvent(event);
  };

  nodeClicked(e: MouseEvent) {
    // Add a short delay to prevent double click firing the first single click
    if (nodeClickTimer) {
      clearTimeout(nodeClickTimer);
      nodeClickTimer = null;
    }

    nodeClickTimer = window.setTimeout(() => {
      if (!this.isContentEditable) {
        this.dispatchNewEvent('nodeClicked', e);
      }
    }, 200);
  }

  nodeDoubleClicked(e: MouseEvent) {
    // Cancel the first single click
    if (nodeClickTimer !== null) {
      clearTimeout(nodeClickTimer);
      nodeClickTimer = null;
    }

    e.stopPropagation();
    e.preventDefault();

    if (!this.isContentEditable) {
      this.enterEditMode(e);
    }
  }

  editButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.isContentEditable) {
      this.enterEditMode(e);
    }
  }

  /**
   * Event handler when user updates the text content.
   */
  contentChanged() {
    // Pass
  }

  waterMarkMouseEnter(delay = 500) {
    const target = this.watermarkElement;
    if (this.tooltipBottom && this.nodeCategory) {
      let tooltipContent = this.nodeCategory as string;

      // If the node is a harm node, show both the harm category and the sub-harm
      // category
      if (this.type === 'harm') {
        const harmType =
          subHarmCategoryMap[this.nodeCategory as SubHarmCategory];
        tooltipContent = `${harmType}: ${this.nodeCategory}`;
      }

      const content = `<div class="tooltip-clickable">
        <span>${tooltipContent}</span>
        <span class="tooltip-subtitle">Click to change</span>
      </div>`;

      if (this.tooltipBottom.tooltipElement.classList.contains('hidden')) {
        if (this.tooltipBottom.mouseenterTimer !== null) {
          clearTimeout(this.tooltipBottom.mouseenterTimer);
          this.tooltipBottom.mouseenterTimer = null;
        }

        this.tooltipBottom.mouseenterTimer = window.setTimeout(() => {
          updatePopperTooltip(
            this.tooltipBottom!.tooltipElement,
            target,
            content,
            'bottom',
            true
          );
          this.tooltipBottom!.tooltipElement.classList.remove('hidden');
          this.tooltipBottom!.mouseenterTimer = null;
        }, delay);
      } else {
        if (this.tooltipBottom.mouseleaveTimer !== null) {
          clearTimeout(this.tooltipBottom.mouseleaveTimer);
          this.tooltipBottom.mouseleaveTimer = null;
        }

        updatePopperTooltip(
          this.tooltipBottom!.tooltipElement,
          target,
          content,
          'bottom',
          true
        );
      }
    }
  }

  tagButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    if (target.getAttribute('disabled') !== null) {
      return;
    }

    // Ignore the interaction if this node is empty
    if (this.nodeText === '') return;

    switch (this.type) {
      case 'use-case': {
        const categories = [
          UseCaseCategories.INTENDED,
          UseCaseCategories.HIGH_STAKES,
          UseCaseCategories.MISUSE
        ];

        // Switch the category
        const curIndex = categories.indexOf(
          this.nodeCategory as UseCaseCategories
        );
        const newIndex = (curIndex + 1) % categories.length;
        this.nodeCategory = categories[newIndex];

        // Show the watermark tooltip
        this.waterMarkMouseEnter(50);

        if (this.tooltipBottom?.mouseleaveTimer) {
          clearTimeout(this.tooltipBottom.mouseleaveTimer);
          this.tooltipBottom.mouseleaveTimer = null;
        }

        if (this.tooltipBottom) {
          this.tooltipBottom.mouseleaveTimer = window.setTimeout(() => {
            tooltipMouseLeave(this.tooltipBottom, 50);
          }, 1000);
        }
        break;
      }

      case 'stakeholder': {
        const categories = [
          StakeholderCategory.DIRECT,
          StakeholderCategory.INDIRECT
        ];

        // Switch the category
        const curIndex = categories.indexOf(
          this.nodeCategory as StakeholderCategory
        );
        const newIndex = (curIndex + 1) % categories.length;
        this.nodeCategory = categories[newIndex];

        // Show the watermark tooltip
        this.waterMarkMouseEnter(50);

        if (this.tooltipBottom?.mouseleaveTimer) {
          clearTimeout(this.tooltipBottom.mouseleaveTimer);
          this.tooltipBottom.mouseleaveTimer = null;
        }

        if (this.tooltipBottom) {
          this.tooltipBottom.mouseleaveTimer = window.setTimeout(() => {
            tooltipMouseLeave(this.tooltipBottom, 50);
          }, 1000);
        }
        break;
      }

      case 'harm': {
        // Find the current index in the category list
        let curIndex = 0;
        for (const [i, item] of harmThemeCategoryList.entries()) {
          if (item[0].toLowerCase() === this.nodeCategory?.toLowerCase()) {
            curIndex = i;
          }
        }
        this.nodeCategory = harmThemeCategoryList[
          (curIndex + 1) % harmThemeCategoryList.length
        ][0] as SubHarmCategory;

        // Show the watermark tooltip
        this.waterMarkMouseEnter(50);

        // Hide the tooltip after a short time
        if (this.tooltipBottom?.mouseleaveTimer) {
          clearTimeout(this.tooltipBottom.mouseleaveTimer);
          this.tooltipBottom.mouseleaveTimer = null;
        }

        if (this.tooltipBottom) {
          this.tooltipBottom.mouseleaveTimer = window.setTimeout(() => {
            tooltipMouseLeave(this.tooltipBottom, 50);
          }, 1000);
        }

        break;
      }

      case 'summary': {
        break;
      }

      default: {
        break;
      }
    }
  }

  refreshButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    if (target.getAttribute('disabled') !== null) {
      return;
    }

    if (this.isWaitingNodeTextToUpdate) return;

    this.dispatchNewEvent('refreshClicked', e);
  }

  deleteButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    if (target.getAttribute('disabled') !== null) {
      return;
    }

    this.dispatchNewEvent('deleteClicked', e);
  }

  addButtonClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    this.dispatchNewEvent('addClicked', e);
  }

  regenerateChildrenClicked(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    this.dispatchNewEvent('regenerateChildrenClicked', e);
  }

  harmCategorySelectClicked(e: MouseEvent) {
    e.stopPropagation();
  }

  harmCategorySelectChanged(e: InputEvent) {
    const target = e.target as HTMLSelectElement;
    const newHarmSubType = subHarmStringMap.get(target.value.toLowerCase());
    if (newHarmSubType === undefined) {
      console.error(
        'Failed to parse the sub harm string from the select.',
        target.value
      );
      return;
    }

    this.nodeCategory = newHarmSubType;
  }

  fireButtonsClicked(e: MouseEvent, hideTooltipLater: boolean) {
    e.stopPropagation();
    e.preventDefault();

    // Ignore the interaction if this node is empty
    if (this.nodeText === '') return;

    this.userRatedHarmSeverity = (this.userRatedHarmSeverity + 1) % 4;

    const content = `<div class="tooltip-clickable">
        <span>${getHarmSeverityLabel(this.userRatedHarmSeverity)}</span>
        <span class="tooltip-subtitle">Click to change</span>
      </div>`;

    // Update the tooltip
    tooltipMouseEnter(
      e,
      content,
      'top',
      this.tooltipBottom,
      50,
      this.fireIconAnchor
    );

    // Update the parent
    this.dispatchNewEvent('severityUpdated', e);

    // Hide the tooltip after a short time
    if (hideTooltipLater) {
      if (this.tooltipBottom?.mouseleaveTimer) {
        clearTimeout(this.tooltipBottom.mouseleaveTimer);
        this.tooltipBottom.mouseleaveTimer = null;
      }

      if (this.tooltipBottom) {
        this.tooltipBottom.mouseleaveTimer = window.setTimeout(() => {
          tooltipMouseLeave(this.tooltipBottom, 50);
        }, 1000);
      }
    }
  }

  dblClickBlocker(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  // ===== Templates and Styles ======
  render() {
    let categoryIcon: TemplateResult;

    let convertedNodeCategory:
      | UseCaseCategories
      | StakeholderCategory
      | HarmCategory
      | null = null;

    if (this.type === 'harm') {
      convertedNodeCategory =
        subHarmCategoryMap[this.nodeCategory as SubHarmCategory];
    } else {
      const safeNodeCategory = this.nodeCategory as
        | UseCaseCategories
        | StakeholderCategory
        | null;
      convertedNodeCategory = safeNodeCategory;
    }

    switch (convertedNodeCategory) {
      case UseCaseCategories.INTENDED: {
        categoryIcon = html`${unsafeHTML(checkIcon)}`;
        break;
      }

      case UseCaseCategories.HIGH_STAKES: {
        categoryIcon = html`${unsafeHTML(alertIcon)}`;
        break;
      }

      case UseCaseCategories.MISUSE: {
        categoryIcon = html`${unsafeHTML(crossIcon)}`;
        break;
      }

      case StakeholderCategory.DIRECT: {
        categoryIcon = html`${unsafeHTML(directIcon)}`;
        break;
      }

      case StakeholderCategory.INDIRECT: {
        categoryIcon = html`${unsafeHTML(indirectIcon)}`;
        break;
      }

      case HarmCategory.REPRESENTATIONAL: {
        categoryIcon = html`${unsafeHTML(representationalIcon)}`;
        break;
      }

      case HarmCategory.ALLOCATIVE: {
        categoryIcon = html`${unsafeHTML(allocativeIcon)}`;
        break;
      }

      case HarmCategory.QUALITY: {
        categoryIcon = html`${unsafeHTML(qualityIcon)}`;
        break;
      }

      case HarmCategory.INTERPERSONAL: {
        categoryIcon = html`${unsafeHTML(interpersonalIcon)}`;
        break;
      }

      case HarmCategory.SOCIETAL: {
        categoryIcon = html`${unsafeHTML(societalIcon)}`;
        break;
      }

      case null: {
        categoryIcon = html``;
        break;
      }

      default: {
        throw Error(`Unknown category ${this.nodeCategory}`);
      }
    }

    let newElementName = 'use case';
    if (this.type === 'use-case') {
      newElementName = 'stakeholder';
    } else if (this.type === 'stakeholder') {
      newElementName = 'harm';
    }

    let addIconDiv = html`
      <div
        class="svg-icon add-suggestion-icon"
        @mouseenter=${(e: MouseEvent) => {
          tooltipMouseEnter(
            e,
            `Add ${newElementName} suggestions`,
            'right',
            this.tooltipTop
          );
          // Start the blinking animation
          this.magicAddHovering = true;
          const leftCircle = this.shadowRoot?.querySelector(
            '.right-buttons svg #left-circle'
          );
          const rightCircle = this.shadowRoot?.querySelector(
            '.right-buttons svg #right-circle'
          );
          if (leftCircle && rightCircle && SHOW_BLINK_ANIMATION) {
            startLogoBlinkAnimation(
              () => this.magicAddHovering,
              leftCircle,
              rightCircle
            );
          }
        }}
        @mouseleave=${() => {
          tooltipMouseLeave(this.tooltipTop);
          this.magicAddHovering = false;
        }}
        @click=${(e: MouseEvent) => this.addButtonClicked(e)}
      >
        ${unsafeHTML(addMagicIcon)}
      </div>
    `;

    if (this.hasShownChild || this.hasHiddenChild) {
      // If the user has updated the text, allow users to re-generate all of its
      // children
      if (this.hasTextEdited) {
        addIconDiv = html`
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(
                e,
                `Regenerate ${newElementName} suggestions`,
                'right',
                this.tooltipTop
              )}
            @mouseleave=${() => {
              tooltipMouseLeave(this.tooltipTop);
            }}
            @click=${(e: MouseEvent) => this.regenerateChildrenClicked(e)}
          >
            ${unsafeHTML(refresh2Icon)}
          </div>
        `;
      } else {
        addIconDiv = html`
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(
                e,
                'Add a new ' + newElementName,
                'right',
                this.tooltipTop
              )}
            @mouseleave=${() => {
              tooltipMouseLeave(this.tooltipTop);
            }}
            @click=${(e: MouseEvent) => this.addButtonClicked(e)}
          >
            ${unsafeHTML(addIcon)}
          </div>
        `;
      }
    }

    let emptyChildHeader = 'What else?';
    if (this.type === 'stakeholder') {
      emptyChildHeader = 'Who else?';
    }

    // Add a hidden selection element below the watermark content for harm nodes
    let harmSelectOption = html``;
    let curTheme = null;
    for (const item of harmThemeCategoryList) {
      if (item[1] !== curTheme) {
        if (curTheme) {
          harmSelectOption = html`${harmSelectOption}</optgroup>`;
        }
        curTheme = item[1];
        harmSelectOption = html`${harmSelectOption}
          <optgroup
            label="${item[1]
              .toLowerCase()
              .replace(/(?:^|\s)\w/g, match => match.toUpperCase())}"
          ></optgroup>`;
      }
      harmSelectOption = html`${harmSelectOption}
        <option ?selected=${item[0] === this.nodeCategory}>${item[0]}</option>`;
    }

    const harmSelect = html`
      <select
        class="select-harm-category"
        @click=${(e: MouseEvent) => this.harmCategorySelectClicked(e)}
        @mousedown=${(e: MouseEvent) => this.harmCategorySelectClicked(e)}
        @touchdown=${(e: MouseEvent) => this.harmCategorySelectClicked(e)}
        @change=${(e: InputEvent) => this.harmCategorySelectChanged(e)}
      >
        ${harmSelectOption}
      </select>
    `;

    // Add fire buttons for the harm nodes
    const fireButtons = html`
      <div
        class="fire-buttons"
        @click=${(e: MouseEvent) => this.fireButtonsClicked(e, false)}
        @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
        @mouseenter=${(e: MouseEvent) => {
          const content = `<div style="display: flex; flex-direction: column; align-items: center">
              <span>${getHarmSeverityLabel(this.userRatedHarmSeverity)}</span>
              <span class="tooltip-subtitle">Click to change</span>
            </div>`;
          tooltipMouseEnter(
            e,
            content,
            'top',
            this.tooltipBottom,
            500,
            this.fireIconAnchor
          );
        }}
      >
        <div
          class="svg-icon fire-icon fire-icon-1"
          ?disabled=${this.nodeText === ''}
          ?inactive=${this.userRatedHarmSeverity < 1}
        >
          ${unsafeHTML(fireIcon)}
        </div>
        <div
          class="svg-icon fire-icon fire-icon-2"
          ?disabled=${this.nodeText === ''}
          ?inactive=${this.userRatedHarmSeverity < 2}
        >
          ${unsafeHTML(fireIcon)}
        </div>
        <div
          class="svg-icon fire-icon fire-icon-3"
          ?disabled=${this.nodeText === ''}
          ?inactive=${this.userRatedHarmSeverity < 3}
        >
          ${unsafeHTML(fireIcon)}
        </div>
      </div>
    `;

    // Add a button to change severity in the top buttons
    const fireTopButton = html`
      <div
        class="svg-icon"
        ?disabled=${this.nodeText === '' || this.type === 'summary'}
        @mouseenter=${(e: MouseEvent) =>
          tooltipMouseEnter(e, 'Change severity', 'top', this.tooltipTop)}
        @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
        @click=${(e: MouseEvent) => this.fireButtonsClicked(e, true)}
        @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
      >
        ${unsafeHTML(fireIcon)}
      </div>
    `;

    // Add a show/hide button if this node has children
    const expandButton = html`
      <div
        class="svg-icon"
        ?last-option=${this.type === 'summary'}
        @mouseenter=${(e: MouseEvent) => {
          let childrenName = 'use cases';
          if (this.type === 'use-case') {
            childrenName = 'stakeholders';
          } else if (this.type === 'stakeholder') {
            childrenName = 'harms';
          }

          let content = '';
          if (this.hasShownChild) {
            content = `Hide its ${childrenName}`;
          } else if (this.hasHiddenChild) {
            content = `Show its ${childrenName}`;
          }
          tooltipMouseEnter(e, content, 'top', this.tooltipTop);
        }}
        @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
        @click=${(e: MouseEvent) => this.nodeClicked(e)}
        @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
      >
        ${unsafeHTML(this.hasShownChild ? shrinkIcon : expandIcon)}
      </div>
    `;

    return html`
      <div
        class="node ${this.type}-node node-${this.nodeID}"
        ?has-shown-child=${this.hasShownChild}
        ?has-hidden-child=${this.hasHiddenChild}
        ?has-parent=${this.hasParent}
        @click=${(e: MouseEvent) => this.nodeClicked(e)}
        @dblclick=${(e: MouseEvent) => this.nodeDoubleClicked(e)}
        @mouseleave=${() => {
          tooltipMouseLeave(this.tooltipTop, 50);
          tooltipMouseLeave(this.tooltipBottom, 50);
        }}
      >
        <div class="top-buttons">
          <div
            class="svg-icon"
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(e, 'Edit', 'top', this.tooltipTop)}
            @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
            @click=${(e: MouseEvent) => this.editButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(editIcon)}
          </div>

          ${this.hasShownChild || this.hasHiddenChild ? expandButton : ''}

          <div
            class="svg-icon"
            ?disabled=${this.nodeText === '' || this.type === 'summary'}
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(e, 'Change category', 'top', this.tooltipTop)}
            @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
            @click=${(e: MouseEvent) => this.tagButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(tagIcon)}
          </div>

          ${this.type === 'harm' ? fireTopButton : ''}

          <div
            class="svg-icon"
            ?disabled=${this.type === 'summary'}
            ?last-option=${this.nodeText === ''}
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(
                e,
                this.nodeText === '' ? 'Give me a suggestion' : 'Regenerate',
                'top',
                this.tooltipTop
              )}
            @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
            @click=${(e: MouseEvent) => this.refreshButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${this.nodeText === ''
              ? unsafeHTML(addMagicIcon)
              : unsafeHTML(refreshIcon)}
          </div>

          <div
            class="svg-icon"
            ?disabled=${this.nodeText === '' || this.type === 'summary'}
            @mouseenter=${(e: MouseEvent) =>
              tooltipMouseEnter(e, 'Delete', 'top', this.tooltipTop)}
            @mouseleave=${(_: MouseEvent) => tooltipMouseLeave(this.tooltipTop)}
            @click=${(e: MouseEvent) => this.deleteButtonClicked(e)}
            @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          >
            ${unsafeHTML(deleteIcon)}
          </div>
        </div>

        <div
          class="right-buttons"
          ?disabled=${this.disableAddButton ||
          this.nodeText === '' ||
          new Set(this.nodeText).size === 1 ||
          this.type === 'harm'}
        >
          ${addIconDiv}
        </div>

        ${this.type === 'harm' ? fireButtons : ''}

        <div
          class="content-watermark"
          ?hidden=${this.nodeText === ''}
          @click=${(e: MouseEvent) => this.tagButtonClicked(e)}
          @dblclick=${(e: MouseEvent) => this.dblClickBlocker(e)}
          @mouseenter=${(_: MouseEvent) => this.waterMarkMouseEnter()}
          @mouseleave=${(_: MouseEvent) =>
            tooltipMouseLeave(this.tooltipBottom)}
        >
          <div class="svg-icon">${categoryIcon}</div>
          ${this.type === 'harm' ? harmSelect : ''}
        </div>

        <span
          class="content ${this.nodeType}-content"
          tabindex="1"
          ?contenteditable=${this.isContentEditable}
          ?no-content=${this.nodeText === ''}
          @mousedown=${(e: MouseEvent) => {
            // Block panning on dragging
            if (this.isContentEditable) e.stopPropagation();
          }}
          @focusout=${(e: Event) => {
            this.exitEditMode(e);
          }}
          @keypress=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              this.exitEditMode(e);
            }
          }}
          .innerText=${this.nodeText}
        ></span>

        <div
          class="placeholder"
          ?hidden=${this.nodeText !== '' || this.isWaitingNodeTextToUpdate}
        >
          <div
            class="right"
            ?custom-text=${this.placeholderText !== 'Double click to edit'}
          >
            <span class="header">${emptyChildHeader}</span>
            <span class="description">${this.placeholderText}</span>
          </div>
          <span class="svg-icon">${unsafeHTML(thinkingIcon)}</span>
        </div>

        <div class="loader-container"></div>
      </div>

      <div class="node-background"></div>
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
    'farsight-envision-node': FarsightEnvisionNode;
  }
}
