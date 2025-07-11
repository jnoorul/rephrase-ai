import { PopupController } from '../popup/controller';
import { storageService } from '../utils/storage';
import { ExtensionSettings } from '../types';

// Mock dependencies
jest.mock('../utils/storage');

describe('PopupController', () => {
  let popupController: PopupController;
  let mockStorageService: jest.Mocked<typeof storageService>;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <select id="provider">
        <option value="anthropic">Anthropic Claude</option>
        <option value="openai">OpenAI</option>
      </select>
      <select id="model">
        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
        <option value="gpt-4">GPT-4</option>
      </select>
      <input type="text" id="apiKey" />
      <button id="saveSettings">Save Settings</button>
      <button id="openOptions">Open Options</button>
      <div id="status"></div>
    `;

    mockStorageService = storageService as jest.Mocked<typeof storageService>;
    popupController = new PopupController();
    
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should load settings on initialization', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: 'openai-key',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await popupController.initialize();

      expect(mockStorageService.getSettings).toHaveBeenCalled();
    });

    it('should handle settings loading error', async () => {
      mockStorageService.getSettings.mockRejectedValue(new Error('Storage error'));

      await popupController.initialize();

      expect(mockStorageService.getSettings).toHaveBeenCalled();
    });
  });

  describe('form updates', () => {
    it('should update model options when provider changes', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: '',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await popupController.initialize();

      // Change provider to OpenAI
      const providerSelect = document.getElementById('provider') as HTMLSelectElement;
      providerSelect.value = 'openai';
      providerSelect.dispatchEvent(new Event('change'));

      const modelSelect = document.getElementById('model') as HTMLSelectElement;
      expect(modelSelect.innerHTML).toContain('GPT-4');
    });

    it('should update form when settings change', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: '',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await popupController.initialize();

      const providerSelect = document.getElementById('provider') as HTMLSelectElement;
      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
      const modelSelect = document.getElementById('model') as HTMLSelectElement;

      expect(providerSelect.value).toBe('openai');
      expect(apiKeyInput.value).toBe('test-key');
      expect(modelSelect.value).toBe('gpt-4-turbo');
    });
  });

  describe('save settings', () => {
    it('should save settings successfully', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockResolvedValue();

      await popupController.initialize();

      // Update form
      const providerSelect = document.getElementById('provider') as HTMLSelectElement;
      const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
      const modelSelect = document.getElementById('model') as HTMLSelectElement;

      providerSelect.value = 'anthropic';
      apiKeyInput.value = 'new-key';
      modelSelect.value = 'claude-3-5-sonnet-20241022';

      // Click save
      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockStorageService.saveSettings).toHaveBeenCalledWith({
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'new-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      });
    });

    it('should handle save error', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockRejectedValue(new Error('Save error'));

      await popupController.initialize();

      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Failed to save settings');
    });
  });

  describe('open options', () => {
    it('should open options page', async () => {
      chrome.runtime.openOptionsPage = jest.fn();

      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: '',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await popupController.initialize();

      const openOptionsButton = document.getElementById('openOptions') as HTMLButtonElement;
      openOptionsButton.click();

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: '',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await popupController.initialize();

      // Try to save without API key
      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Claude API key is required');
    });

    it('should show success message after successful save', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockResolvedValue();

      await popupController.initialize();

      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Settings saved successfully');
    });
  });
});