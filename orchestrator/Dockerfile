FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5001

CMD ["node", "dist/index.js"]
