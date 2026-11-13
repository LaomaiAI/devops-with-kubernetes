FROM node:24-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY index.js .
CMD ["node", "index.js"]
