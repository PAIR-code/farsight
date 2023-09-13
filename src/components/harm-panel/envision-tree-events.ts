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
import { EnvisionTree, createEmptyChild } from './envision-tree';
import {
  EnvisionTreeNodeEventDetail,
  EnvisionTreeNodeData,
  SummaryNodeData,
  UseCaseNodeData,
  StakeholderNodeData,
  HarmNodeData,
  subHarmCategoryMap
} from './harm-types';
import { getDefaultFooterInfo } from '../footer/footer';
import {
  UseCaseCategories,
  StakeholderCategory,
  HarmCategory
} from './harm-types';
import type { DialogInfo } from '../confirm-dialog/confirm-dialog';

const DEV_MODE = import.meta.env.MODE === 'development';
const USE_CACHE = import.meta.env.MODE !== 'x20';

/**
 * Event handler when user clicks a tree node
 * @param this Envision tree object
 * @param e Mouse click event
 */
export function handleNodeClick(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, _] = this._getNodeData(detail.id);
  this.logger?.addRecord('nodeClicked', detail.text);

  // The function calls depend on the type of the clicked node
  switch (nodeData.type) {
    case 'summary': {
      // There are three cases
      // Case (1) this node has no children yet => do nothing
      if (nodeData.children.length === 0) {
        break;
      }

      if (nodeData.showChildren) {
        // Case (2) this node has children shown => hide the children
        this.hideNodeChildren(nodeData);
      } else {
        // Case (3) this node has children hidden => show the children
        this.showNodeChildren(nodeData, false);
      }
      break;
    }

    case 'use-case': {
      // There are three cases
      // Case (1) this node has no children yet => do nothing
      if (nodeData.children.length === 0) {
        break;
      }

      if (nodeData.showChildren) {
        // Case (2) this node has children shown => hide the children
        this.hideNodeChildren(nodeData);
      } else {
        // Case (3) this node has children hidden => show the children
        this.showNodeChildren(nodeData, false);
      }

      break;
    }

    case 'stakeholder': {
      // There are three cases
      // Case (1) this node has no children yet => do nothing
      if (nodeData.children.length === 0) {
        break;
      }

      if (nodeData.showChildren) {
        // Case (2) this node has children shown => hide the children
        this.hideNodeChildren(nodeData);
      } else {
        // Case (3) this node has children hidden => show the children
        this.showNodeChildren(nodeData, false);
      }

      break;
    }

    case 'harm': {
      break;
    }

    default: {
      throw Error(`Unknown node type, ${nodeData.type}`);
    }
  }
}

/**
 * Event handler when user clicks a tree node
 * @param this Envision tree object
 * @param e Mouse click event
 */
export async function handleTextChanged(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, treeNode] = this._getNodeData(detail.id);
  const oldText = nodeData.text;
  this.logger?.addLog(
    'textChanged',
    nodeData.id,
    'nodeText',
    oldText,
    detail.text
  );

  // Update the node data with new text
  nodeData.text = detail.text;

  // Request a redraw as the node height could change
  await this.drawTree(null);

  // Check if this node is the last empty node being filled
  if (oldText === '' && detail.text !== '') {
    const parentNode = treeNode.parent;

    if (parentNode && parentNode.children) {
      const hasOtherEmptyNode = parentNode.children.some(
        d => d.data.id !== nodeData.id && d.data.text === ''
      );

      if (!hasOtherEmptyNode) {
        // Add a new node if there is no more empty node
        const newDetail: EnvisionTreeNodeEventDetail = {
          userRatedHarmSeverity: 1,
          id: parentNode.data.id,
          originalEvent: detail.originalEvent,
          text: parentNode.data.text,
          type: parentNode.data.type
        };
        this.handleAddClicked(e, newDetail);
      }
    }
  }
}

