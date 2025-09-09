# Grindr Auto Tap (v2)

Automation tool using Playwright with modular architecture, YAML config, and commands.

## Setup

1. Python 3.11 recommended
2. Install deps:

```bash 
make install 
make pw-install
```

3. Configure environment: 

```
bash cp .env.example .env 
# edit GRINDR_EMAIL / GRINDR_PASSWORD
```

## Run

```bash
make run        # normal
make run-verbose
```

## Configuration

- `config/app_config.yaml` – app/browser/retry/timeouts
- `config/selectors.yaml` – selectors for login and actions

## Architecture

- `src/main.py` – entrypoint, DI, commands, services
- Commands: `LoginCommand`, `TapCommand`, `NextProfileCommand`
- Services: `BrowserFactory`, `AppleAuthStrategy`, `ElementLocator`, `ProfileNavigator`
- Infrastructure: `ConfigurationLoader`, exceptions, DI container

## Testing

```bash
make test
```

## Notes

- Legacy v1 script: `grindr_auto_tap.py` (kept as archive)
- Traces saved to `logs/trace.zip` when `--verbose` is enabled
