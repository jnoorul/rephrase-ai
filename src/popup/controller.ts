import { storageService } from '../utils/storage';
import { ExtensionSettings } from '../types';

export class PopupController {
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
    // Provider change
    const providerSelect = document.getElementById('provider') as HTMLSelectElement;
    providerSelect?.addEventListener('change', () => {
      this.updateModelOptions();
    });

    // Save settings
    const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    saveButton?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Open options
    const openOptionsButton = document.getElementById('openOptions') as HTMLButtonElement;
    openOptionsButton?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  private updateForm(): void {
    const providerSelect = document.getElementById('provider') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;

    if (providerSelect && this.settings) {
      providerSelect.value = this.settings.provider;
    }

    if (apiKeyInput && this.settings) {
      apiKeyInput.value = this.settings.provider === 'openai' 
        ? this.settings.openaiApiKey || ''
        : this.settings.claudeApiKey || '';
    }

    this.updateModelOptions();
  }

  private updateModelOptions(): void {
    const providerSelect = document.getElementById('provider') as HTMLSelectElement;
    const modelSelect = document.getElementById('model') as HTMLSelectElement;

    if (!providerSelect || !modelSelect || !this.settings) return;

    const provider = providerSelect.value as 'openai' | 'anthropic';
    
    if (provider === 'openai') {
      modelSelect.innerHTML = `
        <option value="gpt-4">GPT-4</option>
        <option value="gpt-4-turbo">GPT-4 Turbo</option>
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
      `;
      modelSelect.value = this.settings.openaiModel;
    } else {
      modelSelect.innerHTML = `
        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
      `;
      modelSelect.value = this.settings.claudeModel;
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const formData = this.getFormData();
      
      if (!this.validateForm(formData)) {
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
    const providerSelect = document.getElementById('provider') as HTMLSelectElement;
    const modelSelect = document.getElementById('model') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;

    const provider = providerSelect?.value as 'openai' | 'anthropic';
    const model = modelSelect?.value || '';
    const apiKey = apiKeyInput?.value || '';

    const defaultSettings = storageService.getDefaultSettings();
    const baseSettings = this.settings || defaultSettings;

    const updatedSettings: ExtensionSettings = {
      ...baseSettings,
      provider,
    };

    if (provider === 'openai') {
      updatedSettings.openaiModel = model;
      updatedSettings.openaiApiKey = apiKey;
    } else {
      updatedSettings.claudeModel = model;
      updatedSettings.claudeApiKey = apiKey;
    }

    return updatedSettings;
  }

  private validateForm(settings: ExtensionSettings): boolean {
    const errors: string[] = [];

    if (settings.provider === 'openai' && !settings.openaiApiKey?.trim()) {
      errors.push('OpenAI API key is required');
    }

    if (settings.provider === 'anthropic' && !settings.claudeApiKey?.trim()) {
      errors.push('Claude API key is required');
    }

    if (settings.provider === 'openai' && !settings.openaiModel?.trim()) {
      errors.push('OpenAI model is required');
    }

    if (settings.provider === 'anthropic' && !settings.claudeModel?.trim()) {
      errors.push('Claude model is required');
    }

    if (errors.length > 0) {
      this.showStatus(errors.join(', '), 'error');
      return false;
    }

    return true;
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    const statusElement = document.getElementById('status') as HTMLElement;
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // Hide after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popupController = new PopupController();
  popupController.initialize();
});