# Grindr Auto Tap Extension

A Firefox WebExtension that automates the profile tapping functionality on Grindr web.

## Features

- **Multi-Method Authentication**: Support for email, Facebook, Google, and Apple Sign-in
- **Auto-Login**: Automatically log in on startup
- **Auto-Tap**: Automatically tap profiles with configurable settings
- **Statistics Tracking**: Track and send statistics to N8N webhooks
- **Comprehensive Logging**: Built-in logging system for debugging and monitoring
- **Modern UI**: Clean and intuitive popup interface

## Installation

### For Development

1. Clone or download this repository
2. Open Firefox
3. Go to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from this directory

### For Production

Once built, the extension can be packaged as a `.xpi` file and distributed.

## Configuration

### Settings

The extension stores the following settings in `chrome.storage.local`:

- `loginMethod`: Login method to use (email, facebook, google, apple)
- `grindrEmail`: Email address for email-based login
- `grindrPassword`: Password for email-based login
- `autoLogin`: Enable auto-login on startup (default: true)
- `n8nWebhookURL`: N8N webhook URL for statistics (default: https://n8n.quentinveys.be/webhook/grindr-stats)
- `autoStart`: Enable auto-tap on startup (default: true)
- `minDelayHours`: Minimum delay between auto-tap sessions in hours (default: 12)

### Webhook Format

Statistics are sent as JSON POST requests to the configured N8N webhook:
```json
{
  "startTime": 1234567890,
  "endTime": 1234567900,
  "totalTaps": 25,
  "successfulTaps": 24,
  "failedTaps": 1,
  "duration": 10000,
  "successRate": "96.00",
  "timestamp": "2024-01-03T12:34:56.000Z"
}
```

## Project Structure
```
├── manifest.json              # Extension manifest
├── background.js              # Service worker for log management
├── content.js                 # Content script orchestrator
├── popup.html                 # UI popup interface
├── popup.css                  # Popup styles
├── popup.js                   # Popup functionality
├── utils/
│   ├── constants.js          # Constants and selectors
│   ├── formatters.js         # Utility functions
│   └── storage.js            # Chrome storage wrapper
└── modules/
    ├── logger.js              # Centralized logging
    ├── auth.js                # Authentication logic
    ├── profile-opener.js      # Profile interaction
    └── stats.js               # Statistics and webhooks
```

## Module Architecture

### Constants (`utils/constants.js`)

Centralized configuration including:
- DOM selectors for UI elements
- Timing constants (delays, timeouts)
- API URLs
- Retry limits

### Logger (`modules/logger.js`)

Provides a centralized logging system that:
- Logs to browser console
- Sends logs to background script
- Stores up to 1000 logs in memory

### Authentication (`modules/auth.js`)

Handles user login with support for:
- Email/password login
- Facebook OAuth
- Google OAuth
- Apple Sign-in (with popup window handling)

### Profile Opener (`modules/profile-opener.js`)

Manages profile interactions:
- Detects visible profiles
- Finds and clicks tap buttons
- Waits for next profile to load

### Statistics (`modules/stats.js`)

Tracks and reports usage:
- Counts successful/failed taps
- Calculates success rate
- Sends data to N8N webhooks

## Development

### Adding New Features

1. **New Module**: Create a new file in `modules/` following the pattern in existing modules
2. **New Utility**: Add to appropriate file in `utils/` or create a new one
3. **New Selector**: Add to `utils/constants.js` in the `SELECTORS` object
4. **Testing**: Test in Firefox Developer Edition with about:debugging

### Code Style

- Use async/await for asynchronous operations
- Extract constants to the top of modules
- Use JSDoc comments for all functions
- Include error handling with logging
- Attach exported functions to `window.ModuleName`

## Logging

All modules implement the same logging pattern:
```javascript
logger('info', 'functionName', 'Message', { optional: 'data' });
```

Log levels:
- `info`: General information
- `warn`: Warning messages
- `error`: Error conditions
- `debug`: Debug information

## Security Considerations

- Passwords are stored in `chrome.storage.local` (not encrypted)
- Do not commit credentials to version control
- Review webhook URLs before configuring
- Use HTTPS for webhook URLs

## Troubleshooting

### Extension not working

1. Check Firefox console for errors (Ctrl+Shift+K)
2. Check about:debugging logs
3. Verify manifest.json is valid

### Auto-tap not starting

1. Check that you're logged in to Grindr
2. Verify auto-login settings
3. Check logs for errors

### Webhook not sending

1. Verify webhook URL is correct
2. Check network tab in browser dev tools
3. Ensure N8N endpoint is accessible

## License

Proprietary - All rights reserved

## Version

1.0.0 - Initial release