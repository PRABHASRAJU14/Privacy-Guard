# ========================================================
# PrivacyGuard — Production Docker Containerfile
# Multi-stage lightweight Linux container with Node.js & Tesseract OCR
# ========================================================

FROM node:20-alpine AS base

# Install OS utilities and local Tesseract OCR engine
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    curl \
    python3

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files (Use JSON array syntax for paths with spaces)
COPY server.js ./
COPY README.md ./
COPY PRD.md ./
COPY HLD.md ./
COPY LLD.md ./
COPY backend ./backend
COPY ["Privacy Guard", "./Privacy Guard"]
COPY extension ./extension
COPY tests ./tests

# Pre-create runtime directories with correct permissions
RUN mkdir -p logs backend/uploads backend/protected

# Expose server port
EXPOSE 8000

# Set environment
ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start PrivacyGuard Engine
CMD ["node", "server.js"]
