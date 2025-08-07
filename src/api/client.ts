import { ExtensionSettings, RephraseResponse, SummaryResponse, AskAIResponse, OpenAIResponse, ClaudeResponse } from '../types';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant that rephrases text while maintaining the original meaning. Provide only the rephrased text without additional commentary.';

const DEFAULT_SUMMARY_PROMPT = 'You are a helpful assistant that creates brief, clear summaries. Please format your response using proper markdown syntax with # for main headings, ## for subheadings, **bold** for emphasis, and - for bullet points. Summarize the following text in a concise manner.';

const DEFAULT_ASK_AI_PROMPT = 'You are a helpful AI assistant that explains complex topics in a beginner-friendly way. Your goal is to make difficult concepts accessible to someone learning about the topic for the first time. Please format your response using proper markdown syntax with ## for headings, **bold** for emphasis, - for bullet points, and [link text](URL) for authoritative sources when helpful.\n\nGuidelines:\n- Write at a medium difficulty level (not too basic, not too advanced)\n- Keep explanations concise but comprehensive (2-4 paragraphs maximum)\n- Break down complex terms into simpler language\n- Use the broader page context to provide relevant background\n- Include 1-2 authoritative links only when they add significant value\n- Focus on helping the reader understand the "why" and "how", not just the "what"\n- Use analogies or examples when they make concepts clearer';

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

  async summarize(text: string, settings: ExtensionSettings): Promise<SummaryResponse> {
    try {
      const prompt = settings.customSummaryPrompt || DEFAULT_SUMMARY_PROMPT;
      const userMessage = settings.customSummaryPrompt 
        ? text
        : `Please summarize the following text: ${text}`;

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
          max_tokens: 2000, // Longer for summaries
          temperature: 0.3, // Lower temperature for more focused summaries
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API Error: ${response.status} ${response.statusText}`,
        };
      }

      const data: OpenAIResponse = await response.json();
      const summaryText = data.choices[0]?.message?.content;

      if (!summaryText) {
        return {
          success: false,
          error: 'No response from OpenAI API',
        };
      }

      return {
        success: true,
        summaryText: summaryText.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async askAI(text: string, settings: ExtensionSettings, pageContext?: string): Promise<AskAIResponse> {
    try {
      const prompt = DEFAULT_ASK_AI_PROMPT;
      
      let userMessage = `Please explain the following selected text: "${text}"`;
      
      if (pageContext && pageContext.trim()) {
        userMessage += `\n\nFor additional context, here is the surrounding page content:\n\n${pageContext.substring(0, 3000)}...`;
      }

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
          max_tokens: 2500, // Longer for explanations
          temperature: 0.4, // Balanced temperature for informative but creative responses
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API Error: ${response.status} ${response.statusText}`,
        };
      }

      const data: OpenAIResponse = await response.json();
      const explanation = data.choices[0]?.message?.content;

      if (!explanation) {
        return {
          success: false,
          error: 'No response from OpenAI API',
        };
      }

      return {
        success: true,
        explanation: explanation.trim(),
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

  async summarize(text: string, settings: ExtensionSettings): Promise<SummaryResponse> {
    try {
      const prompt = settings.customSummaryPrompt || DEFAULT_SUMMARY_PROMPT;
      const userMessage = settings.customSummaryPrompt 
        ? `${prompt}\n\n${text}`
        : `${prompt}\n\nPlease summarize the following text: ${text}`;

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.claudeApiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.claudeModel,
          max_tokens: 2000, // Longer for summaries
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
      const summaryText = data.content[0]?.text;

      if (!summaryText) {
        return {
          success: false,
          error: 'No response from Claude API',
        };
      }

      return {
        success: true,
        summaryText: summaryText.trim(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async askAI(text: string, settings: ExtensionSettings, pageContext?: string): Promise<AskAIResponse> {
    try {
      const prompt = DEFAULT_ASK_AI_PROMPT;
      
      let userMessage = `${prompt}\n\nPlease explain the following selected text: "${text}"`;
      
      if (pageContext && pageContext.trim()) {
        userMessage += `\n\nFor additional context, here is the surrounding page content:\n\n${pageContext.substring(0, 3000)}...`;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.claudeApiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.claudeModel,
          max_tokens: 2500, // Longer for explanations
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
      const explanation = data.content[0]?.text;

      if (!explanation) {
        return {
          success: false,
          error: 'No response from Claude API',
        };
      }

      return {
        success: true,
        explanation: explanation.trim(),
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

  static async summarize(text: string, settings: ExtensionSettings): Promise<SummaryResponse> {
    const client = this.create(settings);
    return client.summarize(text, settings);
  }

  static async askAI(text: string, settings: ExtensionSettings, pageContext?: string): Promise<AskAIResponse> {
    const client = this.create(settings);
    return client.askAI(text, settings, pageContext);
  }
}