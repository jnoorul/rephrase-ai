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
    customSummaryPrompt:
      'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
  };

  // Hardcoded blacklist - read-only for users
  private readonly blacklistedUrls: string[] = ['*.ft.com', '*.internal-company.com'];

  async getSettings(): Promise<ExtensionSettings> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['settings'], result => {
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

  // Blacklist management methods
  getBlacklistedUrls(): string[] {
    return [...this.blacklistedUrls]; // Return copy to prevent modification
  }

  isUrlBlacklisted(url: string): boolean {
    return this.blacklistedUrls.some(pattern => this.matchesPattern(url, pattern));
  }

  private matchesPattern(url: string, pattern: string): boolean {
    // Handle regex patterns: /pattern/flags
    if (pattern.startsWith('/') && pattern.includes('/')) {
      const regexMatch = pattern.match(/^\/(.+)\/([gimsu]*)$/);
      if (regexMatch) {
        try {
          return new RegExp(regexMatch[1], regexMatch[2]).test(url);
        } catch (e) {
          console.warn('Rephrase AI: Invalid regex pattern:', pattern);
          return false;
        }
      }
    }

    let regexPattern;

    // Handle domain-only wildcard patterns (e.g., "*.internal-company.com")
    if (pattern.includes('*') && !pattern.includes('://')) {
      // For domain patterns like "*.internal-company.com"
      // Replace * with pattern to match subdomains
      regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '[^.\\s/]+'); // Replace * with subdomain pattern
      regexPattern = `^https?://[^/]*${regexPattern}(/.*)?$`;
    } else {
      // Handle full URL patterns (e.g., "https://example.com/*")
      regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*'); // Convert * to .*
      regexPattern = `^${regexPattern}$`;
    }

    try {
      return new RegExp(regexPattern).test(url);
    } catch (e) {
      console.warn('Rephrase AI: Invalid pattern:', pattern, 'Generated regex:', regexPattern);
      return false;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