export function handleAddClicked(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, node] = this._getNodeData(detail.id);

  // The function calls depend on the type of the clicked node
  switch (nodeData.type) {
    case 'summary': {
      const d = nodeData as SummaryNodeData;
      // There are two cases
      if (node.children === undefined) {
        // Case 1: the node has hidden children => show the children
        this.showNodeChildren(nodeData, false);
        this.logger?.addRecord('show-children', nodeData.id);
      } else {
        // Case 2: the node has shown children => add an empty child
        const emptyChild = createEmptyChild('use-case') as UseCaseNodeData;
        d.children.push(emptyChild);

        this.resetAndLayoutTree();
        this.drawTree(node);
        this.logger?.addRecord('add-child', nodeData.id);
      }
      break;
    }

    case 'use-case': {
      const d = nodeData as UseCaseNodeData;
      // There are three cases
      if (nodeData.childrenCandidates.length === 0) {
        // Case 1: the node has no children => auto generate children
        this.generateAutoStakeholders(d);
        this.logger?.addRecord('generate-children', nodeData.id);
      } else if (node.children !== undefined) {
        // Case 2: this node has shown children => add an empty child
        const emptyChild = createEmptyChild(
          'stakeholder'
        ) as StakeholderNodeData;
        d.children.push(emptyChild);

        this.resetAndLayoutTree();
        this.drawTree(node);
        this.logger?.addRecord('add-child', nodeData.id);
      } else {
        // Case 3: this node has hidden children => show all the children
        this.showNodeChildren(nodeData, false);
        this.logger?.addRecord('show-children', nodeData.id);
      }
      break;
    }

    case 'stakeholder': {
      const d = nodeData as StakeholderNodeData;
      // There are three cases
      if (nodeData.childrenCandidates.length === 0) {
        // Case 1: this node has no children => auto generate children
        const parentNode = node.parent;
        if (parentNode) {
          this.generateAutoHarms(d, parentNode.data.text);
          this.logger?.addRecord('generate-children', nodeData.id);
        }
      } else {
        if (node.children !== undefined) {
          // Case 2: this node has shown children => add an empty child
          const emptyChild = createEmptyChild('harm') as HarmNodeData;
          d.children.push(emptyChild);

          this.resetAndLayoutTree();
          this.drawTree(node);
          this.logger?.addRecord('add-child', nodeData.id);
        } else {
          // Case 3: this node has hidden children => show all the children
          this.showNodeChildren(nodeData, false);
          this.logger?.addRecord('show-children', nodeData.id);
        }
      }

      break;
    }

    case 'harm': {
      break;
    }

    default: {
      throw Error(`Unknown node type, ${nodeData.type}`);
    }
  }
}

