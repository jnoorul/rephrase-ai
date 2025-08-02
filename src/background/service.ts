import { storageService } from '../utils/storage';
import { APIClientFactory } from '../api/client';
import { ChromeMessage, MessageType } from '../types';

export class BackgroundService {
  initialize(): void {
    this.setupContextMenu();
    this.setupKeyboardShortcuts();
    this.setupMessageHandlers();
  }

  private setupContextMenu(): void {
    chrome.contextMenus.create({
      id: 'rephrase-text',
      title: 'Rephrase with AI',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'summarize-page',
      title: 'Summarize page with AI',
      contexts: ['page'],
      icons: {
        '16': 'icons/summary-icon16.png'
      }
    } as any);

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'rephrase-text' && info.selectionText && tab?.id) {
        await this.handleRephraseRequest(info.selectionText, tab.id);
      } else if (info.menuItemId === 'summarize-page' && tab?.id) {
        await this.handlePageSummarizeRequest(tab.id);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    chrome.commands.onCommand.addListener(async command => {
      if (command === 'rephrase-text') {
        await this.handleRephraseKeyboardShortcut();
      } else if (command === 'summarize-text') {
        await this.handleSummarizeKeyboardShortcut();
      }
    });
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      // Handle async operations properly to prevent port closure
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message port open for async response
    });
  }

  private async handleRephraseKeyboardShortcut(): Promise<void> {
    const [tab] = await this.getActiveTab();
    if (!tab?.id) return;

    // Request selection from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, async response => {
      if (response?.text) {
        await this.handleRephraseRequest(response.text, tab.id!);
      }
    });
  }

  private async handleSummarizeKeyboardShortcut(): Promise<void> {
    const [tab] = await this.getActiveTab();
    if (!tab?.id) return;

    // Request selection from content script first
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, async selectionResponse => {
      let textToSummarize = selectionResponse?.text || '';

      // If no text is selected, get the page content
      if (!textToSummarize.trim()) {
        chrome.tabs.sendMessage(tab.id!, { type: 'GET_PAGE_CONTENT' }, async pageResponse => {
          textToSummarize = pageResponse?.text || '';

          if (textToSummarize.trim()) {
            await this.handleSummaryRequest(textToSummarize, tab.id!);
          } else {
            // Show error modal if no content is available
            chrome.tabs.sendMessage(tab.id!, {
              type: 'SHOW_SUMMARY_MODAL',
              payload: {
                originalText: '',
                error: 'AI summary is not available at the moment, please try again',
              },
            });
          }
        });
      } else {
        await this.handleSummaryRequest(textToSummarize, tab.id!);
      }
    });
  }

  private async handlePageSummarizeRequest(tabId: number): Promise<void> {
    // Get the page content and summarize it
    chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' }, async pageResponse => {
      const textToSummarize = pageResponse?.text || '';

      if (textToSummarize.trim()) {
        await this.handleSummaryRequest(textToSummarize, tabId);
      } else {
        // Show error modal if no content is available
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_SUMMARY_MODAL',
          payload: {
            originalText: '',
            error: 'AI summary is not available at the moment, please try again',
          },
        });
      }
    });
  }

  private async handleRephraseRequest(text: string, tabId: number): Promise<void> {
    // Show loading modal immediately
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_MODAL',
      payload: {
        originalText: text,
        isLoading: true,
      },
    });

    try {
      const settings = await storageService.getSettings();
      const result = await APIClientFactory.rephrase(text, settings);

      if (result.success) {
        chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_MODAL',
          payload: {
            originalText: text,
            rephrasedText: result.rephrasedText,
            isLoading: false,
          },
        });
      } else {
        chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_MODAL',
          payload: {
            originalText: text,
            error: result.error,
            isLoading: false,
          },
        });
      }
    } catch (error) {
      chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_MODAL',
        payload: {
          originalText: text,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false,
        },
      });
    }
  }

  private async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'REPHRASE_TEXT':
          await this.handleRephraseTextMessage(message, sendResponse);
          break;

        case 'SUMMARIZE_TEXT':
          await this.handleSummarizeTextMessage(message, sendResponse);
          break;

        case 'GET_SETTINGS':
          await this.handleGetSettingsMessage(sendResponse);
          break;

        case 'SAVE_SETTINGS':
          await this.handleSaveSettingsMessage(message, sendResponse);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          break;
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  private async handleRephraseTextMessage(
    message: ChromeMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const settings = await storageService.getSettings();
      const result = await APIClientFactory.rephrase(message.payload.text, settings);
      sendResponse(result);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleGetSettingsMessage(sendResponse: (response?: any) => void): Promise<void> {
    try {
      const settings = await storageService.getSettings();
      sendResponse({ success: true, settings });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
      });
    }
  }

  private async handleSaveSettingsMessage(
    message: ChromeMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      await storageService.saveSettings(message.payload);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save settings',
      });
    }
  }

  private async handleSummaryRequest(text: string, tabId: number): Promise<void> {
    // Show loading modal immediately
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_SUMMARY_MODAL',
      payload: {
        originalText: text,
        isLoading: true,
      },
    });

    try {
      const settings = await storageService.getSettings();
      const result = await APIClientFactory.summarize(text, settings);

      if (result.success) {
        chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_SUMMARY_MODAL',
          payload: {
            originalText: text,
            summaryText: result.summaryText,
            isLoading: false,
          },
        });
      } else {
        chrome.tabs.sendMessage(tabId, {
          type: 'UPDATE_SUMMARY_MODAL',
          payload: {
            originalText: text,
            error: 'AI summary is not available at the moment, please try again',
            isLoading: false,
          },
        });
      }
    } catch (error) {
      chrome.tabs.sendMessage(tabId, {
        type: 'UPDATE_SUMMARY_MODAL',
        payload: {
          originalText: text,
          error: 'AI summary is not available at the moment, please try again',
          isLoading: false,
        },
      });
    }
  }

  private async handleSummarizeTextMessage(
    message: ChromeMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const settings = await storageService.getSettings();
      const result = await APIClientFactory.summarize(message.payload.text, settings);
      sendResponse(result);
    } catch (error) {
      sendResponse({
        success: false,
        error: 'AI summary is not available at the moment, please try again',
      });
    }
  }

  private getActiveTab(): Promise<chrome.tabs.Tab[]> {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.initialize();
