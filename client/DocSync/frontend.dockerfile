# Step 1: Build the React app
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .
COPY .env .env

# Build the application for production
RUN npm run build

# Step 2: Serve the app using NGINX
FROM nginx:alpine

# Copy the custom NGINX configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the build output from the build stage to NGINX's web directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
