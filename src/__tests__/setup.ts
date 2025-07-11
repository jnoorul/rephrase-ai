// Global test setup
(global as any).chrome = {
  storage: {
    sync: {
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
    },
    local: {
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
    },
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    onInstalled: {
      addListener: jest.fn(),
    },
    lastError: undefined,
  },
} as any;

// Mock fetch for API calls
(global as any).fetch = jest.fn();

// Reset chrome.runtime.lastError before each test
beforeEach(() => {
  (global as any).chrome.runtime.lastError = undefined;
});