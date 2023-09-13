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
import { EnvisionTree } from './envision-tree';
import {
  UseCaseCategories,
  StakeholderCategory,
  HarmCategory,
  subHarmCategoryMap,
  LayerType
} from './harm-types';
import { config } from '../../utils/config';
import '../envision-node/envision-node';
import '../harm-summary/harm-summary';

import type { Size, RectPoint, Point } from '../../types/common-types';
import type {
  SummaryNodeData,
  UseCaseNodeData,
  HarmNodeData,
  StakeholderNodeData,
  EnvisionTreeNodeData,
  HarmNodeSummaryData,
  EnvisionTreeNodeEvent
} from './harm-types';
import type { FarsightEnvisionNode } from '../envision-node/envision-node';
import type { FarsightHarmSummary } from '../harm-summary/harm-summary';

const DEV_MODE = import.meta.env.MODE === 'development';
const USE_CACHE = import.meta.env.MODE !== 'x20';

// Rect width is enforced, and rect height is just used for default gap estimation
const LAYOUT_CONFIG = config.layout.treeLayout;

const MAX_TREE_DEPTH = 10;
const LINK_HEAD_OFFSET = 3;

const SHORT_SUB_HARMS = [
  'Stereotyping',
  'Demeaning groups',
  'Loss self-identity',
  'Opportunity loss',
  'Economic loss',
  'Alienation',
  'Increased labor',
  'Service loss',
  'Loss of agency',
  'Facilitated violence',
  'Diminished health',
  'Privacy violations',
  'Information harms',
  'Cultural harms',
  'Political harms',
  'Macro-economic harms',
  'Environmental harms'
];

