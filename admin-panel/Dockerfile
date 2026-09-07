# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# Run stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/next.config.js ./

EXPOSE 3001

CMD ["npx", "next", "start", "-p", "3001"]
