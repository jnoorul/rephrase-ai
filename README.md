# Rephrase AI Extension

A Chrome extension that allows users to rephrase text using AI services like OpenAI and Anthropic Claude.

## Features

- **Text Selection**: Select any text on a webpage
- **AI Integration**: Support for both OpenAI GPT and Anthropic Claude models
- **Multiple Triggers**: Right-click context menu or keyboard shortcut (Ctrl+Shift+E / Cmd+Shift+E)
- **Interactive Modal**: Preview original and rephrased text before accepting
- **Customizable**: Configure API keys, models, and custom prompts
- **Compatible**: Works on both Chrome and Microsoft Edge

## Installation

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rephrase-ai-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Build

To create a production build:

```bash
npm run build
```

## Configuration

1. Click the extension icon in the toolbar
2. Choose your AI provider (OpenAI or Anthropic)
3. Enter your API key
4. Select your preferred model
5. Optionally, set a custom prompt

### API Keys

- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)

## Usage

### Context Menu

1. Select text on any webpage
2. Right-click and choose "Rephrase with AI"
3. Review the rephrased text in the modal
4. Click "Accept" to replace the original text

### Keyboard Shortcut

1. Select text on any webpage
2. Press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac)
3. Review and accept the rephrased text

### Modal Actions

- **Accept**: Replace the original text with the rephrased version
- **Retry**: Generate a new rephrased version
- **Cancel**: Close the modal without making changes

## Development

### Scripts

- `npm run dev` - Start development build with watch mode
- `npm run build` - Create production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── api/            # API client implementations
├── background/     # Background script (service worker)
├── content/        # Content script (DOM manipulation)
├── popup/          # Extension popup UI
├── options/        # Options page
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── __tests__/      # Test files
```

### Testing

The project uses Jest with Test-Driven Development (TDD) approach:

- Unit tests for all major components
- Mock implementations for Chrome APIs
- Coverage reports available

Run tests:
```bash
npm test
```

### Architecture

- **Background Script**: Handles context menus, keyboard shortcuts, and API calls
- **Content Script**: Manages text selection and DOM manipulation
- **Popup**: Quick settings interface
- **Options Page**: Detailed configuration interface
- **API Clients**: Abstracted interfaces for OpenAI and Claude APIs

## Browser Compatibility

- Chrome (Manifest V3)
- Microsoft Edge (Manifest V3)
- Other Chromium-based browsers

## Privacy

- API keys are stored locally in the browser
- No data is sent to third parties except the configured AI service
- Text content is only sent to the AI service for rephrasing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions, please open an issue on the GitHub repository.