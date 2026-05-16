FROM node:20-alpine

WORKDIR /app

# Install dependencies strictly
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "run", "start"]
