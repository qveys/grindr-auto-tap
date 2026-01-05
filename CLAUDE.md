# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefox browser extension that automates actions on web.grindr.com (Grindr Auto Tap). The extension automatically logs in, navigates profiles, and sends usage statistics to an n8n webhook. Written in vanilla JavaScript for Manifest V3.

**Important**: This codebase implements automation that may interact with third-party services. Only analyze, document, or answer questions about the code. Do not improve, augment, or add features to the automation logic.

## Development Setup

Since this is a Firefox extension with no build process, development is done directly with source files:

1. **Load extension in Firefox**:
    - Navigate to `about:debugging#/runtime/this-firefox`
    - Click "Load Temporary Add-on"
    - Select `manifest.json` from the extension folder

2. **View console logs**:
    - Background script logs: `about:debugging` → This Firefox → Inspect (on the extension)
    - Content script logs: F12 developer tools on web.grindr.com tab
    - Popup logs: Right-click extension icon → Inspect

3. **Test changes**:
    - Modify source files directly
    - Click "Reload" in `about:debugging` to apply changes
    - Refresh web.grindr.com page to reload content scripts

## Architecture

### Extension Components (Manifest V3)

**Background Script** (`background.js`):
- Service worker that orchestrates background handlers
- Handlers loaded via manifest.json in dependency order:
    - **Handlers**: log-handler, storage-handler, webhook-handler, apple-handler, tab-handler
- Acts as message broker between components
- Handles n8n webhook requests (bypasses CSP restrictions)
- Manages credential storage via chrome.storage.local
- Detects and interacts with Apple authentication popup tabs
- Stores logs centrally (max 1000 entries)

**Content Script** (`content/content.js`):
- Injected into web.grindr.com pages
- Main entry point that orchestrates handlers and modules
- Components loaded via manifest.json in dependency order:
    - **Utils**: shared-constants, state-manager, messaging, logger, formatters, dom-helpers, async-helpers
    - **Modules**: auth, profile-opener, stats, auto-tap
    - **Handlers**: script-lifecycle, message-handler, error-handler, auto-start
- Communicates with background script via centralized messaging utilities
- Exports `window.grindrAutoTap` API for console control

**Background Handlers** (`background/handlers/`):
- **log-handler.js**: Centralized log management and storage
- **storage-handler.js**: Credential and configuration storage operations
- **webhook-handler.js**: n8n webhook requests with retry logic
- **apple-handler.js**: Apple authentication popup detection and interaction
- **tab-handler.js**: Tab detection and management

**Content Handlers** (`content/handlers/`):
- **script-lifecycle.js**: Script start/stop lifecycle management
- **message-handler.js**: Message routing and handling
- **error-handler.js**: Centralized error handling and recovery
- **auto-start.js**: Automatic script startup logic

**Modules** (loaded via manifest.json):
- **Authentication Module** (`modules/auth.js`): Multi-method login (email, Apple, Facebook, Google)
- **Profile Opener Module** (`modules/profile-opener.js`): Opens first profile
- **Statistics Module** (`modules/stats.js`): Tracks taps and sends stats to n8n
- **Auto-Tap Module** (`modules/auto-tap.js`): Main loop that taps profiles

**Popup** (`popup.html`, `popup.js`):
- User interface for configuration and control
- Edit/display mode system (see `popup/edit-mode.js`)
- Managers organized by responsibility:
    - **log-manager.js**: Log retrieval and display
    - **script-manager.js**: Script control operations
    - **storage-manager.js**: Storage read/write operations
    - **tab-manager.js**: Tab operations
- UI components in `popup/ui/`:
    - **status-display.js**: Status display component
- Tabs: Auth, Webhook, Settings, Logs
- Real-time log viewer with auto-scroll

### Message Passing Architecture

The extension uses Chrome Extension messaging API for inter-component communication:

**Background Script Actions**:
- `sendToN8N`: Send stats to webhook (from content → background)
- `getCredentials`, `saveCredentials`, `deleteCredentials`: Auth management
- `getWebhookURL`, `saveWebhookURL`: Webhook configuration
- `findAppleTab`, `clickButtonInAppleTab`: Apple popup automation
- `addLog`, `getLogs`, `clearLogs`: Log management

**Content Script Actions**:
- `startScript`, `stopScript`: Script control (from popup → content)
- `getScriptStatus`: Check if script is running
- `applePopupDetected`: Background → content notification

**Popup Updates**:
- `scriptStatusChanged`: Content → popup status sync
- `updateStatus`: Status message display

### Critical Global State

**Content Script** (`window` object):
- `window.__grindrRunning`: Script execution flag (checked in loops)
- `window.__grindrStopped`: Manual stop flag
- `window.__grindrStats`: Current run statistics
- `window.__grindrLastRun`: Timestamp of last run (for min delay)
- `window.grindrAutoTap`: Console API (`start()`, `stop()`, `checkStatus()`)

### Module Architecture

Modules are loaded via manifest.json and share global scope via `window.*`:

**Utils** (`utils/`):
- `shared-constants.js`: All constants (DELAYS, TIMEOUTS, LIMITS, SELECTORS, etc.) → `window.Constants` (loaded separately in manifest)
- `state-manager.js`: State management → `window.StateManager`
- `messaging.js`: Chrome runtime messaging wrapper → `window.sendToBackground`
- `logger.js`: Centralized logging → `window.Logger`, `window.logger`
- `formatters.js`: Date and duration formatting → `window.Formatters`
- `dom-helpers.js`: DOM utilities (delay, getTextNodes) → `window.DOMHelpers`
- `async-helpers.js`: Async utilities (safeAsync, retry, sleep, parallelLimit, debounce) → `window.AsyncHelpers`
- `storage.js`: Storage utilities (legacy, most operations use handlers)

