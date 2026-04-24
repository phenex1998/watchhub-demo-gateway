# Node 20 alpine + ffmpeg. Tiny image (~180 MB).
FROM node:20-alpine

# ffmpeg is the only system dep we need. --no-cache keeps the image small.
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy app source.
COPY server.js channels.js ./

# Render.com sets PORT dynamically; default to 3000 for local runs.
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Healthcheck so Render restarts crashed instances quickly.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