export async function drawTree(
  this: EnvisionTree,
  triggerNode: d3.HierarchyPointNode<EnvisionTreeNodeData> | null,
  animationEndCallback = () => {
    return;
  }
) {
  if (this.treeData === null) throw Error('treeData is not initialized yet.');
  if (this.tree === null) throw Error('tree is not initialized yet.');

  const parentNode = triggerNode === null ? this.tree : triggerNode;
  const treeContent = this.container.select('div.tree-content');
  const nodeGroup = treeContent.select('div.node-group');

  // Center the group
  treeContent.style(
    'transform',
    `translate(${this.padding.left + LAYOUT_CONFIG.rectWidth / 2}px, ${
      this.paneSize.height / 2
    }px)`
  );

  // Fist-time drawing: figure out the height of each node
  const containers = nodeGroup
    .selectAll('.node-container.temp')
    .data(
      this.tree.descendants(),
      d => (d as d3.HierarchyPointNode<EnvisionTreeNodeData>).data.id
    )
    .join('div')
    .attr('class', 'node-container temp')
    .style('width', d =>
      d.data.type === 'harm'
        ? `${LAYOUT_CONFIG.rectLongWidth}px`
        : `${LAYOUT_CONFIG.rectWidth}px`
    )
    .style('transform', d => {
      if (d.data.type === 'harm') {
        return `translate(${
          d.y + LAYOUT_CONFIG.rectLongWidth - LAYOUT_CONFIG.rectWidth
        }px, ${d.x}px)`;
      } else {
        return `translate(${d.y}px, ${d.x}px)`;
      }
    })
    .call(selection => {
      const s = selection as d3.Selection<
        HTMLDivElement,
        unknown,
        null,
        undefined
      >;
      addLoader(s, true);
    });

  const newNodes = containers
    .append('farsight-envision-node')
    .attr('type', d => d.data.type)
    .attr('nodeID', d => d.data.id)
    .attr('nodeText', d => d.data.text)
    .attr('nodeCategory', d => d.data.category);

  // Add harm summary nodes
  // Find all the harm nodes data
  const useCaseNodes = this.tree
    .descendants()
    .filter(d => d.children !== undefined && d.data.type === 'use-case');

  const harmSummaryNodes: HarmNodeSummaryData[] = [];
  // for (const node of useCaseNodes) {
  //   const curHarmNode = (node.data as UseCaseNodeData).harm;
  //   harmSummaryNodes.push(curHarmNode);
  // }

  const summaryContainers = nodeGroup
    .selectAll('div.harm-node-container.temp')
    .data(harmSummaryNodes, d => (d as HarmNodeSummaryData).id)
    .join('div')
    .attr('class', 'harm-node-container temp')
    .style('width', `${LAYOUT_CONFIG.rectWidth}px`)
    .style('transform', d => {
      return `translate(${parentNode.y - parentNode.data.width! / 2}px, ${
        d.parent!.x! - d.parent!.height! / 2
      }px)`;
    });

  const newSummaryNodes = summaryContainers
    .append('farsight-harm-summary')
    .attr('type', d => d.type)
    .attr('nodeID', d => d.id)
    .attr('nodeText', d => d.text)
    .attr('nodeCategory', d => d.category);

  // Wait for all shadow children to update
  await Promise.all([
    ...newNodes.nodes().map(el => (el as FarsightEnvisionNode).updateComplete),
    newSummaryNodes
      .nodes()
      .map(el => (el as FarsightHarmSummary).updateComplete)
  ]);

  // Record the position to tree data
  containers.each((d, i, g) => {
    const element = g[i] as HTMLElement;
    const bbox = element.getBoundingClientRect();

    // Need to consider the current transform to get the original size
    d.data.width = bbox.width / this.curTransform.k;
    d.data.height = bbox.height / this.curTransform.k;
  });

  summaryContainers.each((d, i, g) => {
    const element = g[i] as HTMLElement;
    const bbox = element.getBoundingClientRect();

    // Need to consider the current transform to get the original size
    d.width = bbox.width / this.curTransform.k;
    d.height = bbox.height / this.curTransform.k;
  });

  // Re-layout the tree using the real width and height
  this.tree = this.treeLayout(this.tree);
  containers.remove();
  summaryContainers.remove();

  // Track the bounding box of each layer by iterating all nodes
  this.layerBBox.set('summary', getInitBBox());
  this.layerBBox.set('use-case', getInitBBox());
  this.layerBBox.set('stakeholder', getInitBBox());
  this.layerBBox.set('harm', getInitBBox());
  this.tree.each(d => {
    let x0 = d.y - d.data.width! / 2;
    const y0 = d.x - d.data.height! / 2;
    let x1 = x0 + d.data.width!;
    const y1 = y0 + d.data.height!;

    if (d.data.type === 'harm') {
      x0 += (LAYOUT_CONFIG.rectLongWidth - LAYOUT_CONFIG.rectWidth) / 2;
      x1 += (LAYOUT_CONFIG.rectLongWidth - LAYOUT_CONFIG.rectWidth) / 2;
    }

    const curLayerBBox = this.layerBBox.get(d.data.type);
    if (curLayerBBox === undefined) {
      throw Error('curLayerBBox is not defined.');
    }
    curLayerBBox.x0 = Math.min(curLayerBBox.x0, x0);
    curLayerBBox.y0 = Math.min(curLayerBBox.y0, y0);
    curLayerBBox.x1 = Math.max(curLayerBBox.x1, x1);
    curLayerBBox.y1 = Math.max(curLayerBBox.y1, y1);
    this.layerBBox.set(d.data.type, curLayerBBox);

    // Store the x and y to the data as well
    d.data.x = d.x;
    d.data.y = d.y;
  });

  // Transition for the enter phase
  const enterTransition = treeContent
    .transition('enter')
    .duration(config.layout.treeLayout.animationDuration)
    .ease(d3.easeCubicInOut)
    .on('end', () => {
      animationEndCallback();
    })
    .on('interrupt', () => {
      animationEndCallback();
    })
    .on('cancel', () => {
      animationEndCallback();
    });

  this._drawNodes(enterTransition, parentNode);
  this._drawEdges(enterTransition, parentNode);
  this._drawBackContent(enterTransition);
  // this._drawHarmSummaryNodes(enterTransition, parentNode);
  // this._drawHarmEdges(enterTransition, parentNode);

  // Save the current position of all nodes for the next transition
  this.tree.each(d => {
    d.data.xPrevious = d.x;
    d.data.yPrevious = d.y;
  });
}

