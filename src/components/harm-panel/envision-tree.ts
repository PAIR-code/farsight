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
import { Logger } from '@xiaohk/utils/logger';
import {
  handleNodeClick,
  handleTextChanged,
  handleAddClicked,
  handleSeverityUpdated,
  handleEditModeEntered,
  handleEditModeExited,
  handleDeleteClicked,
  handleRefreshClicked,
  handleRegenerateChildrenClicked,
  dispatchStatUpdate,
  _getNodeData
} from './envision-tree-events';
import {
  drawTree,
  _drawBackContent,
  _drawEdges,
  _drawNodes,
  _drawHarmEdges,
  getInitBBox,
  animateHarmNodePlaceholders,
  addLoader
} from './envision-tree-draw';
import { exportTree } from './envision-tree-export';
import {
  UseCaseCategories,
  StakeholderCategory,
  HarmCategory,
  SubHarmCategory,
  LayoutConfig,
  LayerType,
  subHarmStringMap
} from './harm-types';
import {
  useCasePrompt,
  stakeholderPrompt,
  harmPrompt
} from '../../data/static-data';
import { harmThemeCategoryList } from '../envision-node/envision-node';
import { TextGenFakeWorker } from '../../workers/text-gen-fake-worker';

import type { FakeWorker } from '../../workers/fake-worker';
import type {
  Size,
  Padding,
  TextGenWorkerMessage,
  PromptModel,
  RectPoint,
  Mutable
} from '../../types/common-types';
import type {
  SummaryNodeData,
  UseCaseNodeData,
  HarmNodeData,
  StakeholderNodeData,
  EnvisionTreeNodeData,
  HarmNodeSummaryData,
  EnvisionTreeNodeEvent
} from './harm-types';
import type { FooterInfo } from '../footer/footer';
import type { DialogInfo } from '../confirm-dialog/confirm-dialog';
import { getNumCommonWords } from '@xiaohk/utils';
import { config } from '../../utils/config';
import '../envision-node/envision-node';

import TextGenWorkerInline from '../../workers/text-gen-worker?worker&inline';

const DEV_MODE = import.meta.env.MODE === 'development';
const LIB_MODE = import.meta.env.MODE === 'library';
const EXTENSION_MODE = import.meta.env.MODE === 'extension';
const USE_CACHE = import.meta.env.MODE !== 'x20';
const STORAGE = DEV_MODE ? localStorage : localStorage;
const MOCK_TIME_DELAY = 500;
const RANDOM_DELAY = d3.randomInt(500, 3000);

const REQUEST_NAME = 'farsight';
const GRID_GAP = 24;
const GRID_CIRCLE_RADIUS = 1.5;

// The maximum use cases to be automatically generated per category
const USE_CASE_CAT_MAX = 2;
const DIRECT_STAKEHOLDER_CAT_MAX = 3;
const INDIRECT_STAKEHOLDER_CAT_MAX = 2;
const HARM_CAT_MAX = 2;

// The padding around the cursor block element underneath the tree nodes
const CURSOR_BLOCKER_PADDING = 10;

// Rect width is enforced, and rect height is just used for default gap estimation
const LAYOUT_CONFIG = config.layout.treeLayout;

