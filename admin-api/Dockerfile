FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN rm -f package-lock.json && npm install --no-audit --no-fund

COPY . .

EXPOSE 4000

CMD ["node", "src/admin.js"]
