FROM node:22-trixie
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["node", "app/server.js"]