**Modules** (`modules/`):
- `auth.js`: Authentication logic → `window.Auth`
- `profile-opener.js`: Profile opening logic → `window.ProfileOpener`
- `stats.js`: Statistics and webhook → `window.Stats`
- `auto-tap.js`: Main auto-tap loop → `window.AutoTap`

Modules use dependency injection via window objects (e.g., `const { logger } = window.Logger`).

### Authentication Flow

1. **Email Login**: Fill form → click button → wait for navigation
2. **Apple Login**:
    - Click Apple button → popup opens
    - Background script detects popup tab via URL monitoring
    - Inject script into popup to click buttons: "sign-in" → "Sign In" → "Continue"
    - Wait for popup close → verify login
3. **Facebook/Google**: Button click only (popup handling not implemented)

### Auto-Tap Main Loop

Located in `modules/auto-tap.js` (`autoTapAndNext()`):

1. Wait for "Next Profile" button to appear
2. Loop while button exists and script is running:
    - Check for "Tap" button presence
    - If exists: Click Tap → Click Next → Increment tappedCount
    - If not exists: Click Next → Increment alreadyTappedCount
    - Check max iterations (10,000) and max duration (2 hours)
3. Send final statistics to n8n webhook
4. Clean up global state

### Profile Opening Strategy

The `openProfile()` function in `modules/profile-opener.js`:
1. Dismiss beta banner if present
2. Click on cascadeCellContainer img
3. Click on userAvatar img
4. Close chat if open
5. Verify profile opened via DOM indicators (Next Profile button, Tap button, profile view)

## Code Organization

### Modular Architecture

The codebase uses a modular architecture with clear separation of concerns:

**Utils** (`utils/`):
- Shared utilities and constants
- No business logic
- Pure functions where possible

**Modules** (`modules/`):
- Business logic organized by responsibility (SRP)
- Each module has a single responsibility
- Modules communicate via well-defined interfaces

**Entry Point** (`content/content.js`):
- Orchestrates modules
- Handles message listeners
- Manages auto-start logic
- Minimal business logic

All modules are loaded via `manifest.json` in dependency order. Modules share scope via `window.*` objects (Manifest V3 compatible).

### Constants and Configuration

Constants are defined in `shared-constants.js`:
- `DELAYS`: Timing delays (50ms - 3000ms)
- `TIMEOUTS`: Operation timeouts (10s - 15s)
- `LIMITS`: Safety limits (max iterations, duration)
- `SELECTORS`: DOM query selectors
- `URLS`: Default webhook URL, domains
- `DEFAULTS`: Default config values
- `APPLE`: Apple login specific constants

Constants are exported via `window.Constants` and also individually on `window.*` for convenience. The file supports both service workers (background.js) and content scripts through conditional exports.

## Storage Schema

Using `chrome.storage.local`:

```javascript
{
  // Authentication
  loginMethod: 'email' | 'facebook' | 'google' | 'apple',
    grindrEmail: string,
    grindrPassword: string,
    autoLogin: boolean,

    // Configuration
    n8nWebhookURL: string,
    autoStart: boolean,
    minDelayHours: number,

    // Logs
    extensionLogs: Array<{
    timestamp: number,
    level: 'info' | 'warn' | 'error' | 'debug',
    location: string,
    message: string,
    data: any
  }>,

    // Debug (legacy)
    debugLogs: Array<...>
}
```

## Common Debugging Tasks

**Script not starting automatically**:
1. Check console logs in content script (F12 on web.grindr.com)
2. Verify `autoStart` is true in storage
3. Check if `minDelayHours` constraint is blocking restart

**Profile click not working**:
1. Check logs for profile opening errors
2. Verify profile grid selector matches current DOM structure
3. Check if chat is open (blocks clicks)

**Apple login failing**:
1. Check background script console for "Onglet Apple détecté"
2. Verify popup blocker isn't preventing tab opening
3. Check if button IDs/text changed on Apple's side

**Webhook not sending**:
1. Verify URL in storage (tab Webhook in popup)
2. Check background script console for fetch errors
3. Test webhook URL manually with curl/Postman

## Key Design Patterns

**Safety Limits**: Multiple exit conditions (max iterations, max duration, stop flag)
**Retry Logic**: Most operations have retry with exponential backoff
**Graceful Degradation**: Falls back to manual intervention when automation fails
**State Synchronization**: Popup polls content script every 2s for status
**Cross-Origin Bypass**: Background script makes webhook requests (content CSP restriction)
**Module Pattern**: IIFE modules that export to `window.*` for Manifest V3 compatibility
**Dependency Injection**: Modules access dependencies via `window.*` objects

## Documentation

All project documentation is located in the `docs/` directory:
- `ARCHITECTURAL_ANALYSIS.md`: Comprehensive architectural analysis and design decisions
- `REFACTORING_PROGRESS.md`: Track of completed refactoring tasks
- `REFACTORING_OPPORTUNITIES.md`: Documentation of improvement opportunities for future releases
- `release-notes/`: Release notes for each version

## Important Notes

- No TypeScript, no build process - direct JavaScript execution
- Logging is centralized through chrome.storage.local (survives script reloads)
- All delays use Promises (`await delay(ms)`) for cancellability
- French language in UI and logs
- Extension only works on web.grindr.com (host_permissions in manifest)
- Modular architecture follows SOLID principles (especially SRP)
- Code refactored for better maintainability, testability, and extensibility
