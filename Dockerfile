# Base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Build frontend
WORKDIR /app/src
RUN npm install && npm run build

# Move frontend build to server
RUN rm -rf /app/server/public
RUN mv build /app/server/public

# Install backend dependencies
WORKDIR /app/server
RUN npm ci --omit=dev

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
