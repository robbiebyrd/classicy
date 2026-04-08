FROM node:22-alpine AS build

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY timemachine.ts ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist/timemachine.js ./
RUN addgroup -S timemachine && adduser -S timemachine -G timemachine \
    && mkdir -p /app/cache && chown timemachine:timemachine /app/cache
USER timemachine

EXPOSE ${TIMEMACHINE_PORT:-8765}

CMD ["node", "timemachine.js"]
