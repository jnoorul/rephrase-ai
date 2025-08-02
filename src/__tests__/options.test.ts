import { OptionsController } from '../options/controller';
import { storageService } from '../utils/storage';
import { APIClientFactory } from '../api/client';
import { ExtensionSettings } from '../types';

// Mock dependencies
jest.mock('../utils/storage');
jest.mock('../api/client');

describe('OptionsController', () => {
  let optionsController: OptionsController;
  let mockStorageService: jest.Mocked<typeof storageService>;
  let mockAPIClientFactory: jest.Mocked<typeof APIClientFactory>;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <select id="provider">
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI</option>
      </select>
      <select id="claudeModel">
        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
      </select>
      <input type="text" id="claudeApiKey" />
      <select id="openaiModel">
        <option value="gpt-4">GPT-4</option>
        <option value="gpt-4-turbo">GPT-4 Turbo</option>
      </select>
      <input type="text" id="openaiApiKey" />
      <textarea id="customPrompt"></textarea>
      <textarea id="customSummaryPrompt"></textarea>
      <button id="saveSettings">Save Settings</button>
      <button id="testConnection">Test Connection</button>
      <div id="status"></div>
    `;

    mockStorageService = storageService as jest.Mocked<typeof storageService>;
    mockAPIClientFactory = APIClientFactory as jest.Mocked<typeof APIClientFactory>;
    
    // Mock the validateSettings method
    mockStorageService.validateSettings = jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
    });
    
    // Mock the getDefaultSettings method
    mockStorageService.getDefaultSettings = jest.fn().mockReturnValue({
      provider: 'anthropic',
      openaiApiKey: '',
      claudeApiKey: '',
      openaiModel: 'gpt-4',
      claudeModel: 'claude-3-5-sonnet-20241022',
      customPrompt: '',
      customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
    });
    
    optionsController = new OptionsController();
    
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
        customPrompt: 'Custom prompt',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await optionsController.initialize();

      expect(mockStorageService.getSettings).toHaveBeenCalled();
    });

    it('should handle settings loading error', async () => {
      mockStorageService.getSettings.mockRejectedValue(new Error('Storage error'));

      await optionsController.initialize();

      expect(mockStorageService.getSettings).toHaveBeenCalled();
    });
  });

  describe('form updates', () => {
    it('should update form with loaded settings', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'openai-key',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: 'Custom prompt',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      await optionsController.initialize();

      const providerSelect = document.getElementById('provider') as HTMLSelectElement;
      const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
      const claudeApiKeyInput = document.getElementById('claudeApiKey') as HTMLInputElement;
      const openaiModelSelect = document.getElementById('openaiModel') as HTMLSelectElement;
      const claudeModelSelect = document.getElementById('claudeModel') as HTMLSelectElement;
      const customPromptTextarea = document.getElementById('customPrompt') as HTMLTextAreaElement;

      expect(providerSelect.value).toBe('openai');
      expect(openaiApiKeyInput.value).toBe('openai-key');
      expect(claudeApiKeyInput.value).toBe('claude-key');
      expect(openaiModelSelect.value).toBe('gpt-4-turbo');
      expect(claudeModelSelect.value).toBe('claude-3-5-sonnet-20241022');
      expect(customPromptTextarea.value).toBe('Custom prompt');
    });
  });

  describe('save settings', () => {
    it('should save settings successfully', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: 'openai-key',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockResolvedValue();
      mockStorageService.validateSettings.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await optionsController.initialize();

      // Update form
      const providerSelect = document.getElementById('provider') as HTMLSelectElement;
      const claudeApiKeyInput = document.getElementById('claudeApiKey') as HTMLInputElement;
      const customPromptTextarea = document.getElementById('customPrompt') as HTMLTextAreaElement;

      providerSelect.value = 'anthropic';
      claudeApiKeyInput.value = 'new-claude-key';
      customPromptTextarea.value = 'New custom prompt';

      // Click save
      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockStorageService.saveSettings).toHaveBeenCalledWith({
        provider: 'anthropic',
        openaiApiKey: 'openai-key',
        claudeApiKey: 'new-claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: 'New custom prompt',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      });
    });

    it('should handle save error', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: '',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockRejectedValue(new Error('Save error'));
      mockStorageService.validateSettings.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await optionsController.initialize();

      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Failed to save settings');
    });
  });

  describe('test connection', () => {
    it('should test connection successfully', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockAPIClientFactory.rephrase.mockResolvedValue({
        success: true,
        rephrasedText: 'Test response',
      });
      mockStorageService.validateSettings.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await optionsController.initialize();

      const testButton = document.getElementById('testConnection') as HTMLButtonElement;
      testButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAPIClientFactory.rephrase).toHaveBeenCalledWith(
        'Test connection',
        expect.objectContaining({
          provider: 'anthropic',
          claudeApiKey: 'claude-key',
        })
      );

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Connection successful');
    });

    it('should handle test connection error', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockAPIClientFactory.rephrase.mockResolvedValue({
        success: false,
        error: 'API Error',
      });
      mockStorageService.validateSettings.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await optionsController.initialize();

      const testButton = document.getElementById('testConnection') as HTMLButtonElement;
      testButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Connection failed');
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
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.validateSettings.mockReturnValue({
        isValid: false,
        errors: ['Claude API key is required when Anthropic provider is selected'],
      });

      await optionsController.initialize();

      // Try to save without API key
      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Claude API key is required when Anthropic provider is selected');
    });

    it('should show success message after successful save', async () => {
      const mockSettings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: 'claude-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockStorageService.saveSettings.mockResolvedValue();
      mockStorageService.validateSettings.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await optionsController.initialize();

      const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      const status = document.getElementById('status') as HTMLElement;
      expect(status.textContent).toContain('Settings saved successfully');
    });
  });
});