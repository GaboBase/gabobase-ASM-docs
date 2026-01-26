# Use official Node.js runtime
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build TypeScript
RUN npm install typescript -g
RUN npm run build

# Expose port (MCP usually runs over stdio, but for Cloud Run we might need an HTTP wrapper or SSE)
# For this implementation, we assume the container is invoked as a job or via a wrapper.
# If running as a service, we'd need an SSE transport adapter.
# For now, we keep it simple.

CMD [ "npm", "start" ]