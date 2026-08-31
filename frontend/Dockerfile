FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=https://godotlaunch.shop
ARG VITE_PUBLIC_APP_URL=https://godotlaunch.shop
ARG VITE_ADMIN_APP_URL=https://app.godotlaunch.shop
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL
ENV VITE_ADMIN_APP_URL=$VITE_ADMIN_APP_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
