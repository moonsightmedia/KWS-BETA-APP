FROM node:20-alpine

RUN apk add --no-cache ffmpeg \
    && ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' zscale ' \
    && ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' tonemap ' \
    && ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' sidedata '

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