const nodeTypeCounter = {
  summary: 0,
  useCase: 0,
  stakeholder: 0,
  harm: 0,
  harmSummary: 0
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class EnvisionTree {
  // HTML elements
  pane: d3.Selection<HTMLElement, unknown, null, undefined>;
  container: d3.Selection<HTMLElement, unknown, null, undefined>;
  backgroundSVG: d3.Selection<SVGElement, unknown, null, undefined>;
  linkSVG: d3.Selection<SVGElement, unknown, null, undefined>;
  backSVG: d3.Selection<SVGElement, unknown, null, undefined>;
  popperElementTop: HTMLElement | null = null;
  popperElementBottom: HTMLElement | null = null;

  // Layouts
  paneSize: Size;
  padding: Padding;

  // Zooming
  zoom: d3.ZoomBehavior<HTMLElement, unknown> | null = null;
  curTransform: d3.ZoomTransform;

  // Trees
  summary = '';
  treeLayout: d3.TreeLayout<EnvisionTreeNodeData>;
  tree: d3.HierarchyPointNode<EnvisionTreeNodeData> | null = null;
  treeData: EnvisionTreeNodeData | null = null;
  layerBBox: Map<LayerType, RectPoint> = new Map();
  harmPlaceholderText = 'Double click to edit';

  // Workers
  textGenWorker: Worker | FakeWorker<TextGenWorkerMessage>;
  textGenWorkerRequestID = 1;
  apiKey: string | null = null;

  // Events
  firstUseCaseExpanded: () => void;

  // Bind event handlers implemented in './envision-tree-events.ts
  handleNodeClick = handleNodeClick;
  handleTextChanged = handleTextChanged;
  handleAddClicked = handleAddClicked;
  handleSeverityUpdated = handleSeverityUpdated;
  handleEditModeEntered = handleEditModeEntered;
  handleEditModeExited = handleEditModeExited;
  handleDeleteClicked = handleDeleteClicked;
  handleRefreshClicked = handleRefreshClicked;
  handleRegenerateChildrenClicked = handleRegenerateChildrenClicked;
  dispatchStatUpdate = dispatchStatUpdate;
  _getNodeData = _getNodeData;

  // Bind drawing functions implemented in './envision-tree-draw.ts'
  drawTree = drawTree;
  _drawBackContent = _drawBackContent;
  _drawNodes = _drawNodes;
  _drawEdges = _drawEdges;
  _drawHarmEdges = _drawHarmEdges;
  animateHarmNodePlaceholders = animateHarmNodePlaceholders;

  // Bind exporting functions implemented in './envision-tree-export.ts'
  exportTree = exportTree;

  // Timing
  drawFinished: Promise<void> | null = null;

  // Dialog
  showDialog: (dialogInfo: DialogInfo) => void;

  // Update footer
  updateFooterInfo: (newFooterInfo: FooterInfo) => void;

  // Logging
  logger: Logger | null;

  constructor(
    paneElement: HTMLElement,
    popperElementTop: HTMLElement | null,
    popperElementBottom: HTMLElement | null,
    apiKey: string | null,
    logger: Logger | null,
    firstUseCaseExpanded: () => void,
    showDialog: (dialogInfo: DialogInfo) => void,
    updateFooterInfo: (newFooterInfo: FooterInfo) => void
  ) {
    this.pane = d3.select(paneElement);
    this.container = this.pane.select('.envision-tree-container');
    this.backgroundSVG = this.pane.select('.background-svg');
    this.linkSVG = this.container.select('svg.link-container');
    this.backSVG = this.container.select('svg.back-container');
    this.popperElementTop = popperElementTop;
    this.popperElementBottom = popperElementBottom;
    this.apiKey = apiKey;
    this.logger = logger;
    this.firstUseCaseExpanded = firstUseCaseExpanded;
    this.showDialog = showDialog;
    this.updateFooterInfo = updateFooterInfo;

    // Initialize the worker
    if (!EXTENSION_MODE) {
      this.textGenWorker = new TextGenWorkerInline();
      this.textGenWorker.onmessage = (
        e: MessageEvent<TextGenWorkerMessage>
      ) => {
        this.textGenWorkerMessageHandler(e);
      };
    } else {
      const textGenWorkerMessageHandler = (
        e: MessageEvent<TextGenWorkerMessage>
      ) => {
        this.textGenWorkerMessageHandler(e);
      };
      this.textGenWorker = new TextGenFakeWorker(textGenWorkerMessageHandler);
    }

    // Capture the size
    const bbox = paneElement.getBoundingClientRect();
    this.paneSize = {
      width: bbox.width,
      height: bbox.height
    };
    this.linkSVG
      .style('width', `${this.paneSize.width}px`)
      .style('height', `${this.paneSize.height}px`);
    this.backSVG
      .style('width', `${this.paneSize.width}px`)
      .style('height', `${this.paneSize.height}px`);

    // Configure layouts
    this.padding = {
      top: 0,
      left: 25,
      right: 0,
      bottom: 0
    };

    // Init tree layout
    this.treeLayout = d3
      .tree<EnvisionTreeNodeData>()
      .separation((a, b) => {
        if (a.data.height === undefined || b.data.height === undefined) {
          return 1;
        } else {
          let vGap = LAYOUT_CONFIG.vGap;
          if (a.data.type === 'harm' && b.data.type === 'harm') {
            if (a.parent === b.parent) {
              vGap = LAYOUT_CONFIG.shortVGap;
            }
          }

          const sComputed = LAYOUT_CONFIG.rectHeight + LAYOUT_CONFIG.vGap;
          const sExpected = a.data.height / 2 + b.data.height / 2 + vGap;
          return sExpected / sComputed;
        }
      })
      .nodeSize([
        LAYOUT_CONFIG.rectHeight + LAYOUT_CONFIG.vGap,
        LAYOUT_CONFIG.rectWidth + LAYOUT_CONFIG.hGap
      ]);

    // Init the layer bbox
    this.layerBBox.set('summary', getInitBBox());
    this.layerBBox.set('use-case', getInitBBox());
    this.layerBBox.set('stakeholder', getInitBBox());
    this.layerBBox.set('harm', getInitBBox());

    // Init the zoom and background
    this.curTransform = d3.zoomIdentity;
    this.initView();
  }

  /**
   * Remove all drawn tree elements
   */
  clearViews = () => {
    this.container
      .transition('clear')
      .duration(300)
      .style('opacity', 0)
      .on('end', () => {
        this.container
          .select('.tree-content .node-group')
          .selectAll('*')
          .remove();
        this.container
          .select('.tree-content .link-container')
          .selectAll('*')
          .remove();
        this.container
          .select('.tree-content .annotation-group')
          .selectAll('*')
          .remove();
        this.container
          .select('.tree-content .back-container')
          .selectAll('*')
          .remove();
        this.container.style('opacity', 1);

        // Also clear the zoom
        if (this.zoom) {
          this.pane.call(selection => {
            this.zoom!.transform(selection, d3.zoomIdentity);
          });
        }
      });

    // Init the layer bbox
    this.layerBBox.set('summary', getInitBBox());
    this.layerBBox.set('use-case', getInitBBox());
    this.layerBBox.set('stakeholder', getInitBBox());
    this.layerBBox.set('harm', getInitBBox());
  };

  /**
   * Initialize the harm tree visualization view
   */
  initView = () => {
    // Set up the background grid pattern
    const pattern = this.backgroundSVG
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', GRID_GAP)
      .attr('height', GRID_GAP)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', `translate(-${0}, -${0})`);

    pattern
      .append('circle')
      .attr('class', 'grid-circle')
      .attr('cx', GRID_CIRCLE_RADIUS)
      .attr('cy', GRID_CIRCLE_RADIUS)
      .attr('r', GRID_CIRCLE_RADIUS);

    this.backgroundSVG
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#grid-pattern)');

    // Set up drag and zoom
    this.zoom = d3
      .zoom<HTMLElement, unknown>()
      .extent([
        [0, 0],
        [this.paneSize.width, this.paneSize.height]
      ])
      .scaleExtent([0.5, 2])
      .interpolate(d3.interpolate)
      .on('zoom', (e: d3.D3ZoomEvent<HTMLElement, unknown>) => {
        this.zoomed(e);
      });

    this.pane.call(this.zoom).call(selection => {
      this.zoom!.transform(selection, d3.zoomIdentity);
    });

    // Listen to the double click
    this.pane.on('dblclick.zoom', null);

    // Listen to double click to reset zoom
    this.pane.on('dblclick', () => {
      this.pane
        .transition('reset')
        .duration(750)
        .ease(d3.easeCubicInOut)
        .call(selection => {
          this.zoom!.transform(selection, d3.zoomIdentity);
        });
    });

    // Start the endless animation to update harm node's placeholder text
    this.animateHarmNodePlaceholders();
  };

  /**
   * Initialize the harm tree data and call LLM to generate use cases
   */
  initEnvisionTreeData = async (summary: string) => {
    this.summary = summary;
    this.treeData = {
      text: summary,
      type: 'summary',
      category: null,
      children: [],
      childrenCandidates: [],
      id: 'summary-0',
      showChildren: true
    };
    this.resetAndLayoutTree();
    await this.drawTree(null);

    window.setTimeout(() => {
      this.pane
        .transition()
        .duration(500)
        .call(selection => {
          this.zoom!.scaleTo(selection, 0.95);
        });
    }, 0);

    // Show the loader in the summary node
    this._updateLoader('summary-0', true);

    // Call the LLM API to generate use cases
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    const compiledPrompt = useCasePrompt.prompt.replace(
      `{{${useCasePrompt.variables[0]}}}`,
      summary
    );

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE) console.log('Skip text gen API call (use case, cached)');
      window.setTimeout(
        () => {
          this.addAutoUseCases(response);
        },
        DEV_MODE ? MOCK_TIME_DELAY : RANDOM_DELAY()
      );
    } else {
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-use-case-${this
            .textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0
        }
      };
      this.textGenWorker.postMessage(message);
    }
  };

  /**
   * Add use cases as tree nodes and draw them
   */
  addAutoUseCases = async (useCaseResponse: string) => {
    if (this.treeData === null) {
      throw Error('treeData is not initialized yet.');
    }

    const [useCaseNodes, useCaseCandidateNodes] =
      parseUseCaseResponse(useCaseResponse);

    this.treeData.children = useCaseNodes;
    this.treeData.childrenCandidates = useCaseCandidateNodes;

    this.logger?.addRecord(
      'add-new-auto-use-cases',
      useCaseNodes.map(n => n.text).join('|')
    );

    // Add an empty child to the end of the children list
    const emptyChild = createEmptyChild('use-case') as UseCaseNodeData;
    this.treeData.children.push(emptyChild);

    this.resetAndLayoutTree();
    await this.drawTree(this.tree);

    // Hide the summary loader
    this._updateLoader('summary-0', false);
  };

  /**
   * Use AI to generate stakeholders
   * @param nodeData The use case node data
   */
  generateAutoStakeholders = (nodeData: EnvisionTreeNodeData) => {
    // Call the LLM API to generate use cases
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    // Show the loader
    this._updateLoader(nodeData.id, true);
    this._disableAddButton(nodeData.id, true);

    const useCase = nodeData.text;
    const compiledPrompt = stakeholderPrompt.prompt
      .replace('{{functionality}}', this.summary)
      .replace('{{usecase}}', useCase);

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE) console.log('Skip text gen API call (stakeholder, cached)');
      window.setTimeout(
        () => {
          this.addAutoStakeholders(nodeData, response);
        },
        DEV_MODE ? MOCK_TIME_DELAY : RANDOM_DELAY()
      );
    } else {
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-stakeholder-${this
            .textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0,
          detail: nodeData.id
        }
      };
      if (stakeholderPrompt.stopSequences !== undefined) {
        message.payload.stopSequences = stakeholderPrompt.stopSequences;
      }
      this.textGenWorker.postMessage(message);
    }
  };

  /**
   * Add stakeholders as tree nodes and draw them
   * @param nodeData Use case node data
   * @param stakeholderResponse AI response of the stakeholders
   */
  addAutoStakeholders = async (
    nodeData: EnvisionTreeNodeData,
    stakeholderResponse: string
  ) => {
    if (this.treeData === null) throw Error('treeData is null');

    this._updateLoader(nodeData.id, false);
    this._disableAddButton(nodeData.id, false);

    const [stakeholderNodes, stakeholderCandidateNodes] =
      parseStakeholderResponse(stakeholderResponse);

    // Add stakeholder nodes to the current user case nodes in the treeData
    // We also need to re-initialize the tree structure to reflect the new
    // treeData, to show the children of the clicked use-case node.
    nodeData.children = stakeholderNodes;
    nodeData.childrenCandidates = stakeholderCandidateNodes;

    this.logger?.addRecord(
      'add-new-auto-stakeholders',
      stakeholderNodes.map(n => n.text).join('|')
    );

    // Add an empty child to the end of the children list
    const emptyChild = createEmptyChild('stakeholder') as StakeholderNodeData;
    nodeData.children.push(emptyChild);

    await this.showNodeChildren(nodeData, false);

    // Tell the parent panel component that the first use case is expanded
    // (for the tutorial dialogue)
    this.firstUseCaseExpanded();

    // Make API calls to generate related harms for each stakeholders
    const useCase = nodeData.text;

    for (const stakeholderNode of stakeholderNodes) {
      if (stakeholderNode.text !== '') {
        this.generateAutoHarms(stakeholderNode, useCase);
      }
    }
  };

  /**
   * Use AI to generate harms
   * @param nodeData The stakeholder node data
   * @param useCase The use case text
   */
  generateAutoHarms = (nodeData: EnvisionTreeNodeData, useCase: string) => {
    // Call the LLM API to generate harms
    if (this.apiKey === null) {
      throw Error('API Key is not set yet.');
    }

    // Show the loader
    this._updateLoader(nodeData.id, true);
    this._disableAddButton(nodeData.id, true);

    const compiledPrompt = harmPrompt.prompt
      .replace('{{functionality}}', this.summary)
      .replace('{{usecase}}', useCase)
      .replace('{{stakeholder}}', nodeData.text);

    // Check if we have already queried this item in the local storage cache
    // (Skip API calls during development)
    const response = USE_CACHE
      ? STORAGE.getItem(`<${REQUEST_NAME}>` + compiledPrompt)
      : null;

    if (response !== null) {
      // Time out to mock the API call delay
      if (DEV_MODE) console.log('Skip text gen API call (harm, cached)');
      window.setTimeout(
        () => {
          this.addAutoHarms(nodeData, response);
        },
        DEV_MODE
          ? d3.randomInt(800, 2000)()
          : config.layout.treeLayout.animationDuration
      );
    } else {
      const message: TextGenWorkerMessage = {
        command: 'startTextGen',
        payload: {
          apiKey: this.apiKey,
          requestID: `${REQUEST_NAME}-harm-${this.textGenWorkerRequestID++}`,
          prompt: compiledPrompt,
          temperature: 0,
          detail: nodeData.id
        }
      };
      if (harmPrompt.stopSequences !== undefined) {
        message.payload.stopSequences = harmPrompt.stopSequences;
      }
      this.textGenWorker.postMessage(message);
    }
  };

  /**
   * Add harms as tree nodes and draw them
   * @param nodeData Stakeholder node data
   * @param harmResponse AI response of the harms
   */
  addAutoHarms = (nodeData: EnvisionTreeNodeData, harmResponse: string) => {
    if (this.treeData === null) throw Error('treeData is null');

    const [harmNodes, harmCandidateNodes] = parseHarmResponse(
      harmResponse,
      nodeData as StakeholderNodeData
    );

    // Add harm nodes to the current stakeholder nodes in the treeData
    // We also need to re-initialize the tree structure to reflect the new
    // treeData, to show the children of the clicked use-case node.
    nodeData.children = harmNodes;
    nodeData.childrenCandidates = harmCandidateNodes;

    this.logger?.addRecord(
      'add-new-auto-harms',
      harmNodes.map(n => n.text).join('|')
    );

    // Add an empty child to the end of the children list
    const emptyChild = createEmptyChild('harm') as HarmNodeData;
    nodeData.children.push(emptyChild);

    // Stagger the drawing sequence because we are adding multiple harms from
    // different nodes at once
    if (this.drawFinished === null) {
      this.drawFinished = (async () => {
        this._updateLoader(nodeData.id, false);
        this._disableAddButton(nodeData.id, false);
        await this.showNodeChildren(nodeData, true);
      })();
    } else {
      this.drawFinished = this.drawFinished.then(async () => {
        this._updateLoader(nodeData.id, false);
        this._disableAddButton(nodeData.id, false);
        await this.showNodeChildren(nodeData, true);
      });
    }
  };

  /**
   * Update the loader associated with the given node
   * @param id Node id
   * @param show Show the loader if true
   */
  _updateLoader = (id: string, show: boolean) => {
    const loader = this.container
      .select(`div.node-group div.node-container-${id}`)
      .select('.loader')
      .attr('hidden', show ? null : 'true');

    if (loader.size() === 0) {
      throw Error('Fail to find loader for node ' + id);
    }
  };

  /**
   * Update the add button associated with the given node
   * @param id Node id
   * @param disable Disable the button if true
   */
  _disableAddButton = (id: string, disable: boolean) => {
    const node = this.container
      .select(`div.node-group div.node-container-${id} farsight-envision-node`)
      .attr('disableAddButton', disable ? 'true' : null);

    if (node.size() === 0) {
      throw Error('Fail to find loader for node ' + id);
    }
  };

  /**
   * Hide all descendants of the given tree node
   * @param d A tree node
   */
  hideNodeChildren = async (nodeData: EnvisionTreeNodeData) => {
    if (nodeData.children.length === 0 || !nodeData.showChildren) {
      return;
    }

    if (this.treeData === null) throw Error('treeData is null.');
    if (this.tree === null) throw Error('tree is null.');

    // Layout the tree under the condition that the node's children are removed
    nodeData.showChildren = false;
    this.resetAndLayoutTree();

    // Get the current node's PointNode in the current tree
    let triggerNode: d3.HierarchyPointNode<EnvisionTreeNodeData> | null = null;
    for (const node of this.tree.descendants()) {
      if (node.data.id === nodeData.id) {
        triggerNode = node;
      }
    }
    if (triggerNode === null)
      throw Error('Fail to find the right trigger node');

    // Redraw the tree to hide children
    await this.drawTree(triggerNode);
  };

  /**
   * Show all descendants of the given tree node
   * @param d A tree node
   * @param shouldWaitAnimation True to wait until animation finishes
   */
  showNodeChildren = async (
    nodeData: EnvisionTreeNodeData,
    shouldWaitAnimation: boolean
  ) => {
    if (nodeData.children.length === 0 || nodeData.showChildren) {
      // console.error('Try to show a node with no children or is shown already.');
      return;
    }

    if (this.treeData === null) throw Error('treeData is null.');
    if (this.tree === null) throw Error('tree is null.');

    // Layout the tree under the condition that the node's children are added
    nodeData.showChildren = true;
    this.resetAndLayoutTree();

    // Get the current node's d3 PointNode in the current tree
    let triggerNode: d3.HierarchyPointNode<EnvisionTreeNodeData> | null = null;
    for (const node of this.tree.descendants()) {
      if (node.data.id === nodeData.id) {
        triggerNode = node;
      }
    }
    if (triggerNode === null)
      throw Error('Fail to find the right trigger node');

    let drawTreeResolve = () => {};
    const drawTreeFinished = new Promise<void>(resolve => {
      drawTreeResolve = resolve;
    });
    const drawTreeStarted = this.drawTree(triggerNode, drawTreeResolve);

    if (shouldWaitAnimation) {
      // Wait until the animation finishes
      await drawTreeFinished;
    } else {
      // Wait until the drawing command is executed
      await drawTreeStarted;
    }
  };

  /**
   * Reset the tree from tree data and layout the tree
   */
  resetAndLayoutTree = () => {
    if (this.treeData === null) throw Error('treeData is not set yet.');
    this.tree = this.treeLayout(
      d3.hierarchy(this.treeData, d => (d.showChildren ? d.children : []))
    );

    // Update the footer statistics every time we reset the tree
    this.dispatchStatUpdate();
  };

  /**
   * Event handler for the zooming event
   * @param e Zoom event
   */
  zoomed = (e: d3.D3ZoomEvent<HTMLElement, unknown>) => {
    this.curTransform = e.transform;

    // Transform the DIV container
    this.container.style(
      'transform',
      `translate(${this.curTransform.x}px, ${this.curTransform.y}px) scale(${this.curTransform.k})`
    );

    // Transform the background SVG pattern to create an infinite zooming illusion
    const scaledGap = GRID_GAP * this.curTransform.k;
    const pattern = this.backgroundSVG.select('pattern#grid-pattern');
    pattern
      .attr('x', this.curTransform.x % scaledGap)
      .attr('y', this.curTransform.y % scaledGap)
      .attr('width', scaledGap)
      .attr('height', scaledGap)
      .select('circle')
      .attr('r', GRID_CIRCLE_RADIUS * this.curTransform.k);
  };

  /**
   * Helper function to route different web worker messages
   * @param e Web worker message event
   */
  textGenWorkerMessageHandler = (e: MessageEvent<TextGenWorkerMessage>) => {
    switch (e.data.command) {
      case 'finishTextGen': {
        const requestID = e.data.payload.requestID;
        if (requestID.includes(REQUEST_NAME)) {
          if (requestID.includes('use-case')) {
            // === Use case response ===
            const useCaseResponse = e.data.payload.result;
            this.addAutoUseCases(useCaseResponse);

            // Save the API response in the local storage cache
            if (USE_CACHE) {
              const prompt = e.data.payload.prompt;
              STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, useCaseResponse);
            }
          } else if (requestID.includes('stakeholder')) {
            // === Stakeholder response ===
            const stakeholderResponse = e.data.payload.result;
            const nodeDataID = e.data.payload.detail;
            const [nodeData, _] = this._getNodeData(nodeDataID);
            this.addAutoStakeholders(nodeData, stakeholderResponse);

            // Save the API response in the local storage cache
            if (USE_CACHE) {
              const prompt = e.data.payload.prompt;
              STORAGE.setItem(
                `<${REQUEST_NAME}>` + prompt,
                stakeholderResponse
              );
            }
          } else if (requestID.includes('harm')) {
            // === harm response ===
            const harmResponse = e.data.payload.result;
            const nodeDataID = e.data.payload.detail;
            const [nodeData, _] = this._getNodeData(nodeDataID);
            this.addAutoHarms(nodeData, harmResponse);

            // Save the API response in the local storage cache
            if (USE_CACHE) {
              const prompt = e.data.payload.prompt;
              STORAGE.setItem(`<${REQUEST_NAME}>` + prompt, harmResponse);
            }
          } else {
            console.warn(
              'Received unknown response: ',
              requestID,
              e.data.payload.result
            );
          }
        }
        break;
      }

      case 'error': {
        // Error handling for the LLM API calls
        break;
      }

      default: {
        console.error('Worker: unknown message', e.data.command);
        break;
      }
    }
  };

  /**
   * Get the current viewing zoom box
   * @returns Current zoom box
   */
  getCurViewingZoomBox = () => {
    const box: Rect = {
      x: this.curTransform.invertX(0),
      y: this.curTransform.invertY(0),
      width: Math.abs(
        this.curTransform.invertX(this.paneSize.width) -
          this.curTransform.invertX(0)
      ),
      height: Math.abs(
        this.curTransform.invertY(this.paneSize.height) -
          this.curTransform.invertY(0)
      )
    };
    return box;
  };

  /**
   * Automatically zoom into the view center
   */
  zoomIn = () => {
    const zoomBox = this.getCurViewingZoomBox();
    const centerX = zoomBox.x + zoomBox.width / 2;
    const centerY = zoomBox.y + zoomBox.height / 2;

    const transform = d3.zoomIdentity
      .translate(this.paneSize.width / 2, this.paneSize.height / 2)
      .scale(Math.min(2, this.curTransform.k * 1.2))
      .translate(-centerX, -centerY);

    this.pane
      .transition()
      .duration(300)
      .call(selection => {
        this.zoom!.transform(selection, transform);
      });
  };

  /**
   * Automatically zoom out of the view center
   */
  zoomOut = () => {
    const zoomBox = this.getCurViewingZoomBox();
    const centerX = zoomBox.x + zoomBox.width / 2;
    const centerY = zoomBox.y + zoomBox.height / 2;

    const transform = d3.zoomIdentity
      .translate(this.paneSize.width / 2, this.paneSize.height / 2)
      .scale(Math.max(0.5, this.curTransform.k * 0.83))
      .translate(-centerX, -centerY);

    this.pane
      .transition()
      .duration(300)
      .call(selection => {
        this.zoom!.transform(selection, transform);
      });
  };

  /**
   * Reset the current zoom transform
   */
  zoomReset = () => {
    this.pane
      .transition('reset')
      .duration(300)
      .ease(d3.easeCubicInOut)
      .call(selection => {
        this.zoom!.transform(selection, d3.zoomIdentity);
      });
  };
}

