import { BackgroundService } from '../background/service';
import { storageService } from '../utils/storage';
import { APIClientFactory } from '../api/client';

// Mock dependencies
jest.mock('../utils/storage');
jest.mock('../api/client');

describe('BackgroundService', () => {
  let backgroundService: BackgroundService;
  let mockStorageService: jest.Mocked<typeof storageService>;
  let mockAPIClientFactory: jest.Mocked<typeof APIClientFactory>;

  beforeEach(() => {
    mockStorageService = storageService as jest.Mocked<typeof storageService>;
    mockAPIClientFactory = APIClientFactory as jest.Mocked<typeof APIClientFactory>;
    backgroundService = new BackgroundService();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create context menu on installation', () => {
      backgroundService.initialize();

      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'rephrase-text',
        title: 'Rephrase with AI',
        contexts: ['selection'],
      });
    });

    it('should add command listener for keyboard shortcuts', () => {
      backgroundService.initialize();

      expect(chrome.commands.onCommand.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should add context menu click listener', () => {
      backgroundService.initialize();

      expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should add message listener for content script communication', () => {
      backgroundService.initialize();

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('context menu handling', () => {
    it('should handle context menu click', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockAPIClientFactory.rephrase.mockResolvedValue({
        success: true,
        rephrasedText: 'Rephrased text',
      });

      chrome.tabs.query = jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.tabs.sendMessage = jest.fn();

      backgroundService.initialize();

      // Get the context menu click handler
      const contextMenuHandler = (chrome.contextMenus.onClicked.addListener as jest.Mock).mock.calls[0][0];

      await contextMenuHandler(
        { menuItemId: 'rephrase-text', selectionText: 'Original text' },
        { id: 1 }
      );

      expect(mockStorageService.getSettings).toHaveBeenCalled();
      expect(mockAPIClientFactory.rephrase).toHaveBeenCalledWith('Original text', mockSettings);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SHOW_MODAL',
        payload: {
          originalText: 'Original text',
          rephrasedText: 'Rephrased text',
        },
      });
    });

    it('should handle context menu click with API error', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
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

      chrome.tabs.query = jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.tabs.sendMessage = jest.fn();

      backgroundService.initialize();

      const contextMenuHandler = (chrome.contextMenus.onClicked.addListener as jest.Mock).mock.calls[0][0];

      await contextMenuHandler(
        { menuItemId: 'rephrase-text', selectionText: 'Original text' },
        { id: 1 }
      );

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SHOW_MODAL',
        payload: {
          originalText: 'Original text',
          error: 'API Error',
        },
      });
    });
  });

  describe('keyboard shortcut handling', () => {
    it('should handle rephrase-text command', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockAPIClientFactory.rephrase.mockResolvedValue({
        success: true,
        rephrasedText: 'Rephrased text',
      });

      chrome.tabs.query = jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.tabs.sendMessage = jest.fn().mockImplementation((tabId, message, callback) => {
        if (message.type === 'GET_SELECTION') {
          callback({ text: 'Selected text' });
        }
      });

      backgroundService.initialize();

      const commandHandler = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];

      await commandHandler('rephrase-text');

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'GET_SELECTION',
      }, expect.any(Function));

      expect(mockAPIClientFactory.rephrase).toHaveBeenCalledWith('Selected text', mockSettings);
    });

    it('should handle summarize-text command', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      (mockAPIClientFactory as any).summarize = jest.fn().mockResolvedValue({
        success: true,
        summaryText: 'Summary text',
      });

      chrome.tabs.query = jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.tabs.sendMessage = jest.fn().mockImplementation((tabId, message, callback) => {
        if (message.type === 'GET_SELECTION') {
          callback({ text: 'Selected text' });
        } else if (message.type === 'GET_PAGE_CONTENT') {
          callback({ text: 'Page content' });
        }
      });

      backgroundService.initialize();

      const commandHandler = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];

      await commandHandler('summarize-text');

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'GET_SELECTION',
      }, expect.any(Function));

      expect((mockAPIClientFactory as any).summarize).toHaveBeenCalledWith('Selected text', mockSettings);
      
      // Verify loading modal is shown first
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SHOW_SUMMARY_MODAL',
        payload: {
          originalText: 'Selected text',
          isLoading: true,
        },
      });
      
      // Verify update modal is sent with results
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'UPDATE_SUMMARY_MODAL',
        payload: {
          originalText: 'Selected text',
          summaryText: 'Summary text',
          isLoading: false,
        },
      });
    });

    it('should handle summarize-text command with API error', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      (mockAPIClientFactory as any).summarize = jest.fn().mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      chrome.tabs.query = jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1 }]);
      });

      chrome.tabs.sendMessage = jest.fn().mockImplementation((tabId, message, callback) => {
        if (message.type === 'GET_SELECTION') {
          callback({ text: 'Selected text' });
        }
      });

      backgroundService.initialize();

      const commandHandler = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];

      await commandHandler('summarize-text');

      // Verify loading modal is shown first
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SHOW_SUMMARY_MODAL',
        payload: {
          originalText: 'Selected text',
          isLoading: true,
        },
      });
      
      // Verify update modal is sent with error
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'UPDATE_SUMMARY_MODAL',
        payload: {
          originalText: 'Selected text',
          error: 'AI summary is not available at the moment, please try again',
          isLoading: false,
        },
      });
    });

    it('should handle unknown command', async () => {
      backgroundService.initialize();

      const commandHandler = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];

      await commandHandler('unknown-command');

      expect(mockStorageService.getSettings).not.toHaveBeenCalled();
      expect(mockAPIClientFactory.rephrase).not.toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should handle REPHRASE_TEXT message', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);
      mockAPIClientFactory.rephrase.mockResolvedValue({
        success: true,
        rephrasedText: 'Rephrased text',
      });

      backgroundService.initialize();

      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];

      const mockSendResponse = jest.fn();
      const result = await messageHandler(
        { type: 'REPHRASE_TEXT', payload: { text: 'Original text' } },
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true); // Indicates async response
      expect(mockAPIClientFactory.rephrase).toHaveBeenCalledWith('Original text', mockSettings);
    });

    it('should handle GET_SETTINGS message', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      backgroundService.initialize();

      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];

      const mockSendResponse = jest.fn();
      const result = await messageHandler(
        { type: 'GET_SETTINGS' },
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true); // Indicates async response
      expect(mockStorageService.getSettings).toHaveBeenCalled();
    });

    it('should handle SAVE_SETTINGS message', async () => {
      const mockSettings = {
        provider: 'anthropic' as const,
        openaiApiKey: '',
        claudeApiKey: 'test-key',
        openaiModel: 'gpt-4',
        claudeModel: 'claude-3-5-sonnet-20241022',
        customPrompt: '',
        customSummaryPrompt: 'Summarize the following text in a clear and concise manner with proper headings and paragraphs',
      };

      mockStorageService.saveSettings.mockResolvedValue();

      backgroundService.initialize();

      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];

      const mockSendResponse = jest.fn();
      const result = await messageHandler(
        { type: 'SAVE_SETTINGS', payload: mockSettings },
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true); // Indicates async response
      expect(mockStorageService.saveSettings).toHaveBeenCalledWith(mockSettings);
    });

    it('should handle unknown message type', async () => {
      backgroundService.initialize();

      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];

      const mockSendResponse = jest.fn();
      const result = messageHandler(
        { type: 'UNKNOWN_TYPE' },
        { tab: { id: 1 } },
        mockSendResponse
      );

      expect(result).toBe(true); // Always returns true to keep port open
      
      // Wait for async handling to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should send error response for unknown message type
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type'
      });
    });
  });
});