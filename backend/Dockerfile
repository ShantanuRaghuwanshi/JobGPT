FROM node:18-alpine

WORKDIR /app

# Install deps first
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose API port
EXPOSE 5001

# Default command (development with nodemon)
CMD ["npm", "run", "dev"]