/**
 * Parse content inside an XML tag
 * @param text LLM response text
 * @param tag XML tag to parse
 * @returns A list of content in the parsed tags
 */
export const parseTags = (text: string, tag: string) => {
  const regex = new RegExp(`<${tag}>\\s*(.*)\\s*</${tag}>`, 'g');
  const matches = text.match(regex) || [];
  return matches.map(match => match.replace(regex, '$1'));
};

/**
 * Create a new node data with empty content
 * @param type Node type
 * @returns New and empty node data
 */
export const createEmptyChild = (
  type: 'use-case' | 'stakeholder' | 'harmSummary' | 'harm'
) => {
  switch (type) {
    case 'use-case': {
      const emptyChild: UseCaseNodeData = {
        text: '',
        type: 'use-case',
        children: [],
        childrenCandidates: [],
        category: UseCaseCategories.INTENDED,
        id: `use-case-${nodeTypeCounter.useCase++}`,
        showChildren: false
      };
      return emptyChild;
    }

    case 'stakeholder': {
      const emptyChild: StakeholderNodeData = {
        text: '',
        type: 'stakeholder',
        children: [],
        childrenCandidates: [],
        category: StakeholderCategory.DIRECT,
        id: `stakeholder-${nodeTypeCounter.stakeholder++}`,
        showChildren: false,
        relevance: 1
      };
      return emptyChild;
    }

    case 'harmSummary': {
      const emptyChild: HarmNodeSummaryData = {
        text: '',
        type: 'harm-summary',
        children: [],
        childrenCandidates: [],
        category: null,
        id: `harm-summary-${nodeTypeCounter.harmSummary++}`,
        showChildren: false,
        parent: null,
        // Set the default to an arbitrarily large number
        preLayerHeight: 5000
      };
      return emptyChild;
    }

    case 'harm': {
      const emptyChild: HarmNodeData = {
        text: '',
        type: 'harm',
        children: [],
        childrenCandidates: [],
        category: SubHarmCategory.ECONOMIC,
        id: `harm-${nodeTypeCounter.harm++}`,
        showChildren: false,
        severity: 1,
        userRatedSeverity: 0,
        validated: false
      };

      // Choose a random category for the empty child
      const randomIndex = d3.randomInt(0, harmThemeCategoryList.length)();
      const randomHarmCategory = harmThemeCategoryList[
        randomIndex
      ][0] as SubHarmCategory;
      emptyChild.category = randomHarmCategory;

      return emptyChild;
    }

    default: {
      throw Error('Unknown type, ', type);
    }
  }
};

