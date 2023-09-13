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

import type { PromptModel } from '../types/common-types';

import summaryPromptData from '../models/prompt-summary.json';
import useCasePromptData from '../models/prompt-use-case.json';
import stakeholderPromptData from '../models/prompt-stakeholder.json';
import harmPromptData from '../models/prompt-harm.json';

export const summaryPrompt = summaryPromptData as PromptModel;
export const useCasePrompt = useCasePromptData as PromptModel;
export const stakeholderPrompt = stakeholderPromptData as PromptModel;
export const harmPrompt = harmPromptData as PromptModel;
