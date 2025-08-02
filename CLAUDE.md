# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension for AI-powered text rephrasing that supports both OpenAI GPT and Anthropic Claude models. The extension allows users to select text on webpages and rephrase it using context menus or keyboard shortcuts.

## Development Commands

- `npm run dev` - Start development build with watch mode (rebuilds on file changes)
- `npm run build` - Create production build for extension packaging
- `npm test` - Run all Jest tests
- `npm test:watch` - Run tests in watch mode during development
- `npm run lint` - Run ESLint code linting
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking without emitting files

## Architecture

This is a Chrome Manifest V3 extension with the following key components:

### Core Scripts
- **Background Script** (`src/background/`): Service worker handling context menus, keyboard shortcuts, and API calls to AI services
- **Content Script** (`src/content/`): Injected into web pages for text selection, DOM manipulation, and modal display
- **Popup** (`src/popup/`): Extension toolbar popup for quick settings
- **Options Page** (`src/options/`): Full configuration interface

### Key Architectural Patterns
- **Message Passing**: Communication between scripts uses Chrome's message passing API with typed messages (`ChromeMessage` interface)
- **API Abstraction**: AI service calls are abstracted through the `api/client.ts` module supporting both OpenAI and Anthropic
- **Settings Management**: Extension settings stored using Chrome storage API with `ExtensionSettings` interface
- **Text Selection**: Uses Range API for precise text selection and replacement
- **Modal System**: Custom modal overlay injected into pages for user interaction

### Build System
- **Webpack**: Bundles TypeScript sources into separate entry points (background, content, popup, options)
- **Alias**: `@` alias maps to `src/` directory
- **Assets**: Public folder copied to dist during build (manifest, HTML, CSS, icons)

### Testing
- **Jest** with jsdom environment for DOM testing
- **Chrome API Mocking**: Uses custom mocks for chrome.* APIs in test setup
- **TDD Approach**: Comprehensive unit tests for all major components

## Development Workflow

When making changes to the codebase:
1. Make smaller, incremental changes rather than large modifications
2. Run tests after each change: `npm test`
3. Run build to ensure compilation works: `npm run build`
4. Run linting and type checking: `npm run lint` and `npm run type-check`
5. **IMPORTANT**: Always ask for explicit permission before committing or pushing changes to git
6. Use descriptive commit messages that explain the purpose of the change

## Git Workflow Protocol

**CRITICAL**: Never commit or push changes without explicit user permission. Always:
1. Complete all requested changes and testing
2. Ask the user for permission before any git operations
3. Only proceed with commits/pushes after receiving explicit approval
4. This applies to all git commands including `git add`, `git commit`, and `git push`

## Important Files
- `public/manifest.json` - Chrome extension manifest configuration
- `src/types/index.ts` - Central TypeScript type definitions
- `webpack.config.js` - Build configuration with TypeScript compilation and asset copying