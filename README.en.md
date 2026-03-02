# Regular Expression Search

<p align="center">
English | <a href="README.md">简体中文</a>
</p>

A powerful Chrome extension that brings regular expression search capabilities to web pages, enabling advanced pattern matching and text searching directly in your browser.

[![License](https://img.shields.io/badge/license-Apache%20License%202.0-blue)](LICENSE)

## Features

### Core Functionality
- **Regex Search**: Search any webpage using regular expressions with full syntax support
- **Real-time Matching**: See matches highlighted instantly as you type
- **Navigation**: Easily navigate between matches with previous/next buttons
- **Match Count**: Display total number of matches found

### Advanced Features
- **Search History**: Automatically save your recent searches
- **Custom Patterns**: Create and save your own frequently-used regex patterns
- **Preset Patterns**: Quick access to common regex patterns:
  - Email addresses
  - URLs/Links
  - Phone numbers
  - Mobile numbers
  - Dates
  - Time
  - ID numbers
  - IP addresses

### Customization Options
- **Opacity Control**: Adjust the popup window transparency (20%-100%)
- **Max Matches**: Limit the number of matches displayed (1-10000)
- **History Limit**: Control how many search patterns are saved
- **Matching Flags**: Configure regex flags (g, i, m, s, u)

### User Experience
- **Draggable Window**: Move the search popup anywhere on the page
- **Scrollbar Markers**: Visual markers in the scrollbar showing match positions
- **Copy Results**: Copy all matched results to clipboard
- **Keyboard Shortcuts**: Convenient keyboard shortcuts for quick navigation

## Installation

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the extension directory

## Usage

### Opening the Extension
- Click the extension icon in the Chrome toolbar
- Or use the keyboard shortcut: `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)

### Basic Search
1. Enter your regular expression in the search box
2. Matches will be highlighted on the page in real-time
3. Use the navigation buttons (< ▶) to jump between matches

### Pattern Flags
Configure matching behavior using the flags:
- **g** (global): Find all matches (enabled by default)
- **i** (ignore case): Case-insensitive matching (enabled by default)
- **m** (multiline): Multi-line mode (enabled by default)
- **s** (dotall): Dot matches newline characters
- **u** (unicode): Full Unicode support

### Quick Access Patterns
Click any preset pattern in the Common Regex Patterns section to search for:
- Email addresses
- URLs
- Phone numbers
- And more...

### Custom Patterns
1. Expand Add Custom Regex Pattern
2. Enter a name and the regex pattern
3. Click "➕ Add" or press Enter
4. Your custom pattern will appear in the common patterns list

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Enter` | Search / Next match |
| `Shift + Enter` | Previous match |
| `Ctrl + Shift + F` | Open the search window, then go to chrome://extensions/shortcuts for customization |

## Configuration

### Settings
Access settings by expanding the popup and adjusting:
- Max Matches: Limit search results (default: 1000)
- Window Opacity: Adjust popup transparency (default: 100%)
- History Limit: Control saved search history (default: 20)

### Search History
View and manage your search history in the "📋 History" section:
- Click any history item to reuse it
- Click the ✕ button to delete a specific item
- Click Clear to remove all history

## Development

### Project Structure
```
regexp_search/
├── manifest.json          # Extension manifest
├── icons/                 # Extension icons
├── src/
│   ├── background/        # Background scripts
│   ├── content/           # Content scripts
│   └── popup/             # Popup UI (HTML, CSS, JS)
└── styles/                # Content scripts styles
```

### Building
No build process required. This is a pure JavaScript extension using Manifest V3.

### Local Testing
1. Load the extension in Chrome (see Installation section)
2. Make changes to source files
3. Go to `chrome://extensions/`
4. Click the refresh icon on the extension card to reload

## Privacy

This extension:
- Does not collect any personal data
- Does not send data to external servers
- Stores all data locally in your browser
- Only accesses the content of the active tab when searching

## License

This project is licensed under the `Apache-2.0 license` License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Changelog

### v1.1.0
- Initial release
- Basic regex search functionality
- Preset and custom pattern support
- Adjustable opacity setting
- Search history management
- Windows draggable and key shortcuts
