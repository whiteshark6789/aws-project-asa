FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compile TS before running if deploying, but for dev we use tsx
CMD ["npm", "run", "dev"]
