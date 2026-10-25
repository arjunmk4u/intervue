
# Stage 1: Build the TypeScript application
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies using the lockfile
COPY package*.json ./
RUN npm ci

# Copy source code and compile TypeScript
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled application from the build stage
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
