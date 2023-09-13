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

/**
 * Type definitions
 */

export interface EnvisionTreeData {
  prompt: string;
  data: EnvisionTreeNodeData;
}

export interface HarmJSONData {
  harmTaxonomy: HarmTaxonomy;
  failureModes: FailureModeData;
}

export type FailureMode =
  | 'unsafe'
  | 'toxic'
  | 'inaccurate'
  | 'opinionated'
  | 'privacy'
  | 'illegal';

export type FailureModeData = {
  [key in FailureMode]: FailureModeItem;
};

export interface FailureModeItem {
  name: string;
  description: string;
}

export interface HarmConfig {
  severity: number;
  failureModes: FailureMode[];
}

export interface HarmTaxonomyTheme {
  name: string;
  description: string;
  harms: HarmTaxonomyHarm[];
}

export interface HarmTaxonomyHarm {
  name: string;
  description: string;
  reportNumbers: number[];
  failureModes: FailureMode[];
}

export type HarmTaxonomy = {
  [key in HarmCategory]: HarmTaxonomyTheme;
};

export interface EnvisionTreeNodeEventDetail {
  originalEvent: Event;
  text: string;
  id: string;
  type: string;
  userRatedHarmSeverity: number;
  startHandler?: () => void;
  endHandler?: () => void;
}

export interface EnvisionTreeNodeEvent extends CustomEvent {
  detail: EnvisionTreeNodeEventDetail;
}

export interface LayoutConfig {
  rectWidth: number;
  rectHeight: number;
  hGap: number;
  vGap: number;
}

export enum UseCaseCategories {
  INTENDED = 'Intended',
  HIGH_STAKES = 'High-stakes',
  MISUSE = 'Misuse'
}

export enum StakeholderCategory {
  DIRECT = 'Direct',
  INDIRECT = 'Indirect'
}

export enum HarmCategory {
  REPRESENTATIONAL = 'Representational harms',
  ALLOCATIVE = 'Allocative harms',
  QUALITY = 'Quality of service harms',
  INTERPERSONAL = 'Interpersonal harms',
  SOCIETAL = 'Societal harms'
}

export enum SubHarmCategory {
  STEREOTYPING = 'Stereotyping',
  DEMEANING = 'Demeaning and alienating social groups',
  DENYING = 'Denying people opportunity to self-identify',
  OPPORTUNITY = 'Opportunity loss',
  ECONOMIC = 'Economic loss',
  ALIENATION = 'Alienation',
  LABOR = 'Increased labor',
  SERVICE = 'Service or benefit loss',
  AGENCY = 'Loss of agency or social control',
  VIOLENCE = 'Technology-facilitated violence',
  HEALTH = 'Diminished health and well-being',
  PRIVACY = 'Privacy violations',
  INFORMATION = 'Information harms',
  CULTURAL = 'Cultural harms',
  POLITICAL = 'Political and civic harms',
  MACRO = 'Macro socio-economic harms',
  ENVIRONMENTAL = 'Environmental harms'
}

export const subHarmCategoryMap: {
  [key in SubHarmCategory]: HarmCategory;
} = {
  [SubHarmCategory.STEREOTYPING]: HarmCategory.REPRESENTATIONAL,
  [SubHarmCategory.DEMEANING]: HarmCategory.REPRESENTATIONAL,
  [SubHarmCategory.DENYING]: HarmCategory.REPRESENTATIONAL,
  [SubHarmCategory.OPPORTUNITY]: HarmCategory.ALLOCATIVE,
  [SubHarmCategory.ECONOMIC]: HarmCategory.ALLOCATIVE,
  [SubHarmCategory.ALIENATION]: HarmCategory.QUALITY,
  [SubHarmCategory.LABOR]: HarmCategory.QUALITY,
  [SubHarmCategory.SERVICE]: HarmCategory.QUALITY,
  [SubHarmCategory.AGENCY]: HarmCategory.INTERPERSONAL,
  [SubHarmCategory.VIOLENCE]: HarmCategory.INTERPERSONAL,
  [SubHarmCategory.HEALTH]: HarmCategory.INTERPERSONAL,
  [SubHarmCategory.PRIVACY]: HarmCategory.INTERPERSONAL,
  [SubHarmCategory.INFORMATION]: HarmCategory.SOCIETAL,
  [SubHarmCategory.CULTURAL]: HarmCategory.SOCIETAL,
  [SubHarmCategory.POLITICAL]: HarmCategory.SOCIETAL,
  [SubHarmCategory.MACRO]: HarmCategory.SOCIETAL,
  [SubHarmCategory.ENVIRONMENTAL]: HarmCategory.SOCIETAL
};

export const subHarmStringMap = new Map<string, SubHarmCategory>();
for (const key in SubHarmCategory) {
  const curKey = key as keyof typeof SubHarmCategory;
  subHarmStringMap.set(
    SubHarmCategory[curKey].toLowerCase(),
    SubHarmCategory[curKey]
  );
}

export type LayerType =
  | 'summary'
  | 'use-case'
  | 'stakeholder'
  | 'harm'
  | 'harm-summary';

export interface EnvisionTreeNodeData {
  text: string;
  type: LayerType;
  category: UseCaseCategories | StakeholderCategory | SubHarmCategory | null;
  children: UseCaseNodeData[] | StakeholderNodeData[] | HarmNodeData[];
  childrenCandidates:
    | UseCaseNodeData[]
    | StakeholderNodeData[]
    | HarmNodeData[];
  id: string;
  showChildren: boolean;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  xPrevious?: number;
  yPrevious?: number;
  deleted?: boolean;
}

export interface SummaryNodeData extends EnvisionTreeNodeData {
  type: 'summary';
  children: UseCaseNodeData[];
}

export interface UseCaseNodeData extends EnvisionTreeNodeData {
  type: 'use-case';
  category: UseCaseCategories;
  children: StakeholderNodeData[];
}

export interface StakeholderNodeData extends EnvisionTreeNodeData {
  type: 'stakeholder';
  stakeholderCategory?: string;
  category: StakeholderCategory;
  children: HarmNodeData[];
  relevance: number;
}

export interface HarmNodeData extends EnvisionTreeNodeData {
  type: 'harm';
  category: SubHarmCategory;
  severity: number;
  userRatedSeverity: number;
  validated: boolean;
}

export interface HarmNodeSummaryData extends EnvisionTreeNodeData {
  type: 'harm-summary';
  category: null;
  parent: UseCaseNodeData | null;
  preLayerHeight: number;
}
