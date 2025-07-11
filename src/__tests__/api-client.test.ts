import { OpenAIClient, ClaudeClient } from '../api/client';
import { ExtensionSettings } from '../types';

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  const mockSettings: ExtensionSettings = {
    provider: 'openai',
    openaiApiKey: 'test-key',
    claudeApiKey: '',
    openaiModel: 'gpt-4',
    claudeModel: 'claude-3-5-sonnet-20241022',
  };

  beforeEach(() => {
    client = new OpenAIClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rephrase', () => {
    it('should successfully rephrase text', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a rephrased version of the text.',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(true);
      expect(result.rephrasedText).toBe('This is a rephrased version of the text.');
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that rephrases text while maintaining the original meaning. Provide only the rephrased text without additional commentary.',
            },
            {
              role: 'user',
              content: 'Please rephrase the following text: Original text',
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API Error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error: Network error');
    });

    it('should use custom prompt when provided', async () => {
      const customSettings = {
        ...mockSettings,
        customPrompt: 'Make this text more formal',
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Formal version of the text.',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.rephrase('Original text', customSettings);

      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Make this text more formal',
            },
            {
              role: 'user',
              content: 'Original text',
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
    });
  });
});

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  const mockSettings: ExtensionSettings = {
    provider: 'anthropic',
    openaiApiKey: '',
    claudeApiKey: 'test-key',
    openaiModel: 'gpt-4',
    claudeModel: 'claude-3-5-sonnet-20241022',
  };

  beforeEach(() => {
    client = new ClaudeClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rephrase', () => {
    it('should successfully rephrase text', async () => {
      const mockResponse = {
        content: [
          {
            text: 'This is a rephrased version of the text.',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(true);
      expect(result.rephrasedText).toBe('This is a rephrased version of the text.');
      expect(global.fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: 'You are a helpful assistant that rephrases text while maintaining the original meaning. Provide only the rephrased text without additional commentary.\n\nPlease rephrase the following text: Original text',
            },
          ],
        }),
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Claude API Error: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.rephrase('Original text', mockSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error: Network error');
    });

    it('should use custom prompt when provided', async () => {
      const customSettings = {
        ...mockSettings,
        customPrompt: 'Make this text more formal',
      };

      const mockResponse = {
        content: [
          {
            text: 'Formal version of the text.',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.rephrase('Original text', customSettings);

      expect(global.fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: 'Make this text more formal\n\nOriginal text',
            },
          ],
        }),
      });
    });
  });
});