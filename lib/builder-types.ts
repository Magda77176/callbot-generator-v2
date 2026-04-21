import type { BusinessInfo, Sector } from './callbot-configs';

export type ModelOption = 'gpt-4o-mini' | 'gpt-4o' | 'claude-sonnet-4-6';

export const MODEL_LABELS: Record<ModelOption, string> = {
  'gpt-4o-mini': 'GPT-4o mini (rapide, économique)',
  'gpt-4o': 'GPT-4o (qualité max)',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6 (équilibré)',
};

export interface BuilderState {
  sector: Sector | null;
  businessInfo: BusinessInfo;
  systemPrompt: string;
  voiceId: string;
  model: ModelOption;
  temperature: number;
}
