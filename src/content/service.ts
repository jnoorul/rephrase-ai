import { TextSelection, ChromeMessage, ModalData, SummaryModalData } from '../types';
import { marked } from 'marked';

export class ContentScript {
  private currentSelection: TextSelection | null = null;
  private selectionContextMenu: HTMLElement | null = null;
  private isProcessingMenuAction: boolean = false;

  initialize(): void {
    this.setupMessageHandlers();
    this.setupSelectionHandler();
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
    });
  }

  private setupSelectionHandler(): void {
    // Listen for text selection changes
    document.addEventListener('mouseup', e => {
      setTimeout(() => this.handleTextSelection(e), 10);
    });

    // Listen for keyboard selection changes
    document.addEventListener('keyup', e => {
      if (
        e.shiftKey ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        setTimeout(() => this.handleTextSelection(e), 10);
      }
    });

    // Hide menu when clicking outside or pressing escape
    document.addEventListener('mousedown', e => {
      if (this.selectionContextMenu && !this.selectionContextMenu.contains(e.target as Node)) {
        this.hideSelectionContextMenu();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hideSelectionContextMenu();
      }
    });
  }

  private handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    switch (message.type) {
      case 'GET_SELECTION':
        this.handleGetSelection(sendResponse);
        return false; // Sync response

      case 'SHOW_MODAL':
        this.showModal(message.payload);
        return false; // Sync response

      case 'UPDATE_MODAL':
        this.updateModal(message.payload);
        return false; // Sync response

      case 'SHOW_SUMMARY_MODAL':
        this.showSummaryModal(message.payload);
        return false; // Sync response

      case 'UPDATE_SUMMARY_MODAL':
        this.updateSummaryModal(message.payload);
        return false; // Sync response

      case 'HIDE_MODAL':
        this.hideModal();
        return false; // Sync response

      case 'REPLACE_TEXT':
        this.handleReplaceText(message.payload.newText);
        return false; // Sync response

      case 'GET_PAGE_CONTENT':
        this.handleGetPageContent(sendResponse);
        return false; // Sync response

      default:
        return false; // Unknown message type
    }
  }

  private handleGetSelection(sendResponse: (response?: any) => void): void {
    const selection = this.getSelection();
    sendResponse({ text: selection?.text || '' });
  }

  private handleGetPageContent(sendResponse: (response?: any) => void): void {
    const content = this.getMainPageContent();
    sendResponse({ text: content });
  }

  private handleReplaceText(newText: string): void {
    const selection = this.getSelection();
    if (selection) {
      this.replaceText(selection, newText);
    }
  }

  getSelection(): TextSelection | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();

    if (!text) {
      return null;
    }

    return {
      text,
      element:
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement!
          : (range.startContainer as HTMLElement),
      range,
    };
  }

  replaceText(selection: TextSelection, newText: string): void {
    if (selection.range) {
      selection.range.deleteContents();
      const textNode = document.createTextNode(newText);
      selection.range.insertNode(textNode);

      // Clear the selection and place cursor at the end
      const newSelection = window.getSelection();
      if (newSelection) {
        newSelection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.setEndAfter(textNode);
        newSelection.addRange(newRange);
      }
    }
  }

  showModal(data: ModalData): void {
    this.hideModal(); // Remove existing modal if any

    const modal = this.createModal(data);
    document.body.appendChild(modal);

    // Store current selection for later use
    this.currentSelection = this.getSelection();
  }

  hideModal(): void {
    const existingModal = document.querySelector('.rephrase-modal, .summary-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }

  getMainPageContent(): string {
    // Try to extract main content from common article containers
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '#main-content',
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextFromElement(element as HTMLElement);
        if (text.length > 100) {
          // Ensure we have substantial content
          return text;
        }
      }
    }

    // Fallback: get all text from body, excluding navigation and script elements
    const body = document.body;
    if (body) {
      return this.extractTextFromElement(body);
    }

    return '';
  }

  private extractTextFromElement(element: HTMLElement): string {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.nav',
      '.navigation',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ads',
      '.ad',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
    ];

    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return clone.textContent?.trim() || '';
  }

  showSummaryModal(data: SummaryModalData): void {
    this.hideModal(); // Remove existing modal if any

    const modal = this.createSummaryModal(data);
    document.body.appendChild(modal);
  }

  private createModal(data: ModalData): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'rephrase-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'rephrase-modal-content';

    if (data.isLoading) {
      modalContent.innerHTML = `
        <h3>Rephrase with AI</h3>
        <div class="rephrase-loading">
          <div class="rephrase-loading-spinner"></div>
          <div class="rephrase-loading-dots">
            <div class="rephrase-loading-dot"></div>
            <div class="rephrase-loading-dot"></div>
            <div class="rephrase-loading-dot"></div>
          </div>
          <div class="rephrase-loading-text">Rephrasing text...</div>
          <div class="rephrase-loading-subtext">AI is analyzing and rephrasing your text</div>
        </div>
      `;
    } else {
      modalContent.innerHTML = `
        <h3>Rephrase with AI</h3>
        
        <div class="rephrase-text-section">
          <label>Original Text:</label>
          <div class="text-content">${this.escapeHtml(data.originalText)}</div>
        </div>
        
        ${
          data.error
            ? `
          <div class="rephrase-error">
            Error: ${this.escapeHtml(data.error)}
          </div>
        `
            : `
          <div class="rephrase-text-section">
            <label>Rephrased Text:</label>
            <div class="text-content">${this.escapeHtml(data.rephrasedText || '')}</div>
          </div>
        `
        }
        
        <div class="rephrase-buttons">
          ${
            !data.error
              ? `
            <button class="rephrase-button accept">Accept</button>
            <button class="rephrase-button retry">Retry</button>
          `
              : `
            <button class="rephrase-button retry">Retry</button>
          `
          }
          <button class="rephrase-button cancel">Cancel</button>
        </div>
      `;
    }

    modal.appendChild(modalContent);

    // Add event listeners (only if not loading)
    if (!data.isLoading) {
      this.addModalEventListeners(modal, data);
    } else {
      // Add minimal event listeners for loading state
      this.addLoadingRephraseModalEventListeners(modal);
    }

    return modal;
  }

  private createSummaryModal(data: SummaryModalData): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'summary-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'summary-modal-content';

    if (data.isLoading) {
      modalContent.innerHTML = `
        <h3>AI Summary</h3>
        <div class="summary-loading">
          <div class="summary-loading-spinner"></div>
          <div class="summary-loading-dots">
            <div class="summary-loading-dot"></div>
            <div class="summary-loading-dot"></div>
            <div class="summary-loading-dot"></div>
          </div>
          <div class="summary-loading-text">Analyzing content...</div>
          <div class="summary-loading-subtext">AI is reading and summarizing the content for you</div>
        </div>
      `;
    } else {
      modalContent.innerHTML = `
        <h3>AI Summary</h3>
        
        ${
          data.error
            ? `
          <div class="summary-error">
            AI summary is not available at the moment, please try again
          </div>
        `
            : `
          <div class="summary-content">
            ${this.formatSummaryText(data.summaryText || '')}
          </div>
        `
        }
        
        <div class="summary-buttons">
          ${!data.error ? `<button class="summary-button copy">Copy</button>` : ''}
          <button class="summary-button retry">Retry</button>
          <button class="summary-button close">Close</button>
        </div>
      `;
    }

    modal.appendChild(modalContent);

    // Add event listeners (only if not loading)
    if (!data.isLoading) {
      this.addSummaryModalEventListeners(modal, data);
    } else {
      // Add minimal event listeners for loading state
      this.addLoadingModalEventListeners(modal);
    }

    return modal;
  }

  private formatSummaryText(text: string): string {
    // Configure marked for security and consistent output
    marked.setOptions({
      gfm: true, // Enable GitHub Flavored Markdown
      breaks: true, // Enable line breaks
    });

    try {
      // Trust marked.js to handle all markdown formatting correctly
      // The AI prompt now explicitly requests proper markdown format
      const htmlContent = marked.parse(text) as string;
      return htmlContent;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Fallback to simple paragraph formatting only on actual errors
      return `<p>${this.escapeHtml(text)}</p>`;
    }
  }

  private addModalEventListeners(modal: HTMLElement, data: ModalData): void {
    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.rephrase-modal-content');
    modalContent?.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Accept button
    const acceptButton = modal.querySelector('.rephrase-button.accept') as HTMLButtonElement;
    acceptButton?.addEventListener('click', () => {
      if (this.currentSelection && data.rephrasedText) {
        this.replaceText(this.currentSelection, data.rephrasedText);
        this.hideModal();
      }
    });

    // Retry button
    const retryButton = modal.querySelector('.rephrase-button.retry') as HTMLButtonElement;
    retryButton?.addEventListener('click', async () => {
      if (data.originalText) {
        // Show loading modal immediately with beautiful animation
        this.showModal({
          originalText: data.originalText,
          isLoading: true,
        });

        try {
          const response = await new Promise<any>((resolve, reject) => {
            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
              reject(new Error('Request timed out. Please try again.'));
            }, 30000); // 30 second timeout

            chrome.runtime.sendMessage(
              {
                type: 'REPHRASE_TEXT',
                payload: { text: data.originalText },
              },
              response => {
                clearTimeout(timeoutId);

                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }

                if (!response) {
                  reject(new Error('No response received from service'));
                  return;
                }

                resolve(response);
              }
            );
          });

          if (response && response.success) {
            this.updateModal({
              originalText: data.originalText,
              rephrasedText: response.rephrasedText,
              isLoading: false,
            });
          } else {
            this.updateModal({
              originalText: data.originalText,
              error: response?.error || 'Failed to rephrase text',
              isLoading: false,
            });
          }
        } catch (error) {
          this.updateModal({
            originalText: data.originalText,
            error: error instanceof Error ? error.message : 'Failed to rephrase text',
            isLoading: false,
          });
        }
      }
    });

    // Cancel button
    const cancelButton = modal.querySelector('.rephrase-button.cancel') as HTMLButtonElement;
    cancelButton?.addEventListener('click', () => {
      this.hideModal();
    });

    // Escape key to close modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });
  }

  private addSummaryModalEventListeners(modal: HTMLElement, data: SummaryModalData): void {
    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.summary-modal-content');
    modalContent?.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Close button
    const closeButton = modal.querySelector('.summary-button.close') as HTMLButtonElement;
    closeButton?.addEventListener('click', () => {
      this.hideModal();
    });

    // Retry button
    const retryButton = modal.querySelector('.summary-button.retry') as HTMLButtonElement;
    retryButton?.addEventListener('click', async () => {
      if (data.originalText) {
        // Show loading modal immediately with beautiful animation
        this.showSummaryModal({
          originalText: data.originalText,
          isLoading: true,
        });

        try {
          const response = await new Promise<any>((resolve, reject) => {
            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
              reject(new Error('Request timed out. Please try again.'));
            }, 60000); // 60 second timeout for summary (longer than rephrase)

            chrome.runtime.sendMessage(
              {
                type: 'SUMMARIZE_TEXT',
                payload: { text: data.originalText },
              },
              response => {
                clearTimeout(timeoutId);

                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }

                if (!response) {
                  reject(new Error('No response received from service'));
                  return;
                }

                resolve(response);
              }
            );
          });

          if (response && response.success) {
            this.updateSummaryModal({
              originalText: data.originalText,
              summaryText: response.summaryText,
              isLoading: false,
            });
          } else {
            this.updateSummaryModal({
              originalText: data.originalText,
              error: 'AI summary is not available at the moment, please try again',
              isLoading: false,
            });
          }
        } catch (error) {
          this.updateSummaryModal({
            originalText: data.originalText,
            error: 'AI summary is not available at the moment, please try again',
            isLoading: false,
          });
        }
      }
    });

    // Copy button
    const copyButton = modal.querySelector('.summary-button.copy') as HTMLButtonElement;
    copyButton?.addEventListener('click', async () => {
      if (data.summaryText) {
        try {
          // Get plain text version of the summary
          const plainText = data.summaryText.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n');
          await navigator.clipboard.writeText(plainText);

          // Show feedback
          const originalText = copyButton.textContent;
          copyButton.textContent = 'Copied!';
          copyButton.style.backgroundColor = '#4CAF50';

          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.backgroundColor = '';
          }, 2000);
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = data.summaryText.replace(/<[^>]*>/g, '');
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);

          const originalText = copyButton.textContent;
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = originalText;
          }, 2000);
        }
      }
    });

    // Escape key to close modal
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  private addLoadingModalEventListeners(modal: HTMLElement): void {
    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.summary-modal-content');
    modalContent?.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Allow closing by clicking outside for loading state (optional)
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideModal();
      }
    });
  }

  private addLoadingRephraseModalEventListeners(modal: HTMLElement): void {
    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.rephrase-modal-content');
    modalContent?.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Allow closing by clicking outside for loading state (optional)
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideModal();
      }
    });
  }

  private updateSummaryModal(data: SummaryModalData): void {
    const existingModal = document.querySelector('.summary-modal');
    if (!existingModal) return;

    const modalContent = existingModal.querySelector('.summary-modal-content');
    if (!modalContent) return;

    // Update modal content with results
    modalContent.innerHTML = `
      <h3>AI Summary</h3>
      
      ${
        data.error
          ? `
        <div class="summary-error">
          AI summary is not available at the moment, please try again
        </div>
      `
          : `
        <div class="summary-content">
          ${this.formatSummaryText(data.summaryText || '')}
        </div>
      `
      }
      
      <div class="summary-buttons">
        ${!data.error ? `<button class="summary-button copy">Copy</button>` : ''}
        <button class="summary-button retry">Retry</button>
        <button class="summary-button close">Close</button>
      </div>
    `;

    // Re-add event listeners for the updated content
    this.addSummaryModalEventListeners(existingModal as HTMLElement, data);
  }

  private updateModal(data: ModalData): void {
    const existingModal = document.querySelector('.rephrase-modal');
    if (!existingModal) return;

    const modalContent = existingModal.querySelector('.rephrase-modal-content');
    if (!modalContent) return;

    // Update modal content with results
    modalContent.innerHTML = `
      <h3>Rephrase with AI</h3>
      
      <div class="rephrase-text-section">
        <label>Original Text:</label>
        <div class="text-content">${this.escapeHtml(data.originalText)}</div>
      </div>
      
      ${
        data.error
          ? `
        <div class="rephrase-error">
          Error: ${this.escapeHtml(data.error)}
        </div>
      `
          : `
        <div class="rephrase-text-section">
          <label>Rephrased Text:</label>
          <div class="text-content">${this.escapeHtml(data.rephrasedText || '')}</div>
        </div>
      `
      }
      
      <div class="rephrase-buttons">
        ${
          !data.error
            ? `
          <button class="rephrase-button accept">Accept</button>
          <button class="rephrase-button retry">Retry</button>
        `
            : `
          <button class="rephrase-button retry">Retry</button>
        `
        }
        <button class="rephrase-button cancel">Cancel</button>
      </div>
    `;

    // Re-add event listeners for the updated content
    this.addModalEventListeners(existingModal as HTMLElement, data);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private handleTextSelection(event: MouseEvent | KeyboardEvent): void {
    // Don't show menu if we're currently processing a menu action
    if (this.isProcessingMenuAction) {
      return;
    }

    const selection = this.getSelection();

    if (selection && selection.text.length > 0) {
      // Show context menu for valid text selection
      this.showSelectionContextMenu(selection, event);
    } else {
      // Hide context menu if no text is selected
      this.hideSelectionContextMenu();
    }
  }

  private showSelectionContextMenu(
    selection: TextSelection,
    event: MouseEvent | KeyboardEvent
  ): void {
    // Remove existing menu if present
    this.hideSelectionContextMenu();

    // Get selection position for menu placement
    const range = selection.range;
    if (!range) return;

    const rect = range.getBoundingClientRect();

    // Create context menu
    this.selectionContextMenu = this.createSelectionContextMenu(selection);
    document.body.appendChild(this.selectionContextMenu);

    // Position the menu at the top-left corner of the selection
    const menuRect = this.selectionContextMenu.getBoundingClientRect();
    let top = rect.top - menuRect.height - 10;
    let left = rect.left;

    // Adjust position if menu would go off-screen
    if (top < 10) {
      top = rect.bottom + 10; // Position below selection instead
    }
    if (left < 10) {
      left = 10;
    }
    if (left + menuRect.width > window.innerWidth - 10) {
      left = window.innerWidth - menuRect.width - 10;
    }

    this.selectionContextMenu.style.top = `${top + window.scrollY}px`;
    this.selectionContextMenu.style.left = `${left + window.scrollX}px`;
  }

  private hideSelectionContextMenu(): void {
    if (this.selectionContextMenu) {
      this.selectionContextMenu.remove();
      this.selectionContextMenu = null;
    }
  }

  private createSelectionContextMenu(selection: TextSelection): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'selection-context-menu';

    // Rephrase button
    const rephraseButton = document.createElement('button');
    rephraseButton.className = 'selection-menu-button';
    rephraseButton.innerHTML = `
      <svg class="selection-menu-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9.75h4.875a2.625 2.625 0 0 1 0 5.25H12M8.25 9.75 10.5 7.5M8.25 9.75 10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
      </svg>
      <span>Rephrase</span>
    `;
    rephraseButton.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      // Set flag to prevent menu from reappearing
      this.isProcessingMenuAction = true;

      // Clear text selection to prevent menu from reappearing
      window.getSelection()?.removeAllRanges();

      // Hide menu
      this.hideSelectionContextMenu();

      // Store selection and trigger action
      this.currentSelection = selection;
      this.triggerRephrase(selection.text);

      // Reset flag after a brief delay to allow event processing
      setTimeout(() => {
        this.isProcessingMenuAction = false;
      }, 100);
    });

    // Summarize button
    const summarizeButton = document.createElement('button');
    summarizeButton.className = 'selection-menu-button';
    summarizeButton.innerHTML = `
      <svg class="selection-menu-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
      <span>Summarize</span>
    `;
    summarizeButton.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      // Set flag to prevent menu from reappearing
      this.isProcessingMenuAction = true;

      // Clear text selection to prevent menu from reappearing
      window.getSelection()?.removeAllRanges();

      // Hide menu
      this.hideSelectionContextMenu();

      // Trigger action
      this.triggerSummarize(selection.text);

      // Reset flag after a brief delay to allow event processing
      setTimeout(() => {
        this.isProcessingMenuAction = false;
      }, 100);
    });

    menu.appendChild(rephraseButton);
    menu.appendChild(summarizeButton);

    return menu;
  }

  private async triggerRephrase(text: string): Promise<void> {
    // Show loading modal immediately
    this.showModal({
      originalText: text,
      isLoading: true,
    });

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timed out. Please try again.'));
        }, 30000);

        chrome.runtime.sendMessage(
          {
            type: 'REPHRASE_TEXT',
            payload: { text },
          },
          response => {
            clearTimeout(timeoutId);

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response) {
              reject(new Error('No response received from service'));
              return;
            }

            resolve(response);
          }
        );
      });

      if (response && response.success) {
        this.updateModal({
          originalText: text,
          rephrasedText: response.rephrasedText,
          isLoading: false,
        });
      } else {
        this.updateModal({
          originalText: text,
          error: response?.error || 'Failed to rephrase text',
          isLoading: false,
        });
      }
    } catch (error) {
      this.updateModal({
        originalText: text,
        error: error instanceof Error ? error.message : 'Failed to rephrase text',
        isLoading: false,
      });
    }
  }

  private async triggerSummarize(text: string): Promise<void> {
    // Show loading modal immediately
    this.showSummaryModal({
      originalText: text,
      isLoading: true,
    });

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timed out. Please try again.'));
        }, 60000);

        chrome.runtime.sendMessage(
          {
            type: 'SUMMARIZE_TEXT',
            payload: { text },
          },
          response => {
            clearTimeout(timeoutId);

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response) {
              reject(new Error('No response received from service'));
              return;
            }

            resolve(response);
          }
        );
      });

      if (response && response.success) {
        this.updateSummaryModal({
          originalText: text,
          summaryText: response.summaryText,
          isLoading: false,
        });
      } else {
        this.updateSummaryModal({
          originalText: text,
          error: 'AI summary is not available at the moment, please try again',
          isLoading: false,
        });
      }
    } catch (error) {
      this.updateSummaryModal({
        originalText: text,
        error: 'AI summary is not available at the moment, please try again',
        isLoading: false,
      });
    }
  }
}

// Initialize the content script
const contentScript = new ContentScript();
contentScript.initialize();
