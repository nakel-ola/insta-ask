# InstaAsk

InstaAsk is a Manifest V3 Chrome extension that lets you highlight a question on any page and get a short AI-generated answer instantly.

## Features

- Highlight a question directly on a webpage and ask from the inline floating button.
- View answers in an on-page popup without leaving the current tab.
- Save your OpenAI API key in extension storage.
- Keep a local history of answered questions grouped by page.
- Copy answers from the popup or extension panel.

## Project Structure

```text
src/
  background/   Background service worker
  content/      Highlight, floating button, and in-page answer popup
  options/      Options page for API key and history management
  popup/        Extension popup UI
  styles/       Shared injected styles
  utils/        Storage and OpenAI request helpers
manifest.json   Chrome extension manifest
```

## Requirements

- Google Chrome or another Chromium-based browser with extension support
- Node.js 20 or newer
- An OpenAI API key

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the type checker:

   ```bash
   npm run typecheck
   ```

## Load the Extension

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.

Because the JavaScript source is checked into the repo directly, there is no build step required for local loading.

## Configure the API Key

1. Open the extension popup.
2. Paste your OpenAI API key.
3. Click `Save`.

You can also manage the key and clear history from the extension options page.

## Usage

1. Highlight a question on any webpage.
2. Click the `Ask` floating button.
3. Wait for the in-page answer popup.
4. Copy the answer if needed, or review it later from the popup history.

## Development Notes

- The extension uses `chrome.storage.local` for API key and history persistence.
- OpenAI requests are made from the background service worker.
- Static analysis currently uses TypeScript in `checkJs` mode against the checked-in JavaScript files.

## Contributing

See [CONTRIBUTING.md](/Users/olamilekannunu/Documents/Development/insta-ask/CONTRIBUTING.md) for contribution workflow and expectations.

## License

This project is licensed under the MIT License. See [LICENSE](/Users/olamilekannunu/Documents/Development/insta-ask/LICENSE).
