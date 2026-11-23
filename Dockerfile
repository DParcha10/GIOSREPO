# Stage 1: build the web app.
FROM node:22-slim AS web
WORKDIR /web
COPY gios-react/package.json gios-react/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY gios-react/ ./
RUN npm run build

# Stage 2: the API, which also serves the built web app.
FROM python:3.11-slim

# Install system geospatial C-libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=web /web/dist ./gios-react/dist

EXPOSE 8000

# Render and similar hosts pass the port in $PORT.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=*"]
