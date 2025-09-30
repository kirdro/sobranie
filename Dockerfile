FROM oven/bun:1.1.9 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
ENV SOBRANIE_API_BASE_URL=https://api.sobranie.yaropolk.tech
RUN bun run build

# Production stage
FROM oven/bun:1.1.9-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Expose port
EXPOSE 3011

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3011
ENV SOBRANIE_API_BASE_URL=https://api.sobranie.yaropolk.tech

# Start the application
CMD ["bun", "start"]