export function _drawNodes(
  this: EnvisionTree,
  enterTransition: d3.Transition<d3.BaseType, unknown, null, undefined>,
  parentNode: d3.HierarchyPointNode<EnvisionTreeNodeData>
) {
  if (this.tree === null) {
    throw Error('tree is not initialized yet.');
  }
  const treeContent = this.container.select('div.tree-content');
  const nodeGroup = treeContent.select('div.node-group');

  nodeGroup
    .selectAll('div.node-container')
    .data(
      this.tree.descendants(),
      d => (d as d3.HierarchyPointNode<EnvisionTreeNodeData>).data.id
    )
    .join(
      enter => {
        const newContainers = enter
          .append('div')
          .attr('class', d => `node-container node-container-${d.data.id}`)
          .style('width', d =>
            d.data.type === 'harm'
              ? `${LAYOUT_CONFIG.rectLongWidth}px`
              : `${LAYOUT_CONFIG.rectWidth}px`
          )
          .style('z-index', d => MAX_TREE_DEPTH - d.depth)
          .style('transform', d => {
            // The initial position is at its parent's position
            if (d.parent !== null) {
              const parentX = parentNode.data.xPrevious
                ? parentNode.data.xPrevious
                : parentNode.x;
              const parentY = parentNode.data.yPrevious
                ? parentNode.data.yPrevious
                : parentNode.y;

              return `translate(${parentY - d.data.width! / 2}px, ${
                parentX - d.data.height! / 2
              }px)`;
            } else {
              return `translate(${d.y - d.data.width! / 2}px, ${
                d.x - d.data.height! / 2
              }px)`;
            }
          })
          .style('opacity', d => (d.data.type === 'harm' ? 0 : 1));

        const newNodes = newContainers
          .append('farsight-envision-node')
          .attr('type', d => d.data.type)
          .attr('nodeID', d => d.data.id)
          .attr('nodeText', d => d.data.text)
          .attr('nodeCategory', d => d.data.category)
          .attr('placeholderText', d =>
            d.data.type === 'harm'
              ? this.harmPlaceholderText
              : 'Double click to edit'
          )
          .attr('harmSeverity', d =>
            d.data.type === 'harm'
              ? (d.data as HarmNodeData).userRatedSeverity
              : 1
          )
          .property('popperElementTop', this.popperElementTop)
          .property('popperElementBottom', this.popperElementBottom)
          .on('nodeClicked', (e: EnvisionTreeNodeEvent) => {
            this.handleNodeClick(e.detail.originalEvent, e.detail);
          })
          .on('textChanged', (e: EnvisionTreeNodeEvent) => {
            this.handleTextChanged(e.detail.originalEvent, e.detail);
          })
          .on('addClicked', (e: EnvisionTreeNodeEvent) => {
            this.handleAddClicked(e.detail.originalEvent, e.detail);
          })
          .on('severityUpdated', (e: EnvisionTreeNodeEvent) => {
            this.handleSeverityUpdated(e.detail);
          })
          .on('editModeEntered', (e: EnvisionTreeNodeEvent) => {
            this.handleEditModeEntered(e.detail);
          })
          .on('editModeExited', (e: EnvisionTreeNodeEvent) => {
            this.handleEditModeExited(e.detail);
          })
          .on('deleteClicked', (e: EnvisionTreeNodeEvent) => {
            this.handleDeleteClicked(e.detail.originalEvent, e.detail);
          })
          .on('refreshClicked', (e: EnvisionTreeNodeEvent) => {
            this.handleRefreshClicked(e.detail.originalEvent, e.detail);
          })
          .on('regenerateChildrenClicked', (e: EnvisionTreeNodeEvent) => {
            this.handleRegenerateChildrenClicked(
              e.detail.originalEvent,
              e.detail
            );
          })
          .attr('hasShownChild', d => {
            return d.children !== undefined && d.data.children.length !== 0
              ? 'true'
              : null;
          })
          .attr('hasHiddenChild', d => {
            return d.children === undefined && d.data.children.length !== 0
              ? 'true'
              : null;
          })
          .attr('hasParent', d => (d.parent === null ? null : 'true'));

        // Add loader element
        newContainers.each((_, i, g) => {
          const selection = d3.select(g[i]);
          addLoader(selection, true);
        });

        // Transition the nodes form parent location to its real location
        newContainers
          .transition(enterTransition)
          .style('transform', d => {
            return `translate(${
              d.y -
              d.data.width! / 2 +
              (d.data.width! - LAYOUT_CONFIG.rectWidth) / 2
            }px, ${d.x - d.data.height! / 2}px)`;
          })
          .style('opacity', 1);

        return newNodes;
      },
      update => {
        // The transition should happen at the same time as the
        // entering transition
        update.transition(enterTransition).style('transform', d => {
          return `translate(${
            d.y -
            d.data.width! / 2 +
            (d.data.width! - LAYOUT_CONFIG.rectWidth) / 2
          }px, ${d.x - d.data.height! / 2}px)`;
        });

        update
          .select('farsight-envision-node')
          .attr('hasShownChild', d => {
            return d.children !== undefined && d.data.children.length !== 0
              ? 'true'
              : null;
          })
          .attr('hasHiddenChild', d => {
            return d.children === undefined && d.data.children.length !== 0
              ? 'true'
              : null;
          })
          .attr('hasParent', d => (d.parent === null ? null : 'true'))
          .attr('node-text', d => d.data.text);

        return update;
      },
      exit => {
        // There are two cases
        // (1) User hides this node
        // Transition the nodes to their parent's location before removing them
        exit
          .filter(d => d.parent !== null && d.data.deleted === undefined)
          .transition(enterTransition)
          .style('transform', d => {
            return `translate(${parentNode.y - d.data.width! / 2}px, ${
              parentNode.x - d.data.height! / 2
            }px)`;
          })
          .style('opacity', d => (d.data.type === 'harm' ? 0 : 1))
          .on('end', (_, i, g) => {
            d3.select(g[i]).remove();
          });

        // (2) User deletes this node
        exit
          .filter(d => d.parent !== null && d.data.deleted === true)
          .transition(enterTransition)
          .style('opacity', 0)
          .on('end', (_, i, g) => {
            d3.select(g[i]).remove();
          });

        exit.filter(d => d.parent === null).remove();
      }
    );
}