/**
 * Parse the use cases and their categories from an LLM response
 * @param response Response string from an LLM
 * @returns Two arrays. The first array includes top K use cases of each category.
 *  The second array includes all use cases.
 */
export const parseUseCaseResponse = (response: string) => {
  const tagCategoryMap = new Map<string, UseCaseCategories>();
  tagCategoryMap.set('intended', UseCaseCategories.INTENDED);
  tagCategoryMap.set('highstakes', UseCaseCategories.HIGH_STAKES);
  tagCategoryMap.set('misuse', UseCaseCategories.MISUSE);

  // Track the number of use cases per category
  const useCaseCount = new Map<UseCaseCategories, number>();
  useCaseCount.set(UseCaseCategories.INTENDED, 0);
  useCaseCount.set(UseCaseCategories.HIGH_STAKES, 0);
  useCaseCount.set(UseCaseCategories.MISUSE, 0);

  const useCaseNodes: UseCaseNodeData[] = [];
  const useCaseCandidateNodes: UseCaseNodeData[] = [];

  // Iterate over different tag keywords
  for (const tag of tagCategoryMap.keys()) {
    const items = parseTags(response, tag);
    const curCategory = tagCategoryMap.get(tag)!;

    // Iterate over different tag contents
    for (const item of items) {
      // Some more validation (sometimes the model would output
      // <intended><intended> xxx </intended>)
      const itemCleaned = item.replace(/<.+?>/g, '');
      const curCount = useCaseCount.get(curCategory)!;
      const curNode = createEmptyChild('use-case') as UseCaseNodeData;
      curNode.category = curCategory;
      curNode.text = itemCleaned;
      useCaseCandidateNodes.push(curNode);

      if (curCount < USE_CASE_CAT_MAX) {
        useCaseNodes.push(curNode);
        useCaseCount.set(curCategory, curCount + 1);
      }
    }
  }
  return [useCaseNodes, useCaseCandidateNodes];
};

