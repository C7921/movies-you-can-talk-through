FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Run the build script to create api-config.js
RUN npm run build

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]