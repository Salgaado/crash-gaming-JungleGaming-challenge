FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
RUN bun install

COPY prisma ./prisma
RUN bunx prisma generate

COPY . .

EXPOSE 4002

CMD sh -c "bunx prisma db push --accept-data-loss && bun run src/main.ts"