/**
 * Parse the stakeholders and their categories from an LLM response
 * @param response Response string from an LLM
 * @returns Two arrays. The first array includes top K stakeholders of each category.
 *  The second array includes all stakeholders.
 */
export const parseStakeholderResponse = (response: string) => {
  const tagCategoryMap = new Map<string, StakeholderCategory>();
  tagCategoryMap.set('direct', StakeholderCategory.DIRECT);
  tagCategoryMap.set('indirect', StakeholderCategory.INDIRECT);

  const relevanceMap = new Map<string, number>();
  relevanceMap.set('relevant', 1);
  relevanceMap.set('very relevant', 2);

  // Track the number of stakeholders per category
  const stakeholderCount = new Map<StakeholderCategory, number>();
  stakeholderCount.set(StakeholderCategory.DIRECT, 0);
  stakeholderCount.set(StakeholderCategory.INDIRECT, 0);

  const stakeholderNodes: StakeholderNodeData[] = [];
  const stakeholderCandidateNodes: StakeholderNodeData[] = [];

  // Parse the XML response into a Document
  const wrappedXML = `${response}</stakeholders>`;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(wrappedXML, 'application/xml');
  const stakeholderDocNodes = xmlDoc.querySelectorAll('stakeholder');

  for (const stakeholderDocNode of stakeholderDocNodes) {
    const name = stakeholderDocNode.innerHTML;
    const typeString = stakeholderDocNode.getAttribute('type');
    let curCategory = typeString ? tagCategoryMap.get(typeString) : undefined;
    const relevanceString = stakeholderDocNode.getAttribute('relevance');
    let relevance = relevanceString
      ? relevanceMap.get(relevanceString)
      : undefined;

    // Handle invalid XML attributes
    if (curCategory === undefined) {
      console.warn('Failed to parse stakeholder type from, ', wrappedXML);
      curCategory = StakeholderCategory.DIRECT;
    }

    if (relevance === undefined) {
      console.warn('Failed to parse stakeholder relevance from, ', wrappedXML);
      relevance = 1;
    }

    if (name == undefined) {
      console.warn('Failed to parse stakeholder name from, ', wrappedXML);
      continue;
    }

    const curCount = stakeholderCount.get(curCategory)!;
    const curNode = createEmptyChild('stakeholder') as StakeholderNodeData;
    curNode.text = name;
    curNode.category = curCategory;
    curNode.relevance = relevance;
    stakeholderCandidateNodes.push(curNode);

    // We add DIRECT_STAKEHOLDER_CAT_MAX direct stakeholders regardless of its
    // relevance, and we only add very relevant indirect stakeholders in the first
    // round
    if (
      curCategory === StakeholderCategory.DIRECT &&
      curCount < DIRECT_STAKEHOLDER_CAT_MAX
    ) {
      stakeholderNodes.push(curNode);
      stakeholderCount.set(curCategory, curCount + 1);
    } else if (
      curCategory === StakeholderCategory.INDIRECT &&
      relevance === 2
    ) {
      stakeholderNodes.push(curNode);
      stakeholderCount.set(curCategory, curCount + 1);
    }
  }

  // Add relevant indirect stakeholder (relevance = 1) if there is still space
  stakeholderCandidateNodes
    .filter(d => d.category === StakeholderCategory.INDIRECT)
    .forEach(d => {
      const curCount = stakeholderCount.get(StakeholderCategory.INDIRECT)!;
      if (d.relevance === 1 && curCount < INDIRECT_STAKEHOLDER_CAT_MAX) {
        stakeholderNodes.push(d);
        stakeholderCount.set(StakeholderCategory.INDIRECT, curCount + 1);
      }
    });

  // Iterate over different tag keywords
  for (const tag of tagCategoryMap.keys()) {
    const items = parseTags(response, tag);
    const curCategory = tagCategoryMap.get(tag)!;

    // Iterate over different tag contents
    for (const item of items) {
      const curCount = stakeholderCount.get(curCategory)!;
      const curNode = createEmptyChild('stakeholder') as StakeholderNodeData;
      curNode.text = item;
      curNode.category = curCategory;
      stakeholderCandidateNodes.push(curNode);

      if (
        curCount <
        (curCategory === StakeholderCategory.DIRECT
          ? DIRECT_STAKEHOLDER_CAT_MAX
          : INDIRECT_STAKEHOLDER_CAT_MAX)
      ) {
        stakeholderNodes.push(curNode);
        stakeholderCount.set(curCategory, curCount + 1);
      }
    }
  }
  return [stakeholderNodes, stakeholderCandidateNodes];
};

