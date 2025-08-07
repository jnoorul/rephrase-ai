export interface ExtensionSettings {
  provider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  claudeApiKey?: string;
  openaiModel: string;
  claudeModel: string;
  customPrompt?: string;
  customSummaryPrompt?: string;
}

export interface RephraseRequest {
  text: string;
  settings: ExtensionSettings;
}

export interface RephraseResponse {
  success: boolean;
  rephrasedText?: string;
  error?: string;
}

export interface TextSelection {
  text: string;
  element: HTMLElement;
  range?: Range;
}

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

export type MessageType = 
  | 'REPHRASE_TEXT'
  | 'SUMMARIZE_TEXT'
  | 'ASK_AI'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'SHOW_MODAL'
  | 'UPDATE_MODAL'
  | 'SHOW_SUMMARY_MODAL'
  | 'UPDATE_SUMMARY_MODAL'
  | 'SHOW_ASK_AI_MODAL'
  | 'UPDATE_ASK_AI_MODAL'
  | 'HIDE_MODAL'
  | 'REPLACE_TEXT'
  | 'GET_SELECTION'
  | 'GET_PAGE_CONTENT';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
}

export interface ModalData {
  originalText: string;
  rephrasedText?: string;
  selection?: TextSelection;
  error?: string;
  isLoading?: boolean;
}

export interface SummaryModalData {
  originalText: string;
  summaryText?: string;
  error?: string;
  isLoading?: boolean;
}

export interface SummaryRequest {
  text: string;
  settings: ExtensionSettings;
}

export interface SummaryResponse {
  success: boolean;
  summaryText?: string;
  error?: string;
}

export interface AskAIModalData {
  originalText: string;
  explanation?: string;
  error?: string;
  isLoading?: boolean;
}

export interface AskAIRequest {
  text: string;
  pageContext?: string;
  settings: ExtensionSettings;
}

export interface AskAIResponse {
  success: boolean;
  explanation?: string;
  error?: string;
}