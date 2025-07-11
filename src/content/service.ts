import { TextSelection, ChromeMessage, ModalData } from '../types';

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

      case 'HIDE_MODAL':
        this.hideModal();
        return false; // Sync response

      case 'REPLACE_TEXT':
        this.handleReplaceText(message.payload.newText);
        return false; // Sync response

      default:
        return false; // Unknown message type
    }
  }

  private handleGetSelection(sendResponse: (response?: any) => void): void {
    const selection = this.getSelection();
    sendResponse({ text: selection?.text || '' });
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
    const existingModal = document.querySelector('.rephrase-modal');
    if (existingModal) {
      existingModal.remove();
    }
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
    retryButton?.addEventListener('click', () => {
      if (data.originalText) {
        chrome.runtime.sendMessage({
          type: 'REPHRASE_TEXT',
          payload: { text: data.originalText },
        }, (response) => {
          if (response.success) {
            this.showModal({
              originalText: data.originalText,
              rephrasedText: response.rephrasedText,
            });
          } else {
            this.showModal({
              originalText: data.originalText,
              error: response.error,
            });
          }
        });
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

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the content script
const contentScript = new ContentScript();
contentScript.initialize();