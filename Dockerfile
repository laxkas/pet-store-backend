#tests
#to trigger deploy
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --production

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
