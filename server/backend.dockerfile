# Use the official Node.js image as a base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your server will run on
EXPOSE 3000

# Start the application
CMD ["npm","start"]