# Single-container deployment: builds the React client, then serves it from the Express server.
# Build:  docker build -t taskflow level-3
# Run:    docker run -p 5000:5000 -e MONGO_URI=... -e JWT_SECRET=... -e CLIENT_ORIGIN=http://localhost:5000 taskflow

FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
