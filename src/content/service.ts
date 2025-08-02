import { TextSelection, ChromeMessage, ModalData, SummaryModalData } from '../types';

export class ContentScript {
  private currentSelection: TextSelection | null = null;

  initialize(): void {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      return this.handleMessage(message, sender, sendResponse);
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
      element: range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement! 
        : range.startContainer as HTMLElement,
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
      '#main-content'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextFromElement(element as HTMLElement);
        if (text.length > 100) { // Ensure we have substantial content
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
      '[role="contentinfo"]'
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
    
    modalContent.innerHTML = `
      <h3>Rephrase with AI</h3>
      
      <div class="rephrase-text-section">
        <label>Original Text:</label>
        <div class="text-content">${this.escapeHtml(data.originalText)}</div>
      </div>
      
      ${data.error ? `
        <div class="rephrase-error">
          Error: ${this.escapeHtml(data.error)}
        </div>
      ` : `
        <div class="rephrase-text-section">
          <label>Rephrased Text:</label>
          <div class="text-content">${this.escapeHtml(data.rephrasedText || '')}</div>
        </div>
      `}
      
      <div class="rephrase-buttons">
        ${!data.error ? `
          <button class="rephrase-button accept">Accept</button>
          <button class="rephrase-button retry">Retry</button>
        ` : `
          <button class="rephrase-button retry">Retry</button>
        `}
        <button class="rephrase-button cancel">Cancel</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    
    // Add event listeners
    this.addModalEventListeners(modal, data);
    
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
          <div class="summary-loading-subtext">Our AI is reading and summarizing the content for you</div>
        </div>
      `;
    } else {
      modalContent.innerHTML = `
        <h3>AI Summary</h3>
        
        ${data.error ? `
          <div class="summary-error">
            AI summary is not available at the moment, please try again
          </div>
        ` : `
          <div class="summary-content">
            ${this.formatSummaryText(data.summaryText || '')}
          </div>
        `}
        
        <div class="summary-buttons">
          <button class="summary-button close">Close</button>
          <button class="summary-button retry">Retry</button>
          ${!data.error ? `<button class="summary-button copy">Copy</button>` : ''}
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
    // Convert plain text to formatted HTML with paragraphs and basic formatting
    return text
      .split('\n\n') // Split by double newlines for paragraphs
      .map(paragraph => {
        const trimmed = paragraph.trim();
        if (!trimmed) return '';
        
        // Check if it looks like a heading (starts with #, all caps, or short and followed by content)
        if (trimmed.match(/^#+\s/) || trimmed.match(/^[A-Z\s]{3,30}:?\s*$/) || 
            (trimmed.length < 50 && !trimmed.endsWith('.'))) {
          return `<h4>${this.escapeHtml(trimmed.replace(/^#+\s*/, ''))}</h4>`;
        }
        
        return `<p>${this.escapeHtml(trimmed)}</p>`;
      })
      .filter(p => p) // Remove empty paragraphs
      .join('');
  }

  private addModalEventListeners(modal: HTMLElement, data: ModalData): void {
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.rephrase-modal-content');
    modalContent?.addEventListener('click', (e) => {
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
        // Show loading state
        retryButton.disabled = true;
        retryButton.textContent = 'Retrying...';
        
        try {
          const response = await new Promise<any>((resolve, reject) => {
            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
              reject(new Error('Request timed out. Please try again.'));
            }, 30000); // 30 second timeout

            chrome.runtime.sendMessage({
              type: 'REPHRASE_TEXT',
              payload: { text: data.originalText },
            }, (response) => {
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
            });
          });
          
          if (response && response.success) {
            this.showModal({
              originalText: data.originalText,
              rephrasedText: response.rephrasedText,
            });
          } else {
            this.showModal({
              originalText: data.originalText,
              error: response?.error || 'Failed to rephrase text',
            });
          }
        } catch (error) {
          this.showModal({
            originalText: data.originalText,
            error: error instanceof Error ? error.message : 'Failed to rephrase text',
          });
        } finally {
          // Reset button state
          retryButton.disabled = false;
          retryButton.textContent = 'Retry';
        }
      }
    });

    // Cancel button
    const cancelButton = modal.querySelector('.rephrase-button.cancel') as HTMLButtonElement;
    cancelButton?.addEventListener('click', () => {
      this.hideModal();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });
  }

  private addSummaryModalEventListeners(modal: HTMLElement, data: SummaryModalData): void {
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    // Prevent closing when clicking modal content
    const modalContent = modal.querySelector('.summary-modal-content');
    modalContent?.addEventListener('click', (e) => {
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
        // Show loading state
        retryButton.disabled = true;
        retryButton.textContent = 'Retrying...';
        
        try {
          const response = await new Promise<any>((resolve, reject) => {
            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
              reject(new Error('Request timed out. Please try again.'));
            }, 60000); // 60 second timeout for summary (longer than rephrase)

            chrome.runtime.sendMessage({
              type: 'SUMMARIZE_TEXT',
              payload: { text: data.originalText },
            }, (response) => {
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
            });
          });
          
          if (response && response.success) {
            this.showSummaryModal({
              originalText: data.originalText,
              summaryText: response.summaryText,
            });
          } else {
            this.showSummaryModal({
              originalText: data.originalText,
              error: 'AI summary is not available at the moment, please try again',
            });
          }
        } catch (error) {
          this.showSummaryModal({
            originalText: data.originalText,
            error: 'AI summary is not available at the moment, please try again',
          });
        } finally {
          // Reset button state
          retryButton.disabled = false;
          retryButton.textContent = 'Retry';
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
    modalContent?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Allow closing by clicking outside for loading state (optional)
    modal.addEventListener('click', (e) => {
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
      
      ${data.error ? `
        <div class="summary-error">
          AI summary is not available at the moment, please try again
        </div>
      ` : `
        <div class="summary-content">
          ${this.formatSummaryText(data.summaryText || '')}
        </div>
      `}
      
      <div class="summary-buttons">
        <button class="summary-button close">Close</button>
        <button class="summary-button retry">Retry</button>
        ${!data.error ? `<button class="summary-button copy">Copy</button>` : ''}
      </div>
    `;

    // Re-add event listeners for the updated content
    this.addSummaryModalEventListeners(existingModal as HTMLElement, data);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the content script
const contentScript = new ContentScript();
contentScript.initialize();