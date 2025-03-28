
# React build stage
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production server stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY server ./server
RUN npm install express cors body-parser mongoose
EXPOSE 4000
CMD ["node", "server/server.js"]
