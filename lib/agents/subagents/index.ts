/**
 * Subagents Index
 *
 * Exports all specialized subagent configurations.
 */

export { legalResearchConfig, legalResearchStaticTools } from './research';
export { contractAnalysisConfig, contractAnalysisStaticTools } from './contracts';
export { documentQAConfig, documentQAStaticTools } from './qa';

/**
 * All subagent configurations
 */
export const subagentConfigs = {
  'legal-research': () => import('./research').then((m) => m.legalResearchConfig),
  'contract-analysis': () =>
    import('./contracts').then((m) => m.contractAnalysisConfig),
  'document-qa': () => import('./qa').then((m) => m.documentQAConfig),
};

export type SubagentType = keyof typeof subagentConfigs;
