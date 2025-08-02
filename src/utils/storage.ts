import { ExtensionSettings } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class StorageService {
  private readonly defaultSettings: ExtensionSettings = {
    provider: 'anthropic',
    openaiApiKey: '',
    claudeApiKey: '',
    openaiModel: 'gpt-4',
    claudeModel: 'claude-3-5-sonnet-20241022',
    customPrompt: '',
    customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
  };

  async getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['settings'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const settings = result.settings || this.defaultSettings;
        resolve({ ...this.defaultSettings, ...settings });
      });
    });
  }

  async saveSettings(settings: ExtensionSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  validateSettings(settings: ExtensionSettings): ValidationResult {
    const errors: string[] = [];

    // Check provider-specific API keys
    if (settings.provider === 'openai' && !settings.openaiApiKey?.trim()) {
      errors.push('OpenAI API key is required when OpenAI provider is selected');
    }

    if (settings.provider === 'anthropic' && !settings.claudeApiKey?.trim()) {
      errors.push('Claude API key is required when Anthropic provider is selected');
    }

    // Check model selection
    if (settings.provider === 'openai' && !settings.openaiModel?.trim()) {
      errors.push('OpenAI model is required');
    }

    if (settings.provider === 'anthropic' && !settings.claudeModel?.trim()) {
      errors.push('Claude model is required');
    }

    // Check if provider is valid
    if (!['openai', 'anthropic'].includes(settings.provider)) {
      errors.push('Invalid provider selected');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getDefaultSettings(): ExtensionSettings {
    return { ...this.defaultSettings };
  }
}

// Singleton instance
export const storageService = new StorageService();