export function _drawEdges(
  this: EnvisionTree,
  enterTransition: d3.Transition<d3.BaseType, unknown, null, undefined>,
  parentNode: d3.HierarchyPointNode<EnvisionTreeNodeData>
) {
  if (this.tree === null) {
    throw Error('tree is not initialized yet.');
  }

  const linkGroup = this.linkSVG
    .selectAll('g.link-group')
    .data([0])
    .join('g')
    .attr('class', 'link-group');

  // This curve function is used when a node is entered
  // Move the edge to the parent's starting position
  const enterCurve = d3
    .linkHorizontal<
      d3.HierarchyPointLink<EnvisionTreeNodeData>,
      [number, number]
    >()
    .source(_ => {
      const parentX = parentNode.data.xPrevious
        ? parentNode.data.xPrevious
        : parentNode.x;
      const parentY = parentNode.data.yPrevious
        ? parentNode.data.yPrevious
        : parentNode.y;
      return [
        parentX,
        parentY + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
      ];
    })
    .target(_ => {
      const parentX = parentNode.data.xPrevious
        ? parentNode.data.xPrevious
        : parentNode.x;
      const parentY = parentNode.data.yPrevious
        ? parentNode.data.yPrevious
        : parentNode.y;

      return [
        parentX,
        parentY - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
      ];
    })
    .x(d => d[1])
    .y(d => d[0]);

  // This curve function is used when a node has been transitioned
  const curve = d3
    .linkHorizontal<
      d3.HierarchyPointLink<EnvisionTreeNodeData>,
      [number, number]
    >()
    .source(d => [
      d.source.x,
      d.source.y + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
    ])
    .target(d => [
      d.target.x,
      d.target.y - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
    ])
    .x(d => d[1])
    .y(d => d[0]);

  // This curve function is used when a node is about to removed
  // Move the edge to the parent's ending position
  const exitCurve = d3
    .linkHorizontal<
      d3.HierarchyPointLink<EnvisionTreeNodeData>,
      [number, number]
    >()
    .source(_ => [
      parentNode.x,
      parentNode.y + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
    ])
    .target(_ => [
      parentNode.x,
      parentNode.y - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
    ])
    .x(d => d[1])
    .y(d => d[0]);

  linkGroup
    .selectAll('path')
    .data(this.tree.links(), d => {
      const link = d as d3.HierarchyPointLink<EnvisionTreeNodeData>;
      return link.source.data.id + '-' + link.target.data.id;
    })
    .join(
      enter => {
        // For the initial position, use the parent as both source and target
        const entered = enter.append('path').attr('d', enterCurve);

        // Transition the links form overlapping to the correct position
        entered.transition(enterTransition).attr('d', curve);
        return entered;
      },
      update => {
        // The transition should happen at the same time as the
        // entering transition
        return update.transition(enterTransition).attr('d', curve);
      },
      exit => {
        // There are two cases
        // (1) User hides this node
        // Transition the edges to the source location before removing them
        exit
          .filter(d => d.target.data.deleted !== true)
          .transition(enterTransition)
          .attr('d', exitCurve)
          .on('end', (_, i, g) => {
            d3.select(g[i]).remove();
          });

        // (2) User deletes this node
        exit
          .filter(d => d.target.data.deleted === true)
          .transition(enterTransition)
          .style('opacity', 0)
          .on('end', (_, i, g) => {
            d3.select(g[i]).remove();
          });
      }
    );
}

