FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and everything else
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

# The start command (you might want to compile TS to JS in production, but tsx works for now)
CMD ["npm", "run", "start"]
