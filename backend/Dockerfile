FROM node:20
WORKDIR /app
COPY backend/ ./backend/
COPY package*.json ./
RUN npm install
EXPOSE 3001
CMD ["node", "backend/server.js"]