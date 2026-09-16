# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim

WORKDIR /app

# Install system dependencies (curl, ca-certificates, procps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json tsconfig.json ./
RUN npm install --production=false

# Copy source trees
COPY core ./core
COPY memory ./memory
COPY agents ./agents
COPY tools ./tools
COPY skills ./skills
COPY voice ./voice
COPY workflows ./workflows
COPY mcp ./mcp
COPY security ./security
COPY workers ./workers

# Start agent worker harness
CMD ["npx", "ts-node", "workers/agent-worker/index.ts"]
