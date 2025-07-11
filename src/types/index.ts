export interface ExtensionSettings {
  provider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  claudeApiKey?: string;
  openaiModel: string;
  claudeModel: string;
  customPrompt?: string;
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
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'SHOW_MODAL'
  | 'HIDE_MODAL'
  | 'REPLACE_TEXT'
  | 'GET_SELECTION';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
}

export interface ModalData {
  originalText: string;
  rephrasedText?: string;
  selection?: TextSelection;
  error?: string;
}