export function handleDeleteClicked(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, node] = this._getNodeData(detail.id);
  this.logger?.addRecord('delete-child', `${nodeData.id}|${nodeData.text}`);

  // The function calls depend on the type of the clicked node
  switch (nodeData.type) {
    case 'summary': {
      break;
    }

    case 'use-case': {
      const d = nodeData as UseCaseNodeData;

      // Wrap the deletion logic into a callback for the dialog confirmation
      // There are three cases
      const deleteNode = () => {
        const parentNode = node.parent;
        if (parentNode) {
          // Mark this property to have a different exit animation
          nodeData.deleted = true;

          // Also mark all their children as being deleted
          node.each(n => {
            n.data.deleted = true;
          });

          // Delete this node from the parent
          const curNodeIndex = (
            parentNode.data.children as UseCaseNodeData[]
          ).indexOf(d);
          parentNode.data.children.splice(curNodeIndex, 1);
          this.resetAndLayoutTree();
          this.drawTree(parentNode);
        }
      };

      const dialogInfo: DialogInfo = {
        header: 'Delete Use Case?',
        message: 'Are you sure you want to delete this use case? ',
        yesButtonText: 'Delete',
        confirmAction: deleteNode,
        actionKey: 'deletion',
        show: true
      };

      if (d.children.length !== 0) {
        dialogInfo.message +=
          'It will also delete its stakeholders and harms. This action cannot be undone.';
      } else {
        dialogInfo.message += 'This action cannot be undone.';
      }

      this.showDialog(dialogInfo);
      break;
    }

    case 'stakeholder': {
      const d = nodeData as StakeholderNodeData;

      // Wrap the deletion logic into a callback for the dialog confirmation
      // There are three cases
      const deleteNode = () => {
        const parentNode = node.parent;
        if (parentNode) {
          // Mark this property to have a different exit animation
          nodeData.deleted = true;

          // Also mark all their children as being deleted
          node.each(n => {
            n.data.deleted = true;
          });

          // Delete this node from the parent
          const curNodeIndex = (
            parentNode.data.children as StakeholderNodeData[]
          ).indexOf(d);
          parentNode.data.children.splice(curNodeIndex, 1);
          this.resetAndLayoutTree();
          this.drawTree(parentNode);
        }
      };

      const dialogInfo: DialogInfo = {
        header: 'Delete Stakeholder?',
        message: 'Are you sure you want to delete this stakeholder? ',
        yesButtonText: 'Delete',
        confirmAction: deleteNode,
        actionKey: 'deletion',
        show: true
      };

      if (d.children.length !== 0) {
        dialogInfo.message +=
          'It will also delete its harms. This action cannot be undone.';
      } else {
        dialogInfo.message += 'This action cannot be undone.';
      }

      this.showDialog(dialogInfo);
      break;
    }

    case 'harm': {
      const d = nodeData as HarmNodeData;

      // Wrap the deletion logic into a callback for the dialog confirmation
      // There are three cases
      const deleteNode = () => {
        const parentNode = node.parent;
        if (parentNode) {
          // Mark this property to have a different exit animation
          nodeData.deleted = true;

          // Also mark all their children as being deleted
          node.each(n => {
            n.data.deleted = true;
          });

          // Delete this node from the parent
          const curNodeIndex = (
            parentNode.data.children as HarmNodeData[]
          ).indexOf(d);
          parentNode.data.children.splice(curNodeIndex, 1);
          this.resetAndLayoutTree();
          this.drawTree(parentNode);
        }
      };

      const dialogInfo: DialogInfo = {
        header: 'Delete Harm?',
        message:
          'Are you sure you want to delete this harm? This action cannot be undone.',
        yesButtonText: 'Delete',
        confirmAction: deleteNode,
        actionKey: 'deletion',
        show: true
      };

      this.showDialog(dialogInfo);
      break;
    }

    default: {
      throw Error(`Unknown node type, ${nodeData.type}`);
    }
  }
}

