# Grindr Auto-Tap v1.0.1 - Release Notes

## Overview
Patch release focusing on stability improvements, bug fixes, and enhanced error handling for the Grindr Auto-Tap extension.

## What's New

### Bug Fixes
- **Improved Apple Login Detection**: Enhanced detection and handling of Apple authentication popup tabs
- **Better Error Recovery**: Improved error handling in webhook communication with better retry logic
- **Script Injection Stability**: Fixed edge cases where content scripts might not inject properly on page reloads
- **Log Management**: Optimized log storage to prevent memory issues with large log collections

### Improvements
- **Enhanced Background Script**: Better handling of tab detection and message passing between extension components
- **Webhook Timeout Handling**: Added proper timeout handling (10 seconds) for webhook requests to prevent hanging
- **Apple Tab Interaction**: Improved button clicking mechanism in Apple authentication tabs with better retry logic
- **Storage Efficiency**: Optimized storage operations to reduce unnecessary writes

### Technical Enhancements
- **Better Logging**: Enhanced debug logging with session tracking and improved log entry structure
- **Error Messages**: More descriptive error messages for troubleshooting
- **Code Organization**: Minor code cleanup and organization improvements

## Installation
- Available on Mozilla Add-ons store
- Manual installation for developers via `about:debugging`

## Known Issues
- Grindr's UI selectors may change; if script doesn't work, please report with error logs
- Apple login requires popup window permission in browser
- Webhook delivery is not guaranteed without proper error handling on endpoint

## Migration Notes
- No breaking changes from v1.0.0
- Existing configurations and credentials are preserved
- No action required for existing users

## Browser Compatibility
- Firefox 88+
- May work on other Chromium-based browsers with manifest adjustments

## Security Notes
- All credentials stored locally in browser storage
- No server communication except to user-configured webhook
- No tracking or analytics
- All data processing happens on user's machine

## Performance
- Reduced memory footprint with optimized log management
- Faster error recovery and retry mechanisms
- Improved webhook request handling

## Feedback & Support
- Report issues on GitHub with error logs
- Check extension logs for troubleshooting information