// export function _drawHarmSummaryNodes(
//   this: EnvisionTree,
//   enterTransition: d3.Transition<d3.BaseType, unknown, null, undefined>,
//   parentNode: d3.HierarchyPointNode<EnvisionTreeNodeData>
// ) {
//   if (this.tree === null) {
//     throw Error('tree is not initialized yet.');
//   }
//   const treeContent = this.container.select('div.tree-content');
//   const nodeGroup = treeContent.select('div.node-group');

//   // Find all the harm nodes data
//   const useCaseNodes = this.tree
//     .descendants()
//     .filter(d => d.children !== undefined && d.data.type === 'use-case');

//   const harmSummaryNodes: HarmNodeSummaryData[] = [];
//   for (const node of useCaseNodes) {
//     const curHarmNode = (node.data as UseCaseNodeData).harm;

//     // Calculate the previous layer's height. We set the expanded view to have
//     // the same height as its previous layer by default.
//     const preLayerHeight =
//       node.children![node.children!.length - 1].x! +
//       node.children![node.children!.length - 1].data.height! / 2 -
//       node.children![0].x! +
//       node.children![0].data.height! / 2;

//     const preLayerMidY =
//       node.children![0].x! -
//       node.children![0].data.height! / 2 +
//       preLayerHeight / 2;
//     curHarmNode.preLayerHeight = preLayerHeight;
//     curHarmNode.y = preLayerMidY;
//     harmSummaryNodes.push(curHarmNode);
//   }

//   // Calculate the horizontal distance between the use case nodes and harm nodes
//   let harmNodeLeftX = parentNode.y;
//   if (useCaseNodes.length > 0) {
//     const useCaseNodeLeftX = useCaseNodes[0].y;
//     const stakeholderNodeLeftX = useCaseNodes[0].children![0].y;
//     const edgeWidth =
//       stakeholderNodeLeftX - useCaseNodeLeftX - LAYOUT_CONFIG.rectWidth;
//     harmNodeLeftX = stakeholderNodeLeftX + LAYOUT_CONFIG.rectWidth + edgeWidth;
//   }