export function handleRefreshClicked(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, node] = this._getNodeData(detail.id);
  const parentNode = node.parent;

  const swapContentToRandomCandidate = (d: EnvisionTreeNodeData) => {
    const nodeSelection = this.pane
      .select(`.node-container-${d.id}`)
      .select('farsight-envision-node');

    // Find candidates that are not shown yet
    const shownTexts = new Set<string>();
    parentNode?.data.children.forEach(c => {
      shownTexts.add(c.text);
    });

    const notShownCandidates: EnvisionTreeNodeData[] = [];
    parentNode?.data.childrenCandidates.forEach(c => {
      if (!shownTexts.has(c.text)) {
        notShownCandidates.push(c);
      }
    });

    // Repeat the first node if there is no more candidates left
    // This can be improved by providing users a clear error message
    let newNode: EnvisionTreeNodeData = parentNode!.data.childrenCandidates[0];

    // Randomly choose a candidate to show
    if (notShownCandidates.length > 0) {
      const randomIndex = d3.randomInt(notShownCandidates.length)();
      newNode = notShownCandidates[randomIndex];
    }

    this.logger?.addLog(
      'refresh-node',
      d.id,
      'node-text',
      d.text,
      newNode.text
    );

    // Update the node info
    d.text = newNode.text;
    d.category = newNode.category;

    if (d.type === 'harm') {
      const dHarm = d as HarmNodeData;
      dHarm.severity = (newNode as HarmNodeData).severity;
      nodeSelection.attr('harmSeverity', dHarm.severity);
    }

    nodeSelection.attr('nodeCategory', d.category);
    nodeSelection.attr('nodeText', d.text);

    // Stop showing the loader
    if (detail.endHandler) {
      detail.endHandler();
    }

    this.resetAndLayoutTree();
    return this.drawTree(parentNode);
  };

  const addNewEmptyNode = (
    node: d3.HierarchyPointNode<EnvisionTreeNodeData>
  ) => {
    const parentNode = node.parent;
    if (parentNode && parentNode.children) {
      const hasOtherEmptyNode = parentNode.children.some(
        d => d.data.id !== nodeData.id && d.data.text === ''
      );

      if (!hasOtherEmptyNode) {
        // Add a new node if there is no more empty node
        const newDetail: EnvisionTreeNodeEventDetail = {
          userRatedHarmSeverity: 1,
          id: parentNode.data.id,
          originalEvent: detail.originalEvent,
          text: parentNode.data.text,
          type: parentNode.data.type
        };
        this.handleAddClicked(e, newDetail);
      }
    }
  };

  // The function calls depend on the type of the clicked node
  switch (nodeData.type) {
    case 'summary': {
      break;
    }

    case 'use-case': {
      const d = nodeData as UseCaseNodeData;
      const refreshNode = () => {
        // Start showing the loader
        if (detail.startHandler) {
          detail.startHandler();
        }

        // Delete its all children
        // Use slice(1) to avoid the node itself
        node
          .descendants()
          .slice(1)
          .forEach(c => {
            c.data.deleted = true;
          });
        d.children = [];
        d.childrenCandidates = [];
        d.showChildren = false;

        this.resetAndLayoutTree();
        this.drawTree(parentNode).then(() => {
          window.setTimeout(() => {
            swapContentToRandomCandidate(d).then(() => {
              addNewEmptyNode(node);
            });
          }, 800);
        });
      };

      const dialogInfo: DialogInfo = {
        header: 'Regenerate Use Case?',
        message: 'Are you sure you want to regenerate this use case? ',
        yesButtonText: 'Regenerate',
        confirmAction: refreshNode,
        actionKey: 'regenerate',
        show: true
      };

      if (d.children.length !== 0) {
        dialogInfo.message +=
          'It will also delete its stakeholders and harms. This action cannot be undone.';
      } else {
        dialogInfo.message += 'This action cannot be undone.';
      }

      // If this node is an empty node, we can skip the confirmation
      if (d.text === '') {
        refreshNode();
      } else {
        this.showDialog(dialogInfo);
      }
      break;
    }

    case 'stakeholder': {
      const d = nodeData as UseCaseNodeData;

      const refreshNode = () => {
        // Start showing the loader
        if (detail.startHandler) {
          detail.startHandler();
        }

        // Delete its all children
        // Use slice(1) to avoid the node itself
        node
          .descendants()
          .slice(1)
          .forEach(c => {
            c.data.deleted = true;
          });
        d.children = [];
        d.childrenCandidates = [];
        d.showChildren = false;

        this.resetAndLayoutTree();
        this.drawTree(parentNode).then(() => {
          window.setTimeout(() => {
            swapContentToRandomCandidate(d).then(() => {
              // Generate harm for this new node
              if (parentNode) {
                this.generateAutoHarms(d, parentNode.data.text);
                addNewEmptyNode(node);
              }
            });
          }, 800);
        });
      };

      const dialogInfo: DialogInfo = {
        header: 'Regenerate Stakeholder?',
        message: 'Are you sure you want to regenerate this stakeholder? ',
        yesButtonText: 'Regenerate',
        confirmAction: refreshNode,
        actionKey: 'regenerate',
        show: true
      };

      if (d.children.length !== 0) {
        dialogInfo.message +=
          'It will also delete its harms. This action cannot be undone.';
      } else {
        dialogInfo.message += 'This action cannot be undone.';
      }

      // If this node is an empty node, we can skip the confirmation
      if (d.text === '') {
        refreshNode();
      } else {
        this.showDialog(dialogInfo);
      }
      break;
    }

    case 'harm': {
      const d = nodeData as UseCaseNodeData;

      const refreshNode = () => {
        // Start showing the loader
        if (detail.startHandler) {
          detail.startHandler();
        }

        this.resetAndLayoutTree();
        this.drawTree(parentNode).then(() => {
          window.setTimeout(() => {
            swapContentToRandomCandidate(d).then(() => {
              addNewEmptyNode(node);
            });
          }, 800);
        });
      };

      const dialogInfo: DialogInfo = {
        header: 'Regenerate Harm?',
        message:
          'Are you sure you want to regenerate this harm? This action cannot be undone.',
        yesButtonText: 'Regenerate',
        confirmAction: refreshNode,
        actionKey: 'regenerate',
        show: true
      };

      // If this node is an empty node, we can skip the confirmation
      if (d.text === '') {
        refreshNode();
      } else {
        this.showDialog(dialogInfo);
      }
      break;
    }

    default: {
      throw Error(`Unknown node type, ${nodeData.type}`);
    }
  }
}

