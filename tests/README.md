# Tests - Grindr Auto Tap Extension

## 🧪 Test Framework

Simple, lightweight test framework for browser extensions.
No external dependencies, no build process required.

## 📁 Structure

```
tests/
├── test-framework.js       # Custom test framework
├── runner.html            # Browser-based test runner
├── README.md             # This file
└── utils/                # Utility tests
    ├── formatters.test.js
    └── async-helpers.test.js
```

## 🚀 Running Tests

### Method 1: Browser Test Runner (Recommended)

1. Open `tests/runner.html` in Firefox or Chrome
2. Click "Run All Tests" button
3. View results in the output console

### Method 2: Firefox Extension Context

1. Load extension in Firefox (`about:debugging`)
2. Navigate to `moz-extension://[extension-id]/tests/runner.html`
3. Run tests with full extension context

## ✍️ Writing Tests

### Basic Test

```javascript
test('should do something', () => {
  const result = myFunction();
  expect(result).toBe('expected');
});
```

### Test Suite with Setup/Teardown

```javascript
describe('MyModule', () => {
  let testData;

  beforeEach(() => {
    testData = { count: 0 };
  });

  afterEach(() => {
    testData = null;
  });

  test('should increment count', () => {
    testData.count++;
    expect(testData.count).toBe(1);
  });
});
```

### Async Tests

```javascript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeTruthy();
});
```

## 🔍 Assertions

Available assertion methods:

- `expect(x).toBe(y)` - Strict equality (===)
- `expect(x).toEqual(y)` - Deep equality (JSON comparison)
- `expect(x).toBeTruthy()` - Truthy value
- `expect(x).toBeFalsy()` - Falsy value
- `expect(x).toBeNull()` - Null value
- `expect(x).toBeUndefined()` - Undefined value
- `expect(arr).toContain(item)` - Array/string contains item
- `expect(fn).toThrow(msg)` - Function throws error
- `expect(x).toBeGreaterThan(y)` - x > y
- `expect(x).toBeLessThan(y)` - x < y
- `expect(arr).toHaveLength(n)` - Array/string length
- `expect(obj).toBeInstanceOf(Class)` - Instance check

## 📊 Current Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| utils/formatters.js | 7 | ✅ |
| utils/async-helpers.js | 11+ | ✅ |
| utils/dom-helpers.js | - | ⏳ TODO |
| utils/messaging.js | - | ⏳ TODO |
| modules/auth.js | - | ⏳ TODO |
| modules/stats.js | - | ⏳ TODO |
| modules/profile-opener.js | - | ⏳ TODO |
| modules/auto-tap.js | - | ⏳ TODO |

## 🎯 Goals

- ✅ Lightweight framework (no dependencies)
- ✅ Browser-compatible (no Node.js)
- ✅ Async test support
- ✅ Setup/teardown hooks
- ✅ Readable assertion syntax
- ✅ Test runner UI
- ⏳ 80%+ code coverage (in progress)

## 📝 Adding New Tests

1. Create test file in appropriate directory:
   ```
   tests/[module-type]/[module-name].test.js
   ```

2. Write tests using `describe` and `test`:
   ```javascript
   describe('NewModule', () => {
     test('should work correctly', () => {
       expect(true).toBeTruthy();
     });
   });
   ```

3. Add test file to `runner.html`:
   ```html
   <script src="[module-type]/[module-name].test.js"></script>
   ```

4. Refresh `runner.html` and run tests

## 🐛 Debugging Failed Tests

1. Open browser console (F12)
2. Run tests and check console output
3. Failed tests show:
   - Test name
   - Error message
   - Stack trace (when available)

## 💡 Best Practices

- **One assertion per test** when possible
- **Descriptive test names** (should... / when... / if...)
- **Test edge cases** (null, undefined, empty arrays)
- **Mock external dependencies** (chrome.*, DOM, network)
- **Keep tests fast** (< 100ms per test ideal)
- **Independent tests** (no shared state)

## 🔧 Future Improvements

- [ ] Code coverage reporting
- [ ] DOM mocking utilities
- [ ] chrome.* API mocks
- [ ] CI/CD integration
- [ ] Performance benchmarking
- [ ] Snapshot testing
- [ ] Visual regression tests

## 📚 Resources

- Test framework code: `test-framework.js`
- Example tests: `utils/*.test.js`
- Test runner: `runner.html`
