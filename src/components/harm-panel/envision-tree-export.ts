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

import { downloadJSON, downloadText } from '@xiaohk/utils';
import { EnvisionTree, createEmptyChild } from './envision-tree';
import {
  EnvisionTreeData,
  EnvisionTreeNodeData,
  SummaryNodeData,
  UseCaseNodeData,
  StakeholderNodeData,
  HarmNodeData
} from './harm-types';
import type { DialogInfo } from '../confirm-dialog/confirm-dialog';

/**
 * Export the envision tree object as a json file
 * @param this EnvisionTree object
 * @param prompt The original prompt
 * @param e Mouse event
 */
export function exportTree(this: EnvisionTree, prompt: string) {
  // Save the tree data as a JSON file
  // const data = _exportTreeDataJSON(this, prompt);
  // if (data) {
  //   downloadJSON(data, null, 'farsight-data.json');
  // }

  // Save the harm output as a text file
  const text = _exportTreeDataText(this, prompt);
  if (text) {
    downloadText(text, null, 'farsight-harms.txt');
  }
}

/**
 * Get the serialized envision tree data
 * @param envisionTree Envision tree object
 * @param prompt Original prompt
 * @returns Serialized data
 */
const _exportTreeDataJSON = (envisionTree: EnvisionTree, prompt: string) => {
  if (envisionTree.treeData === null) {
    console.error('Tree data is not initialized yet');
    return null;
  }

  const data: EnvisionTreeData = {
    prompt,
    data: envisionTree.treeData
  };

  return data;
};

/**
 * Transform tree data into a human-readable text format
 * @param envisionTree Envision tree object
 * @param prompt Original prompt
 */
const _exportTreeDataText = (envisionTree: EnvisionTree, prompt: string) => {
  if (envisionTree.treeData === null) {
    console.error('Tree data is not initialized yet');
    return null;
  }

  let text = `## Prompt\n\n${prompt}\n\n`;
  const harms: string[] = [];
  let useCaseCount = 1;

  for (const useCase of envisionTree.treeData.children) {
    if (useCase.text === '') continue;

    text += `### Use Case ${useCaseCount++}: ${useCase.text}\n\n`;

    if (useCase.children.length !== 0) {
      text += '#### Harms\n\n';
    }

    for (const stakeholder of useCase.children) {
      for (const harm of stakeholder.children) {
        if (harm.text !== '') {
          const harmText = harm.text.replace('/\n/g', '');
          text += `- ${harmText}\n\n`;
        }
      }
    }
    text += '\n';
  }

  for (const harm of harms) {
    text += `${harm}\n`;
  }

  return text;
};

/**
 * Transform tree data into a human-readable html table format
 * @param envisionTree Envision tree object
 * @param e Mouse event
 */
const _exportTreeDataTable = (envisionTree: EnvisionTree) => {
  if (envisionTree.treeData === null) {
    console.error('Tree data is not initialized yet');
    return null;
  }

  let html =
    '<table><tr><th>Select</th><th>Use Case</th><th>Stakeholder</th><th>Harm</th></tr>';

  for (const useCase of envisionTree.treeData.children) {
    if (useCase.text === '') continue;

    if (useCase.children.length === 0) {
      html += `<tr>
            <td></td>
            <td>${useCase.text}</td>
            <td></td>
            <td><td>
          </tr>
          `;
    }

    for (const stakeholder of useCase.children) {
      for (const harm of stakeholder.children) {
        if (harm.text !== '') {
          const harmText = harm.text.replace('/\n/g', '');
          html += `<tr>
            <td></td>
            <td>${useCase.text}</td>
            <td>${stakeholder.text}</td>
            <td>${harmText}</td>
          </tr>
          `;
        }
      }
    }
  }
  html += '</table>';

  const blobInput = new Blob([html], { type: 'text/html' });
  const clipboardItemInput = new ClipboardItem({
    'text/html': blobInput
  });
  navigator.clipboard.write([clipboardItemInput]);

  return html;
};

const _exportLogs = (envisionTree: EnvisionTree) => {
  if (envisionTree.logger !== null) {
    return envisionTree.logger.getLogOutput();
  }
  return null;
};

const getCurrentTimeInET = () => {
  const now = new Date();
  const etTimeZone = 'America/New_York';

  // Get the date and time in ET time zone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: etTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h24'
  };

  return now
    .toLocaleString('en-US', options)
    .replace(/\//g, '-')
    .replace(', ', '-')
    .replace(':', '-');
};