export function handleRegenerateChildrenClicked(
  this: EnvisionTree,
  e: Event,
  detail: EnvisionTreeNodeEventDetail
) {
  e.stopPropagation();
  e.preventDefault();

  const [nodeData, node] = this._getNodeData(detail.id);
  this.logger?.addRecord(
    'regenerate-children',
    `${nodeData.id}|${nodeData.text}|${nodeData.children
      .map(c => c.text)
      .join('|')}`
  );

  // The function calls depend on the type of the clicked node
  switch (nodeData.type) {
    case 'summary': {
      break;
    }

    case 'use-case': {
      const d = nodeData as UseCaseNodeData;

      // Wrap the regeneration logic into a callback for the dialog confirmation
      // There are three cases
      const regenerateChildren = () => {
        const parentNode = node.parent;
        if (parentNode) {
          // Mark all children as being deleted
          node.each(n => {
            n.data.deleted = true;
          });

          // Delete all children and candidates
          d.children = [];
          d.childrenCandidates = [];
          d.showChildren = false;

          this.resetAndLayoutTree();
          this.drawTree(parentNode).then(() => {
            this.generateAutoStakeholders(d);
          });
        }
      };

      const dialogInfo: DialogInfo = {
        header: 'Regenerate Stakeholder Suggestions?',
        message:
          "Are you sure you want to regenerate this use case's stakeholder suggestions? ",
        yesButtonText: 'Regenerate',
        confirmAction: regenerateChildren,
        actionKey: 'regenerate-children',
        show: true
      };

      if (d.children.length !== 0) {
        dialogInfo.message +=
          'It will delete existing stakeholders and their harms. This action cannot be undone.';
      } else {
        dialogInfo.message +=
          'It will delete existing stakeholders. This action cannot be undone.';
      }

      this.showDialog(dialogInfo);
      break;
    }

    case 'stakeholder': {
      const d = nodeData as StakeholderNodeData;

      // Wrap the regeneration logic into a callback for the dialog confirmation
      // There are three cases
      const regenerateChildren = () => {
        const parentNode = node.parent;
        if (parentNode) {
          // Mark all children as being deleted
          node.each(n => {
            n.data.deleted = true;
          });

          // Delete all children and candidates
          d.children = [];
          d.childrenCandidates = [];
          d.showChildren = false;

          this.resetAndLayoutTree();
          this.drawTree(parentNode).then(() => {
            this.generateAutoHarms(d, parentNode.data.text);
          });
        }
      };

      const dialogInfo: DialogInfo = {
        header: 'Regenerate Harm Suggestions?',
        message:
          "Are you sure you want to regenerate this stakeholder's harm suggestions? " +
          'It will delete existing harms. This action cannot be undone.',
        yesButtonText: 'Regenerate',
        confirmAction: regenerateChildren,
        actionKey: 'regenerate-children',
        show: true
      };

      this.showDialog(dialogInfo);
      break;
    }

    case 'harm': {
      break;
    }

    default: {
      throw Error(`Unknown node type, ${nodeData.type}`);
    }
  }
}

