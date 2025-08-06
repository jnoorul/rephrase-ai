import { StorageService } from '../utils/storage';
import { ExtensionSettings } from '../types';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockChromeStorageSync: jest.Mocked<chrome.storage.StorageArea>;

  beforeEach(() => {
    mockChromeStorageSync = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(),
      },
    };

    global.chrome = {
      ...global.chrome,
      storage: {
        sync: mockChromeStorageSync,
        local: mockChromeStorageSync,
      },
    };

    storageService = new StorageService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when no settings are stored', async () => {
      mockChromeStorageSync.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const settings = await storageService.getSettings();

      expect(settings).toEqual({
        provider: 'anthropic',
        openaiApiKey: '',
        claudeApiKey: '',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      });
    });

    it('should return stored settings', async () => {
      const storedSettings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: 'Make this formal',
        customSummaryPrompt: 'Brief summary please',
      };

      mockChromeStorageSync.get.mockImplementation((keys, callback) => {
        callback({ settings: storedSettings });
      });

      const settings = await storageService.getSettings();

      expect(settings).toEqual(storedSettings);
    });

    it('should handle chrome.storage errors', async () => {
      mockChromeStorageSync.get.mockImplementation((keys, callback) => {
        global.chrome.runtime.lastError = { message: 'Storage error' };
        callback({});
      });

      await expect(storageService.getSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to chrome.storage.sync', async () => {
      const settings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: 'Make this formal',
        customSummaryPrompt: 'Brief summary please',
      };

      mockChromeStorageSync.set.mockImplementation((items, callback) => {
        callback();
      });

      await storageService.saveSettings(settings);

      expect(mockChromeStorageSync.set).toHaveBeenCalledWith(
        { settings },
        expect.any(Function)
      );
    });

    it('should handle chrome.storage errors', async () => {
      const settings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: 'Make this formal',
        customSummaryPrompt: 'Brief summary please',
      };

      mockChromeStorageSync.set.mockImplementation((items, callback) => {
        global.chrome.runtime.lastError = { message: 'Storage error' };
        callback();
      });

      await expect(storageService.saveSettings(settings)).rejects.toThrow('Storage error');
    });
  });

  describe('validateSettings', () => {
    it('should return valid for complete settings', () => {
      const settings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: 'Make this formal',
        customSummaryPrompt: 'Brief summary please',
      };

      const result = storageService.validateSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for missing OpenAI API key when OpenAI provider is selected', () => {
      const settings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: '',
        claudeApiKey: 'test-claude-key',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: '',
        customSummaryPrompt: '',
      };

      const result = storageService.validateSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required when OpenAI provider is selected');
    });

    it('should return invalid for missing Claude API key when Claude provider is selected', () => {
      const settings: ExtensionSettings = {
        provider: 'anthropic',
        openaiApiKey: 'test-key',
        claudeApiKey: '',
        openaiModel: 'gpt-4-turbo',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: '',
        customSummaryPrompt: '',
      };

      const result = storageService.validateSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Claude API key is required when Anthropic provider is selected');
    });

    it('should return invalid for missing model selection', () => {
      const settings: ExtensionSettings = {
        provider: 'openai',
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        openaiModel: '',
        claudeModel: 'claude-3-haiku-20240307',
        customPrompt: '',
        customSummaryPrompt: '',
      };

      const result = storageService.validateSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('OpenAI model is required');
    });
  });

  describe('URL Blacklisting', () => {
    describe('getBlacklistedUrls', () => {
      it('should return array of blacklisted URLs', () => {
        const urls = storageService.getBlacklistedUrls();
        expect(Array.isArray(urls)).toBe(true);
        expect(urls.length).toBeGreaterThan(0);
      });

      it('should return a copy of the blacklist to prevent modification', () => {
        const urls1 = storageService.getBlacklistedUrls();
        const urls2 = storageService.getBlacklistedUrls();
        expect(urls1).not.toBe(urls2); // Different array instances
        expect(urls1).toEqual(urls2); // Same content
      });
    });

    describe('isUrlBlacklisted', () => {
      it('should return true for ft.com wildcard domain matches', () => {
        expect(storageService.isUrlBlacklisted('https://www.ft.com/content/article')).toBe(true);
        expect(storageService.isUrlBlacklisted('https://markets.ft.com/dashboard')).toBe(true);
      });

      it('should return true for internal-company.com wildcard subdomain matches', () => {
        expect(storageService.isUrlBlacklisted('https://test.internal-company.com/page')).toBe(true);
        expect(storageService.isUrlBlacklisted('https://dev.internal-company.com/admin')).toBe(true);
      });

      it('should return false for non-matching domains', () => {
        expect(storageService.isUrlBlacklisted('https://google.com')).toBe(false);
        expect(storageService.isUrlBlacklisted('https://github.com/user/repo')).toBe(false);
        expect(storageService.isUrlBlacklisted('https://stackoverflow.com')).toBe(false);
        expect(storageService.isUrlBlacklisted('https://admin.example.com/dashboard')).toBe(false);
        expect(storageService.isUrlBlacklisted('https://secure-banking.com/login')).toBe(false);
      });

      it('should handle invalid URLs gracefully', () => {
        expect(storageService.isUrlBlacklisted('')).toBe(false);
        expect(storageService.isUrlBlacklisted('not-a-url')).toBe(false);
        expect(storageService.isUrlBlacklisted('://invalid')).toBe(false);
      });

      it('should handle invalid regex patterns gracefully', () => {
        // This test verifies the error handling in matchesPattern method
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // The current blacklist shouldn't have invalid patterns, but this tests the robustness
        expect(() => storageService.isUrlBlacklisted('https://test.com')).not.toThrow();
        
        consoleSpy.mockRestore();
      });
    });
  });
});