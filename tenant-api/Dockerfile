FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN rm -f package-lock.json && npm install --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