/**
 * Update the severity associated with the harm node
 * @param this Envision tree object
 * @param e Event
 * @param detail Event detail
 */
export function handleSeverityUpdated(
  this: EnvisionTree,
  detail: EnvisionTreeNodeEventDetail
) {
  const [nodeData, _] = this._getNodeData(detail.id);
  if (nodeData.type === 'harm') {
    const d = nodeData as HarmNodeData;
    d.userRatedSeverity = detail.userRatedHarmSeverity;
  }
}

/**
 * Put the current editing node on top of siblings
 * @param this Envision tree object
 * @param e Event
 * @param detail Event detail
 */
export function handleEditModeEntered(
  this: EnvisionTree,
  detail: EnvisionTreeNodeEventDetail
) {
  const oldZIndex = this.pane
    .select(`.node-container-${detail.id}`)
    .style('z-index');
  this.pane
    .select(`.node-container-${detail.id}`)
    .style('z-index', +oldZIndex + 1);
}

/**
 * Put the current editing node on top of siblings
 * @param this Envision tree object
 * @param e Event
 * @param detail Event detail
 */
export function handleEditModeExited(
  this: EnvisionTree,
  detail: EnvisionTreeNodeEventDetail
) {
  const oldZIndex = this.pane
    .select(`.node-container-${detail.id}`)
    .style('z-index');
  this.pane
    .select(`.node-container-${detail.id}`)
    .style('z-index', +oldZIndex - 1);
}

/**
 * Update the footer statistics
 * @param this Envision tree object
 * @returns New footer info
 */
export function dispatchStatUpdate(this: EnvisionTree) {
  const footerInfo = getDefaultFooterInfo();
  if (this.treeData) {
    for (const useCase of this.treeData.children) {
      const useCaseNode = useCase as UseCaseNodeData;
      if (useCaseNode.text !== '') {
        footerInfo[useCaseNode.category] += 1;
      }

      for (const stakeholder of useCase.children) {
        const stakeholderNode = stakeholder as StakeholderNodeData;
        if (stakeholderNode.text !== '') {
          footerInfo[stakeholderNode.category] += 1;
        }

        for (const harm of stakeholder.children) {
          const harmNode = harm as HarmNodeData;
          if (harmNode.text !== '') {
            footerInfo[subHarmCategoryMap[harmNode.category]] += 1;
          }
        }
      }
    }
  }

  // Use callback to update the footer
  this.updateFooterInfo(footerInfo);
  return footerInfo;
}

/**
 * Search node by its id
 * @param id Node ID
 */
export function _getNodeData(
  this: EnvisionTree,
  id: string
): [EnvisionTreeNodeData, d3.HierarchyPointNode<EnvisionTreeNodeData>] {
  if (this.tree === null) throw Error('Tree is not set yet.');
  let nodeData: EnvisionTreeNodeData | null = null;
  let treeNode: d3.HierarchyPointNode<EnvisionTreeNodeData> | null = null;

  for (const node of this.tree.descendants()) {
    if (node.data.id === id) {
      treeNode = node;
      nodeData = node.data;
      break;
    }
  }

  if (nodeData === null || treeNode === null)
    throw Error('Cannot find node ' + id);
  return [nodeData, treeNode];
}