//   nodeGroup
//     .selectAll('div.harm-node-container')
//     .data(harmSummaryNodes, d => (d as HarmNodeSummaryData).id)
//     .join(
//       enter => {
//         const newContainers = enter
//           .append('div')
//           .attr('class', d => `harm-node-container harm-node-container-${d.id}`)
//           .style('z-index', MAX_TREE_DEPTH - parentNode.depth - 2)
//           .style('transform', d => {
//             // The initial position is at its parent's position
//             const parentX = parentNode.data.xPrevious
//               ? parentNode.data.xPrevious
//               : parentNode.x;
//             const parentY = parentNode.data.yPrevious
//               ? parentNode.data.yPrevious
//               : parentNode.y;

//             return `translate(${parentY - parentNode.data.width! / 2}px, ${
//               parentX - d.height! / 2
//             }px)`;
//           })
//           .style('opacity', 0);

//         const newNodes = newContainers
//           .append('farsight-harm-summary')
//           .attr('type', d => d.type)
//           .attr('nodeID', d => d.id)
//           .attr('nodeText', d => d.text)
//           .attr('nodeCategory', d => d.category)
//           .property('popperElementTop', this.popperElementTop)
//           .property('popperElementBottom', this.popperElementBottom)
//           .property('curTransform', this.curTransform)
//           .property('preLayerHeight', d => d.preLayerHeight)
//           .on('nodeClicked', (e: EnvisionTreeNodeEvent) => {
//             this.handleNodeClick(e.detail.originalEvent, e.detail);
//           })
//           .on('textChanged', (e: EnvisionTreeNodeEvent) => {
//             this.handleTextChanged(e.detail.originalEvent, e.detail);
//           })
//           .on('addClicked', (e: EnvisionTreeNodeEvent) => {
//             this.handleAddClicked(e.detail.originalEvent, e.detail);
//           })
//           .attr('hasShownChild', null)
//           .attr('hasHiddenChild', null)
//           .attr('hasParent', 'true');

//         // Add loader element
//         newContainers.each((_, i, g) => {
//           const selection = d3.select(g[i]);
//           addLoader(selection, true);
//         });

//         // Transition the nodes form parent location to its real location
//         newContainers
//           .transition(enterTransition)
//           .style(
//             'transform',
//             d =>
//               `translate(${harmNodeLeftX - d.width! / 2}px, ${
//                 d.y! - d.height! / 2
//               }px)`
//           )
//           .style('opacity', 1);

//         return newNodes;
//       },
//       update => {
//         // The transition should happen at the same time as the
//         // entering transition
//         update.transition(enterTransition).style('transform', d => {
//           return `translate(${harmNodeLeftX - d.width! / 2}px, ${
//             d.y! - d.height! / 2
//           }px)`;
//         });

//         update
//           .select('farsight-envision-node')
//           .attr('hasParent', 'true')
//           .attr('node-text', d => d.text);

//         return update;
//       },
//       exit => {
//         // Transition the nodes to their parent's location before removing them
//         exit
//           .transition(enterTransition)
//           .style('transform', d => {
//             return `translate(${d.parent!.y! - d.parent!.width! / 2}px, ${
//               d.parent!.x! - d.height! / 2
//             }px)`;
//           })
//           .style('opacity', 0)
//           .on('end', (_, i, g) => {
//             d3.select(g[i]).remove();
//           });
//       }
//     );
// }

