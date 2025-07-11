import { ExtensionSettings, RephraseResponse, OpenAIResponse, ClaudeResponse } from '../types';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant that rephrases text while maintaining the original meaning. Provide only the rephrased text without additional commentary.';

export class OpenAIClient {
  private readonly baseUrl = 'https://api.openai.com/v1';

  async rephrase(text: string, settings: ExtensionSettings): Promise<RephraseResponse> {
    try {
      const prompt = settings.customPrompt || DEFAULT_SYSTEM_PROMPT;
      const userMessage = settings.customPrompt 
        ? text
        : `Please rephrase the following text: ${text}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: settings.openaiModel,
          messages: [
            {
              role: 'system',
              content: prompt,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API Error: ${response.status} ${response.statusText}`,
        };
      }

      const data: OpenAIResponse = await response.json();
      const rephrasedText = data.choices[0]?.message?.content;

      if (!rephrasedText) {
        return {
          success: false,
          error: 'No response from OpenAI API',
        };
      }

      return {
        success: true,
        rephrasedText: rephrasedText.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export class ClaudeClient {
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  async rephrase(text: string, settings: ExtensionSettings): Promise<RephraseResponse> {
    try {
      const prompt = settings.customPrompt || DEFAULT_SYSTEM_PROMPT;
      const userMessage = settings.customPrompt 
        ? `${prompt}\n\n${text}`
        : `${prompt}\n\nPlease rephrase the following text: ${text}`;

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.claudeApiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.claudeModel,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Claude API Error: ${response.status} ${response.statusText}`,
        };
      }

      const data: ClaudeResponse = await response.json();
      const rephrasedText = data.content[0]?.text;

      if (!rephrasedText) {
        return {
          success: false,
          error: 'No response from Claude API',
        };
      }

      return {
        success: true,
        rephrasedText: rephrasedText.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export class APIClientFactory {
  static create(settings: ExtensionSettings): OpenAIClient | ClaudeClient {
    if (settings.provider === 'openai') {
      return new OpenAIClient();
    } else {
      return new ClaudeClient();
    }
  }

  static async rephrase(text: string, settings: ExtensionSettings): Promise<RephraseResponse> {
    const client = this.create(settings);
    return client.rephrase(text, settings);
  }
}