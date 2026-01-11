# 🚀 Grindr Auto Tap

[![CI](https://github.com/qveys/grindr-auto-tap/workflows/CI/badge.svg)](https://github.com/qveys/grindr-auto-tap/actions)
[![codecov](https://codecov.io/gh/qveys/grindr-auto-tap/branch/main/graph/badge.svg)](https://codecov.io/gh/qveys/grindr-auto-tap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready browser extension starter kit for Chrome, Firefox, and Edge featuring TypeScript strict mode, Webpack Manifest V3, comprehensive testing with Jest, CI/CD pipeline, and more.

## ✨ Features

- 🔷 **TypeScript** - Strict mode enabled for maximum type safety
- 📦 **Webpack** - Optimized builds for Manifest V3
- ✅ **Jest Testing** - Unit tests with 80%+ coverage requirements
- 🚀 **GitHub Actions** - Automated CI/CD pipeline (lint, test, build)
- 🎨 **Code Quality** - ESLint + Prettier with pre-commit hooks
- 🎯 **Emoji Commits** - Custom commit validation with Husky
- 📚 **Documentation** - Comprehensive docs and templates
- 🔄 **Dependabot** - Automated dependency updates
- 🌐 **Cross-Browser** - Works on Chrome, Firefox, and Edge

## 🏗️ Architecture

```
grindr-auto-tap/
├── src/
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── popup/             # Extension popup UI
│   ├── utils/             # Shared utilities
│   │   ├── logger.ts      # Error logging
│   │   ├── storage.ts     # Chrome storage wrapper
│   │   └── messaging.ts   # Message passing
│   └── manifest.json      # Extension manifest
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/    # Issue templates
│   └── dependabot.yml     # Dependency updates
├── .husky/                # Git hooks
└── dist/                  # Build output
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/qveys/grindr-auto-tap.git
cd grindr-auto-tap

# Install dependencies
npm install

# Set up git hooks
npm run prepare
```

### Development

```bash
# Start development mode (watch for changes)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Run all validations
npm run validate
```

### Loading the Extension

#### Chrome / Edge

1. Build the extension: `npm run build`
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

#### Firefox

1. Build the extension: `npm run build`
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the `dist` folder

## 📝 Commit Convention

This project uses emoji-based commit messages. Each commit must start with an emoji followed by a descriptive message (minimum 10 characters).

### Valid Emojis

| Emoji | Description | Example |
|-------|-------------|---------|
| ✨ | New feature | `✨ Add dark mode support` |
| 🐛 | Bug fix | `🐛 Fix storage API error` |
| 📚 | Documentation | `📚 Update README with examples` |
| ♻️ | Refactoring | `♻️ Simplify message handler` |
| ⚡ | Performance | `⚡ Optimize content script` |
| ✅ | Tests | `✅ Add storage utility tests` |
| 🔧 | Configuration | `🔧 Update webpack config` |
| 🔒 | Security | `🔒 Add input sanitization` |
| ⬆️ | Upgrade deps | `⬆️ Update dependencies` |
| 🎨 | Style/format | `🎨 Format code with prettier` |

See [.husky/commit-msg](.husky/commit-msg) for the complete list.

## 🧪 Testing

Tests are written using Jest with jsdom environment for browser API simulation.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Coverage thresholds are enforced at 80% for:
- Branches
- Functions
- Lines
- Statements

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- ES2020 target
- Full type checking
- See [tsconfig.json](tsconfig.json)

### ESLint

- TypeScript parser
- Strict type-checking rules
- Prettier integration
- See [.eslintrc.json](.eslintrc.json)

### Webpack

- Three entry points: popup, background, content
- TypeScript compilation with ts-loader
- Source maps for debugging
- Asset copying with CopyPlugin
- See [webpack.config.js](webpack.config.js)

## 📦 Build & Distribution

```bash
# Production build
npm run build

# Output will be in dist/ folder
# Package dist/ folder as .zip for store submission
```

The build output includes:
- Compiled JavaScript files
- Manifest V3 configuration
- HTML and CSS files
- Icons and assets

## 🔄 CI/CD Pipeline

GitHub Actions workflow runs on every push and pull request:

1. **Lint** - ESLint, Prettier, TypeScript checks
2. **Test** - Jest with coverage reporting
3. **Build** - Production build validation

See [.github/workflows/ci.yml](.github/workflows/ci.yml)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Follow commit conventions
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- Bundled with [Webpack](https://webpack.js.org/)
- Tested with [Jest](https://jestjs.io/)
- Formatted with [Prettier](https://prettier.io/)
- Linted with [ESLint](https://eslint.org/)

## 📞 Support

- 🐛 [Report a bug](https://github.com/qveys/grindr-auto-tap/issues/new?template=bug_report.md)
- ✨ [Request a feature](https://github.com/qveys/grindr-auto-tap/issues/new?template=feature_request.md)
- 📚 [Documentation issues](https://github.com/qveys/grindr-auto-tap/issues/new?template=documentation.md)

## 🗺️ Roadmap

- [ ] Chrome Web Store publication
- [ ] Firefox Add-ons publication
- [ ] Edge Add-ons publication
- [ ] Options page
- [ ] Internationalization (i18n)
- [ ] Advanced configuration
- [ ] Analytics dashboard

---

Made with ❤️ by [qveys](https://github.com/qveys)