export function _drawHarmEdges(
  this: EnvisionTree,
  enterTransition: d3.Transition<d3.BaseType, unknown, null, undefined>,
  parentNode: d3.HierarchyPointNode<EnvisionTreeNodeData>
) {
  if (this.tree === null) {
    throw Error('tree is not initialized yet.');
  }

  // Find all the harm nodes data
  const useCaseNodes = this.tree
    .descendants()
    .filter(d => d.children !== undefined && d.data.type === 'use-case');

  interface EdgePoint extends Point {
    id: string;
  }

  interface Edge {
    source: EdgePoint;
    target: EdgePoint;
  }

  const harmEdges: Edge[] = [];

  // Calculate the horizontal distance between the use case nodes and harm nodes
  let harmNodeLeftX = parentNode.y;
  if (useCaseNodes.length > 0) {
    const useCaseNodeLeftX = useCaseNodes[0].y;
    const stakeholderNodeLeftX = useCaseNodes[0].children![0].y;
    const edgeWidth =
      stakeholderNodeLeftX - useCaseNodeLeftX - LAYOUT_CONFIG.rectWidth;
    harmNodeLeftX = stakeholderNodeLeftX + LAYOUT_CONFIG.rectWidth + edgeWidth;

    // Collect edges from stakeholder nodes to the harm nodes
    // for (const node of useCaseNodes) {
    //   const curHarmNode = (node.data as UseCaseNodeData).harm;

    //   for (const sNode of node.children!) {
    //     const curEdge = {
    //       source: { x: sNode.x, y: sNode.y, id: sNode.data.id },
    //       target: {
    //         x: curHarmNode.y!,
    //         y: harmNodeLeftX,
    //         id: curHarmNode.id
    //       }
    //     };
    //     harmEdges.push(curEdge);
    //   }
    // }
  }

  // This curve function is used when a node is entered
  // Move the edge to the parent's starting position
  const enterCurve = d3
    .linkHorizontal<Edge, [number, number]>()
    .source(_ => {
      const parentX = parentNode.data.xPrevious
        ? parentNode.data.xPrevious
        : parentNode.x;
      const parentY = parentNode.data.yPrevious
        ? parentNode.data.yPrevious
        : parentNode.y;
      return [
        parentX,
        parentY + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
      ];
    })
    .target(_ => {
      const parentX = parentNode.data.xPrevious
        ? parentNode.data.xPrevious
        : parentNode.x;
      const parentY = parentNode.data.yPrevious
        ? parentNode.data.yPrevious
        : parentNode.y;

      return [
        parentX,
        parentY - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
      ];
    })
    .x(d => d[1])
    .y(d => d[0]);

  // This curve function is used when a node has been transitioned
  const curve = d3
    .linkHorizontal<Edge, [number, number]>()
    .source(d => [
      d.source.x,
      d.source.y + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
    ])
    .target(d => [
      d.target.x,
      d.target.y - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
    ])
    .x(d => d[1])
    .y(d => d[0]);

  // This curve function is used when a node is about to removed
  // Move the edge to the parent's ending position
  const exitCurve = d3
    .linkHorizontal<Edge, [number, number]>()
    .source(_ => [
      parentNode.x,
      parentNode.y + LAYOUT_CONFIG.rectWidth / 2 - LINK_HEAD_OFFSET
    ])
    .target(_ => [
      parentNode.x,
      parentNode.y - LAYOUT_CONFIG.rectWidth / 2 + LINK_HEAD_OFFSET
    ])
    .x(d => d[1])
    .y(d => d[0]);

  const linkGroup = this.linkSVG
    .selectAll('g.harm-link-group')
    .data([0])
    .join('g')
    .attr('class', 'harm-link-group');

  linkGroup
    .selectAll('path')
    .data(harmEdges, d => {
      const edge = d as Edge;
      return edge.source.id + '-' + edge.target.id;
    })
    .join(
      enter => {
        // For the initial position, use the parent as both source and target
        const entered = enter.append('path').attr('d', enterCurve);

        // Transition the links form overlapping to the correct position
        entered.transition(enterTransition).attr('d', curve);
        return entered;
      },
      update => {
        // The transition should happen at the same time as the
        // entering transition
        return update.transition(enterTransition).attr('d', curve);
      },
      exit => {
        // Transition the edges to the source location before removing them
        exit
          .transition(enterTransition)
          .attr('d', exitCurve)
          .on('end', (_, i, g) => {
            d3.select(g[i]).remove();
          });
      }
    );
}

/**
 * Draw back content that depends on the bounding box of each layer
 */
