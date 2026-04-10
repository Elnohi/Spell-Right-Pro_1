# Use a specific, stable Node.js base image (e.g., LTS version)
FROM node:18-slim

# Create app directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
# This step ensures npm install runs only when dependencies change
COPY package*.json ./

# Install Node.js dependencies
# --omit=dev prevents installing development dependencies,
# making the final image smaller.
# --silent reduces npm's output during the build.
RUN npm install --omit=dev --silent

# Copy the rest of your application code
COPY . .

# Inform Docker that the container will listen on this port.
# Cloud Run will inject the PORT environment variable, which your app should use.
EXPOSE 8080

# Define the command to run your application when the container starts.
# This assumes you have a "start" script in your package.json (e.g., "node server.js").
CMD ["npm", "start"]
