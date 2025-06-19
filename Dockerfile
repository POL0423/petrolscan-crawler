######################################################################################
# Dockerfile for PetrolScan Crawler
# This Dockerfile builds a Docker image for the PetrolScan Crawler.
# It uses the Apify Actor Node Playwright Chrome base image,
# installs necessary dependencies, and sets up the environment
# for running the crawler.
#
# Created by: Marek Poláček (POL0423)
# Date: 2025-06-16
# License: MIT License
######################################################################################

# Get arguments for our environment variables
ARG DB_HOSTNAME
ARG DB_PORT=3306
ARG DB_USERNAME
ARG DB_PASSWORD
ARG DB_DATABASE

# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node-playwright-chrome:20 AS builder
USER root
WORKDIR /usr/src/app

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
FROM apify/actor-node-playwright-chrome:20
USER root

# Import environment variables from our arguments
ENV DB_HOSTNAME=${DB_HOSTNAME}
ENV DB_PORT=${DB_PORT}
ENV DB_USERNAME=${DB_USERNAME}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV DB_DATABASE=${DB_DATABASE}

# Add cron to manage cron jobs
RUN which apt || (echo "This image is not based on Debian/Ubuntu, cannot install cron." && exit 1)
RUN apt-get update && apt-get install -y cron || (cat /var/log/apt/term.log || true)

# Set working directory
WORKDIR /app

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

# Install Playwright browsers and dependencies
RUN npx playwright install --with-deps chromium

# Make cron job and populate scripts executable
RUN chmod +x scripts/populate.sh
RUN chmod +x scripts/run_cron.sh

# Change the local timezone to Europe/Prague
RUN cp /usr/share/zoneinfo/CET /etc/localtime

# Add a cron job to schedule crawlers every day at 3:00am
COPY scripts/jobs.crontab /etc/cron.d/jobs.crontab
RUN chmod 0644 /etc/cron.d/jobs.crontab
RUN touch /var/log/cron.log

# Run the image. We run the initial population script,
# then cron and display logs
CMD ["sh", "-c", "./scripts/populate.sh | tee /var/log/populate.log && cron && tail -f /var/log/cron.log"]
