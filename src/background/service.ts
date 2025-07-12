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

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'rephrase-text' && info.selectionText && tab?.id) {
        await this.handleRephraseRequest(info.selectionText, tab.id);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    chrome.commands.onCommand.addListener(async (command) => {
      if (command === 'rephrase-text') {
        await this.handleKeyboardShortcut();
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

  private async handleKeyboardShortcut(): Promise<void> {
    const [tab] = await this.getActiveTab();
    if (!tab?.id) return;

    // Request selection from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, async (response) => {
      if (response?.text) {
        await this.handleRephraseRequest(response.text, tab.id!);
      }
    });
  }

  private async handleRephraseRequest(text: string, tabId: number): Promise<void> {
    try {
      const settings = await storageService.getSettings();
      const result = await APIClientFactory.rephrase(text, settings);

      if (result.success) {
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_MODAL',
          payload: {
            originalText: text,
            rephrasedText: result.rephrasedText,
          },
        });
      } else {
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_MODAL',
          payload: {
            originalText: text,
            error: result.error,
          },
        });
      }
    } catch (error) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_MODAL',
        payload: {
          originalText: text,
          error: error instanceof Error ? error.message : 'Unknown error',
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
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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

  private getActiveTab(): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.initialize();