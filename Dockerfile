FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies with npm (using legacy peer deps for React 19 compatibility)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application using Node.js (for Next.js compatibility)
ENV SOBRANIE_API_BASE_URL=https://api.sobranie.yaropolk.tech
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Install only production dependencies (using legacy peer deps for React 19 compatibility)
RUN npm install --only=production --legacy-peer-deps

# Expose port
EXPOSE 3011

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3011
ENV SOBRANIE_API_BASE_URL=https://api.sobranie.yaropolk.tech

# Start the application
CMD ["npm", "start"]