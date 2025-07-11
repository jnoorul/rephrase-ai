import { ContentScript } from '../content/service';
import { TextSelection } from '../types';

describe('ContentScript', () => {
  let contentScript: ContentScript;
  let mockElement: HTMLElement;
  let mockRange: Range;
  let mockSelection: Selection;

  beforeEach(() => {
    contentScript = new ContentScript();
    
    // Create mock DOM elements
    mockElement = document.createElement('div');
    mockElement.textContent = 'This is test content';
    document.body.appendChild(mockElement);

    // Mock Range with proper DOM nodes
    mockRange = {
      startContainer: mockElement.firstChild,
      endContainer: mockElement.firstChild,
      startOffset: 0,
      endOffset: 7,
      collapsed: false,
      toString: () => 'This is',
      deleteContents: jest.fn(),
      insertNode: jest.fn((node) => {
        // Mock insertNode to simulate proper DOM insertion
        if (mockElement.firstChild) {
          mockElement.insertBefore(node, mockElement.firstChild);
        }
      }),
      cloneContents: jest.fn(),
      setStartAfter: jest.fn(),
      setEndAfter: jest.fn(),
    } as any;

    // Mock Selection
    mockSelection = {
      rangeCount: 1,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
      toString: () => 'This is',
    } as any;

    // Mock window.getSelection
    window.getSelection = jest.fn().mockReturnValue(mockSelection);

    // Mock document.createRange
    document.createRange = jest.fn().mockReturnValue(mockRange);

    // Mock chrome.runtime
    chrome.runtime.sendMessage = jest.fn();
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should add message listener', () => {
      contentScript.initialize();
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('getSelection', () => {
    it('should return current text selection', () => {
      const selection = contentScript.getSelection();
      
      expect(selection).toEqual({
        text: 'This is',
        element: mockElement,
        range: mockRange,
      });
    });

    it('should return null when no selection', () => {
      window.getSelection = jest.fn().mockReturnValue({
        rangeCount: 0,
        toString: () => '',
      });

      const selection = contentScript.getSelection();
      expect(selection).toBeNull();
    });

    it('should return null when selection is empty', () => {
      window.getSelection = jest.fn().mockReturnValue({
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue({
          ...mockRange,
          toString: () => '',
        }),
        toString: () => '',
      });

      const selection = contentScript.getSelection();
      expect(selection).toBeNull();
    });
  });

  describe('replaceText', () => {
    it('should replace text in selection', () => {
      const selection: TextSelection = {
        text: 'This is',
        element: mockElement.firstChild!,
        range: mockRange,
      };

      contentScript.replaceText(selection, 'That was');

      expect(mockRange.deleteContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeType: Node.TEXT_NODE,
          textContent: 'That was',
        })
      );
    });

    it('should handle range replacement', () => {
      const selection: TextSelection = {
        text: 'This is',
        element: mockElement.firstChild!,
        range: mockRange,
      };

      contentScript.replaceText(selection, 'That was');

      expect(mockRange.deleteContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalled();
    });
  });

  describe('showModal', () => {
    it('should create and show modal', () => {
      const modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };

      contentScript.showModal(modalData);

      const modal = document.querySelector('.rephrase-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Original text');
      expect(modal?.textContent).toContain('Rephrased text');
    });

    it('should create modal with error', () => {
      const modalData = {
        originalText: 'Original text',
        error: 'API Error',
      };

      contentScript.showModal(modalData);

      const modal = document.querySelector('.rephrase-modal');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('API Error');
    });

    it('should remove existing modal before creating new one', () => {
      const modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };

      contentScript.showModal(modalData);
      const firstModal = document.querySelector('.rephrase-modal');
      
      contentScript.showModal(modalData);
      const modals = document.querySelectorAll('.rephrase-modal');
      
      expect(modals.length).toBe(1);
      expect(document.contains(firstModal)).toBe(false);
    });
  });

  describe('hideModal', () => {
    it('should remove modal from DOM', () => {
      const modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };

      contentScript.showModal(modalData);
      expect(document.querySelector('.rephrase-modal')).toBeTruthy();

      contentScript.hideModal();
      expect(document.querySelector('.rephrase-modal')).toBeFalsy();
    });

    it('should do nothing if no modal exists', () => {
      expect(() => contentScript.hideModal()).not.toThrow();
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      contentScript.initialize();
    });

    it('should handle GET_SELECTION message', () => {
      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const mockSendResponse = jest.fn();

      messageHandler({ type: 'GET_SELECTION' }, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        text: 'This is',
      });
    });

    it('should handle SHOW_MODAL message', () => {
      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };

      messageHandler({ type: 'SHOW_MODAL', payload: modalData }, {}, mockSendResponse);

      expect(document.querySelector('.rephrase-modal')).toBeTruthy();
    });

    it('should handle HIDE_MODAL message', () => {
      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const mockSendResponse = jest.fn();

      // First show modal
      const modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };
      contentScript.showModal(modalData);

      messageHandler({ type: 'HIDE_MODAL' }, {}, mockSendResponse);

      expect(document.querySelector('.rephrase-modal')).toBeFalsy();
    });

    it('should handle REPLACE_TEXT message', () => {
      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const selection: TextSelection = {
        text: 'This is',
        element: mockElement.firstChild!,
        range: mockRange,
      };

      // Mock the current selection
      jest.spyOn(contentScript, 'getSelection').mockReturnValue(selection);

      messageHandler({ 
        type: 'REPLACE_TEXT', 
        payload: { newText: 'That was' } 
      }, {}, mockSendResponse);

      expect(mockRange.deleteContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalled();
    });

    it('should return false for unknown message types', () => {
      const messageHandler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      const mockSendResponse = jest.fn();

      const result = messageHandler({ type: 'UNKNOWN_TYPE' }, {}, mockSendResponse);

      expect(result).toBe(false);
    });
  });

  describe('modal interactions', () => {
    let modalData: any;

    beforeEach(() => {
      modalData = {
        originalText: 'Original text',
        rephrasedText: 'Rephrased text',
      };
      contentScript.initialize();
    });

    it('should handle Accept button click', () => {
      const selection: TextSelection = {
        text: 'Original text',
        element: mockElement.firstChild! as HTMLElement,
        range: mockRange,
      };

      jest.spyOn(contentScript, 'getSelection').mockReturnValue(selection);

      contentScript.showModal(modalData);

      const acceptButton = document.querySelector('.rephrase-button.accept') as HTMLButtonElement;
      
      // Use a mock event instead of direct click to avoid DOM issues
      const mockEvent = new Event('click');
      acceptButton.dispatchEvent(mockEvent);

      expect(mockRange.deleteContents).toHaveBeenCalled();
      expect(mockRange.insertNode).toHaveBeenCalled();
      expect(document.querySelector('.rephrase-modal')).toBeFalsy();
    });

    it('should handle Cancel button click', () => {
      contentScript.showModal(modalData);

      const cancelButton = document.querySelector('.rephrase-button.cancel') as HTMLButtonElement;
      const mockEvent = new Event('click');
      cancelButton.dispatchEvent(mockEvent);

      expect(document.querySelector('.rephrase-modal')).toBeFalsy();
    });

    it('should handle Retry button click', () => {
      contentScript.showModal(modalData);

      const retryButton = document.querySelector('.rephrase-button.retry') as HTMLButtonElement;
      const mockEvent = new Event('click');
      retryButton.dispatchEvent(mockEvent);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'REPHRASE_TEXT',
        payload: { text: 'Original text' },
      }, expect.any(Function));
    });

    it('should handle modal backdrop click', () => {
      contentScript.showModal(modalData);

      const modal = document.querySelector('.rephrase-modal') as HTMLElement;
      const mockEvent = new Event('click');
      Object.defineProperty(mockEvent, 'target', { value: modal });
      modal.dispatchEvent(mockEvent);

      expect(document.querySelector('.rephrase-modal')).toBeFalsy();
    });

    it('should not close modal when clicking modal content', () => {
      contentScript.showModal(modalData);

      const modalContent = document.querySelector('.rephrase-modal-content') as HTMLElement;
      const mockEvent = new Event('click');
      modalContent.dispatchEvent(mockEvent);

      expect(document.querySelector('.rephrase-modal')).toBeTruthy();
    });
  });
});