/**
 * Parse the harms and their categories and severity from an LLM response
 * @param response Response string from an LLM
 * @param nodeData Stakeholder node data
 * @returns Two arrays. The first array includes top K harms of each category.
 *  The second array includes all harms.
 */
export const parseHarmResponse = (
  response: string,
  nodeData: StakeholderNodeData
) => {
  const severityMap = new Map<string, number>();
  severityMap.set('not severe', 1);
  severityMap.set('severe', 2);
  severityMap.set('very severe', 3);

  // Parse the XML response into a Document
  const wrappedXML = `<response>${response}</response>`;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(wrappedXML, 'application/xml');
  const harmDocNodes = xmlDoc.querySelectorAll('harm');

  const harmNodes: HarmNodeData[] = [];
  const harmCandidateNodes: HarmNodeData[] = [];

  for (const harmDocNode of harmDocNodes) {
    const typeString = harmDocNode
      .querySelector('type')
      ?.innerHTML?.toLowerCase();
    let type = typeString ? subHarmStringMap.get(typeString) : undefined;
    const severityString = harmDocNode.querySelector('severity')?.innerHTML;
    let severity = severityString ? severityMap.get(severityString) : undefined;
    const explain = harmDocNode.querySelector('explain')?.innerHTML;

    if (type === undefined) {
      let mostSimilarType = SubHarmCategory.ECONOMIC;

      if (typeString) {
        // Fuzzy search through all existing keys and choose the most similar one
        let maxNumCommonWords = -Infinity;
        for (const key of subHarmStringMap.keys()) {
          const numCommonWords = getNumCommonWords(key, typeString);
          if (numCommonWords > maxNumCommonWords) {
            maxNumCommonWords = numCommonWords;
            mostSimilarType = subHarmStringMap.get(key)!;
          }
        }
      }

      type = mostSimilarType;
      console.warn(
        `Failed to parse type from harm XML. Replaced "${typeString}" with "${type}"`
      );
    }

    if (severity === undefined) {
      console.warn(
        'Failed to parse severity from harm XML: ',
        severityString,
        severity
      );
      severity = 2;
    }

    if (explain === undefined) {
      console.warn('Failed to parse explain from harm XML: ', wrappedXML);
      continue;
    }

    // Simple validation for the response to filter out the occasional non-sense
    // generations: check if there is overlap between the stakeholder and the
    // phrase before 'may...' in the response
    let validated = false;
    if (explain.includes('may')) {
      const phrases = explain.toLowerCase().split(' ');
      const mayIndex = phrases.findIndex(d => d === 'may');
      const stakeholderPhraseArray = nodeData.text.toLowerCase().split(' ');
      const stakeholderPhrases = new Set<string>();
      for (const phrase of stakeholderPhraseArray) {
        stakeholderPhrases.add(phrase);
        stakeholderPhrases.add(phrase.slice(0, phrase.length - 1) + 'ies');
        stakeholderPhrases.add(phrase + 's');
        stakeholderPhrases.add(phrase + 'es');
      }
      for (const phrase of phrases.slice(0, mayIndex)) {
        if (stakeholderPhrases.has(phrase)) {
          validated = true;
          break;
        }
      }
    }

    const curNode = createEmptyChild('harm') as HarmNodeData;
    curNode.text = explain;
    curNode.category = type;
    curNode.severity = severity;
    curNode.validated = validated;
    harmCandidateNodes.push(curNode);

    if (!validated) {
      console.warn(explain, nodeData.text);
    }

    // Selectively choose harm node into the initial batch
    // (1) We always show the very-severe nodes if there is space
    if (
      curNode.severity === 3 &&
      harmNodes.length < HARM_CAT_MAX &&
      validated
    ) {
      harmNodes.push(curNode);
    }
  }

  // (2) We show one validated severe node if there is no very-severe nodes
  if (harmNodes.length === 0) {
    for (const curNode of harmCandidateNodes) {
      if (curNode.severity === 2 && curNode.validated) {
        harmNodes.push(curNode);
        break;
      }
    }
  }

  // (3) We show one not-severe validated node if there is no very-severe /
  // severe node
  if (harmNodes.length === 0) {
    for (const curNode of harmCandidateNodes) {
      if (curNode.severity === 1 && curNode.validated) {
        harmNodes.push(curNode);
        break;
      }
    }
  }

  return [harmNodes, harmCandidateNodes];
};
