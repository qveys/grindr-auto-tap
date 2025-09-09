FROM mcr.microsoft.com/playwright/python:v1.45.0-jammy

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Optional: set environment variables via runtime -e GRINDR_EMAIL=... -e GRINDR_PASSWORD=...

CMD ["python", "-m", "src.main", "--config", "config/app_config.yaml"]
