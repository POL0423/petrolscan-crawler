# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node:20 AS builder

# Set and import environment variables
ARG DB_HOSTNAME
ARG DB_PORT=3306
ARG DB_USERNAME
ARG DB_PASSWORD
ARG DB_DATABASE

ENV DB_HOSTNAME=${DB_HOSTNAME}
ENV DB_PORT=${DB_PORT}
ENV DB_USERNAME=${DB_USERNAME}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV DB_DATABASE=${DB_DATABASE}

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY package*.json ./

# Install all dependencies. Don't audit to speed up the installation.
RUN npm install --include=dev --audit=false

# Next, copy the source files using the user set
# in the base image.
COPY . ./

# Install all dependencies and build the project.
# Don't audit to speed up the installation.
RUN npm run build

# Create final image
FROM apify/actor-node:20

# Copy only built JS files from builder image
COPY --from=builder /usr/src/app/dist ./dist

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY . ./

# Run the image.
CMD npm run start:prod --silent