export function _drawBackContent(
  this: EnvisionTree,
  enterTransition: d3.Transition<d3.BaseType, unknown, null, undefined>
) {
  if (this.tree === null) {
    throw Error('Tree is null.');
  }

  const layerTypeMap = new Map<LayerType, [string, number]>();
  layerTypeMap.set('summary', ['Functionality', 0]);
  layerTypeMap.set('use-case', ['Use Cases', 1]);
  layerTypeMap.set('stakeholder', ['Stakeholders', 2]);
  layerTypeMap.set('harm', ['Harms', 3]);

  const labelPadding = 10;
  const group = this.container.select('.tree-content .annotation-group');

  for (const [layerType, [layerName, depth]] of layerTypeMap.entries()) {
    const curLayerBBox = this.layerBBox.get(layerType)!;
    if (curLayerBBox.x0 === Infinity) continue;

    group
      .selectAll(`div.layer-label-${layerType}`)
      .data([layerType])
      .join(
        enter => {
          const entered = enter
            .append('div')
            .attr('class', `layer-label layer-label-${layerType}`)
            .style(
              'left',
              `${curLayerBBox.x0 + (curLayerBBox.x1 - curLayerBBox.x0) / 2}px`
            )
            .style('top', `${curLayerBBox.y0 - labelPadding}px`)
            .text(layerName)
            .style('opacity', 0);

          entered
            .transition(enterTransition)
            .style('opacity', this.tree!.height >= depth ? 1 : 0);
          return entered;
        },
        update => {
          update
            .transition(enterTransition)
            .style(
              'left',
              `${curLayerBBox.x0 + (curLayerBBox.x1 - curLayerBBox.x0) / 2}px`
            )
            .style('top', `${curLayerBBox.y0 - labelPadding}px`);
          return update;
        },
        exit => exit.remove()
      );
  }

  for (const [layerType, [_, depth]] of layerTypeMap.entries()) {
    group
      .selectAll(`div.layer-label-${layerType}`)
      .transition(enterTransition)
      .style('opacity', this.tree!.height >= depth ? 1 : 0);
  }
}

export const addLoader = (
  selection: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  hidden: boolean
) => {
  const magicGroup = selection
    .append('div')
    .attr('class', 'loader svg-icon')
    .attr('hidden', hidden ? 'true' : null)
    .append('svg')
    .style('height', '100%')
    .style('width', '100%')
    .attr('viewBox', '0 -960 960 960')
    .append('g')
    .attr('class', 'magic-button-group');

  const randomNum = d3.randomInt(100, 100000)();
  const defs = magicGroup
    .append('defs')
    .append('linearGradient')
    .attr('id', `magic-gradient-${randomNum}`)
    .attr('x1', '0%')
    .attr('y1', '50%')
    .attr('x2', '100%')
    .attr('y2', '50%')
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('gradientTransform', 'rotate(45)');

  defs.append('stop').attr('class', 'magic-stop').attr('offset', '0%');
  defs.append('stop').attr('class', 'magic-stop').attr('offset', '60%');
  defs.append('stop').attr('class', 'magic-stop').attr('offset', '100%');

  magicGroup
    .append('path')
    .attr(
      'd',
      'm384-232-95-209-209-95 209-95 95-209 95 209 209 95-209 95-95 209Zm344 112-47-105-105-47 105-48 47-104 48 104 104 48-104 47-48 105Z'
    )
    .style('fill', `url(#magic-gradient-${randomNum})`);
};

/**
 * Periodically update the placeholder text in harm nodes
 */
export function animateHarmNodePlaceholders(this: EnvisionTree) {
  const treeContent = this.container.select('div.tree-content');
  const nodeGroup = treeContent.select('div.node-group');

  const getRandomIndex = d3.randomInt(SHORT_SUB_HARMS.length);
  const randomIndex = getRandomIndex();
  this.harmPlaceholderText = SHORT_SUB_HARMS[randomIndex] + '?';

  nodeGroup
    .selectAll<HTMLDivElement, d3.HierarchyPointNode<EnvisionTreeNodeData>>(
      'div.node-container'
    )
    .filter(d => d.data.type === 'harm')
    .select('farsight-envision-node')
    .attr('placeholderText', () => {
      const randomIndex = getRandomIndex();
      return SHORT_SUB_HARMS[randomIndex] + '?';
    });

  window.setTimeout(() => {
    this.animateHarmNodePlaceholders();
  }, 10000);
}

export const getInitBBox = () => ({
  x0: Infinity,
  y0: Infinity,
  x1: -Infinity,
  y1: -Infinity
});
