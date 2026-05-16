FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and everything else
COPY . .

# Generate Prisma Client and Build typescript code
RUN npx prisma generate && npm run build

EXPOSE 3001

# Start the compiled production code
CMD ["npm", "run", "start"]
