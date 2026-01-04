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
├── background.js          # Service worker (tabs management, n8n webhooks, storage)
├── content.js             # Main entry point (orchestration)
│
├── utils/                 # Shared utilities
│   ├── constants.js       # Constants (delays, timeouts, selectors, etc.)
│   ├── logger.js          # Centralized logging system
│   ├── formatters.js      # Date and duration formatting
│   ├── messaging.js       # Centralized messaging utilities
│   ├── storage.js         # Storage utilities
│   └── dom-helpers.js     # DOM helpers (delay, getTextNodes, etc.)
│
├── modules/               # Functional modules
│   ├── auth.js            # Authentication module (email, Apple, Facebook, Google)
│   ├── profile-opener.js  # First profile opening
│   ├── stats.js           # Statistics management and webhook sending
│   └── auto-tap.js        # Main automatic tap loop
│
├── popup.html             # User interface
├── popup.js               # Popup logic
├── shared-constants.js    # Shared constants (service worker + content scripts)
└── icons/                 # Extension icons
```

### 🏗️ Modular Architecture

The code is organized into separate modules for better maintainability:
- **Utils** : Reusable utility functions
- **Modules** : Business logic organized by responsibility (SOLID principles)
- **Content.js** : Entry point that orchestrates the modules

Modules are loaded in dependency order via `manifest.json`.

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
