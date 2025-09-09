PY=python3
PIP=pip3

.PHONY: install pw-install run run-verbose test lint trace-open

install:
	$(PY) -m pip install --upgrade pip
	$(PIP) install -r requirements.txt

pw-install:
	$(PY) -m playwright install --with-deps

run:
	$(PY) -m src.main --config config/app_config.yaml

run-verbose:
	$(PY) -m src.main --config config/app_config.yaml --verbose

lint:
	ruff check .
	black --check .

test:
	pytest

trace-open:
	@echo "Trace saved to logs/trace.zip if --verbose; open with Playwright CLI"
