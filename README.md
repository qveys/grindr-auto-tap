# 🦊 Firefox Extension - Grindr Auto Tap

Firefox extension to automate actions on Grindr and send statistics to n8n.

## ✨ Features

- ✅ Automatic detection of web.grindr.com tabs
- 🔐 Automatic authentication with saved credentials (email, Apple, Facebook, Google)
- ⚡ Automatic execution of the tap script
- 📊 Statistics sent to n8n (CSP bypass)
- 🎛️ Configuration interface via popup
- 🔒 Secure credential management (local storage)

## 📦 Installation

1. Open Firefox
2. Navigate to `about:debugging`
3. Click on "This Firefox" in the left menu
4. Click on "Load Temporary Add-on"
5. Select the `manifest.json` file in the `extension` folder

## ⚙️ Configuration

### 1️⃣ Adding Credentials

1. Click on the extension icon in the toolbar
2. Enter your email and password (or choose another login method)
3. Check "Auto login" if desired
4. Click on "Save Credentials"

### 2️⃣ Configuring the n8n Webhook URL

1. In the popup, go to the "Webhook" tab
2. Enter your n8n webhook URL
3. Click on "Save URL"

## 🚀 Usage

### 🤖 Automatic Mode

The extension starts automatically when you open web.grindr.com if:
- Auto login is enabled
- Credentials are configured
- You are logged in or auto login succeeds

### 👆 Manual Mode

1. Open web.grindr.com
2. Click on the extension icon
3. Click on "Start Script" or "Stop Script"

### 💻 From the Console

You can also control the script from the browser console:

```javascript
// Start the script
window.grindrAutoTap.start();

// Stop the script
window.grindrAutoTap.stop();

// Check connection status
window.grindrAutoTap.checkStatus();
```

## 📁 File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (orchestration)
├── shared-constants.js    # Shared constants (service worker + content scripts)
│
├── background/            # Background script handlers
│   └── handlers/
│       ├── apple-handler.js    # Apple authentication popup handling
│       ├── log-handler.js      # Log management
│       ├── storage-handler.js  # Storage operations
│       ├── tab-handler.js      # Tab detection and management
│       └── webhook-handler.js  # n8n webhook requests
│
├── content/               # Content script handlers
│   └── content.js              # Main entry point (orchestration)
│   └── handlers/
│       ├── auto-start.js       # Automatic script startup
│       ├── error-handler.js    # Error handling
│       ├── message-handler.js  # Message routing
│       └── script-lifecycle.js # Script lifecycle management
│
├── utils/                 # Shared utilities
│   ├── async-helpers.js   # Async utilities (retry, timeout, etc.)
│   ├── dom-helpers.js     # DOM helpers (delay, getTextNodes, etc.)
│   ├── formatters.js      # Date and duration formatting
│   ├── logger.js          # Centralized logging system
│   ├── messaging.js       # Centralized messaging utilities
│   ├── state-manager.js   # State management
│   └── storage.js         # Storage utilities
│
├── modules/               # Functional modules
│   ├── auth.js            # Authentication module (email, Apple, Facebook, Google)
│   ├── profile-opener.js  # First profile opening
│   ├── stats.js           # Statistics management and webhook sending
│   └── auto-tap.js        # Main automatic tap loop
│
├── popup/                 # Popup interface
│   ├── edit-mode.js       # Edit/display mode system
│   ├── managers/
│   │   ├── log-manager.js      # Log management
│   │   ├── script-manager.js   # Script control
│   │   ├── storage-manager.js  # Storage operations
│   │   └── tab-manager.js      # Tab operations
│   └── ui/
│       └── status-display.js   # Status display component
│
├── popup.html             # User interface
├── popup.js               # Popup logic
│
├── docs/                  # Documentation
│   ├── ARCHITECTURAL_ANALYSIS.md
│   ├── REFACTORING_PROGRESS.md
│   ├── REFACTORING_OPPORTUNITIES.md
│   ├── REFACTORING_SESSION_2026-01-05.md
│   ├── REFACTORING_TODO.md
│   └── release-notes/     # Release notes
│       ├── RELEASE_NOTE_1.0.0.md
│       └── RELEASE_NOTE_1.0.1.md
│
├── tests/                 # Test suite
│   ├── README.md
│   ├── runner.html        # Test runner interface
│   ├── test-framework.js  # Custom test framework
│   └── utils/             # Test utilities
│
└── icons/                 # Extension icons
```

### 🏗️ Modular Architecture

The code is organized into separate modules for better maintainability:
- **Handlers** : Organized by component (background/content/popup) for separation of concerns
- **Utils** : Reusable utility functions (logging, messaging, formatting, async helpers)
- **Modules** : Business logic organized by responsibility (SOLID principles)
- **Entry Points** : `background.js` and `content/content.js` orchestrate handlers and modules

All components are loaded in dependency order via `manifest.json`. The architecture follows a handler-based pattern where:
- Background handlers manage storage, webhooks, tabs, and logs
- Content handlers manage script lifecycle, messaging, errors, and auto-start
- Popup managers handle UI operations and state synchronization

## 🔐 Security

- 🔒 Credentials are stored locally in `chrome.storage.local`
- ☁️ Credentials are never synced with the cloud
- 📝 Credentials are never exposed in logs
- 🌐 The extension only works on web.grindr.com
- 🛡️ Webhook requests pass through the background script (CSP bypass)

## 🐛 Troubleshooting

### ❌ Extension Won't Load

- Verify that all files are present
- Check the error console in `about:debugging`
- Verify that icons are present in the `icons/` folder

### ⚠️ Script Doesn't Start Automatically

- Verify that "Auto login" is checked in the popup
- Verify that credentials are saved
- Check the browser console for errors (F12)

### 🔗 n8n Requests Fail

- Verify that the webhook URL is correct (Webhook tab in the popup)
- Verify that the n8n webhook is active
- Check the background script console in `about:debugging`

### 🔑 Authentication Fails

- Verify that credentials are correct
- Check if there's a captcha (requires manual action)
- Check the console for detailed error messages

## 📝 Notes

- 🔑 The extension requires `tabs`, `scripting`, `storage` and `activeTab` permissions
- 🌐 The extension only works on `*://web.grindr.com/*`
- 🏗️ Modular architecture compatible with Manifest V3 (sharing via `window.*`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is provided as-is for educational purposes.
