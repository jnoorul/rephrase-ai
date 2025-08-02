import { storageService } from '../utils/storage';
import { APIClientFactory } from '../api/client';
import { ExtensionSettings } from '../types';

export class OptionsController {
  private settings: ExtensionSettings;

  constructor() {
    this.settings = storageService.getDefaultSettings();
  }

  async initialize(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateForm();
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await storageService.getSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = storageService.getDefaultSettings();
      this.showStatus('Failed to load settings', 'error');
    }
  }

  private setupEventListeners(): void {
    // Save settings
    const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    saveButton?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Test connection
    const testButton = document.getElementById('testConnection') as HTMLButtonElement;
    testButton?.addEventListener('click', () => {
      this.testConnection();
    });

    // Open shortcuts settings
    const openShortcutsButton = document.getElementById('openShortcuts') as HTMLButtonElement;
    openShortcutsButton?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  private updateForm(): void {
    if (!this.settings) return;

    const elements = {
      provider: document.getElementById('provider') as HTMLSelectElement,
      claudeModel: document.getElementById('claudeModel') as HTMLSelectElement,
      claudeApiKey: document.getElementById('claudeApiKey') as HTMLInputElement,
      openaiModel: document.getElementById('openaiModel') as HTMLSelectElement,
      openaiApiKey: document.getElementById('openaiApiKey') as HTMLInputElement,
      customPrompt: document.getElementById('customPrompt') as HTMLTextAreaElement,
    };

    if (elements.provider) {
      elements.provider.value = this.settings.provider;
    }

    if (elements.claudeModel) {
      elements.claudeModel.value = this.settings.claudeModel;
    }

    if (elements.claudeApiKey) {
      elements.claudeApiKey.value = this.settings.claudeApiKey || '';
    }

    if (elements.openaiModel) {
      elements.openaiModel.value = this.settings.openaiModel;
    }

    if (elements.openaiApiKey) {
      elements.openaiApiKey.value = this.settings.openaiApiKey || '';
    }

    if (elements.customPrompt) {
      elements.customPrompt.value = this.settings.customPrompt || '';
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const formData = this.getFormData();
      
      const validation = storageService.validateSettings(formData);
      if (!validation.isValid) {
        this.showStatus(validation.errors.join(', '), 'error');
        return;
      }

      await storageService.saveSettings(formData);
      this.settings = formData;
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  private getFormData(): ExtensionSettings {
    const elements = {
      provider: document.getElementById('provider') as HTMLSelectElement,
      claudeModel: document.getElementById('claudeModel') as HTMLSelectElement,
      claudeApiKey: document.getElementById('claudeApiKey') as HTMLInputElement,
      openaiModel: document.getElementById('openaiModel') as HTMLSelectElement,
      openaiApiKey: document.getElementById('openaiApiKey') as HTMLInputElement,
      customPrompt: document.getElementById('customPrompt') as HTMLTextAreaElement,
    };

    const defaultSettings = storageService.getDefaultSettings();

    return {
      provider: elements.provider?.value as 'openai' | 'anthropic' || this.settings?.provider || defaultSettings.provider,
      claudeModel: elements.claudeModel?.value || this.settings?.claudeModel || defaultSettings.claudeModel,
      claudeApiKey: elements.claudeApiKey?.value || this.settings?.claudeApiKey || defaultSettings.claudeApiKey || '',
      openaiModel: elements.openaiModel?.value || this.settings?.openaiModel || defaultSettings.openaiModel,
      openaiApiKey: elements.openaiApiKey?.value || this.settings?.openaiApiKey || defaultSettings.openaiApiKey || '',
      customPrompt: elements.customPrompt?.value || this.settings?.customPrompt || defaultSettings.customPrompt || '',
    };
  }

  private async testConnection(): Promise<void> {
    try {
      this.showStatus('Testing connection...', 'success');
      
      const formData = this.getFormData();
      const validation = storageService.validateSettings(formData);
      
      if (!validation.isValid) {
        this.showStatus(validation.errors.join(', '), 'error');
        return;
      }

      const result = await APIClientFactory.rephrase('Test connection', formData);
      
      if (result.success) {
        this.showStatus('Connection successful! API is working correctly.', 'success');
      } else {
        this.showStatus(`Connection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      this.showStatus('Failed to test connection', 'error');
    }
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    const statusElement = document.getElementById('status') as HTMLElement;
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // Hide after 5 seconds (longer for options page)
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const optionsController = new OptionsController();
  optionsController.initialize();
});