FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --no-audit --no-fund
RUN apk add --no-cache curl

COPY . .

EXPOSE 4000

CMD ["node", "src/admin.js"]
