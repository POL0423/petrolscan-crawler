#!/bin/sh

###################################################
# Cron job script
# Simply runs the crawlers periodically
#--------------------------------------------------
# PetrolScan crawler
# @author Marek Poláček (POL0423)
# @version 0.0.1
# @description Web crawler for my Bachelor Thesis
#              assignment: Fuel Price Comparison App
# @license MIT
# @link https://github.com/pol0423/petrolscan-crawler
#
# @see https://crawlee.dev
#
# File: scripts/docker_entry.sh
###################################################

# Set error handling
set -e

# Export all environment variables to /etc/cron.env
# Include DISPLAY so that Playwright can use the virtual X server from xvfb-run
printenv | grep -E '^(DB_HOSTNAME|DB_PORT|DB_USERNAME|DB_PASSWORD|DB_DATABASE|DISPLAY)=' > /etc/cron.env

# Make sure we start in working directory
cd /app

# Start populating the database
/app/scripts/populate.sh notice 2>&1 | tee /var/log/populate.log

# Start tailing cron log in background
tail -f -n 0 /var/log/cron.log &

# Start the cron service in foreground
# If cron dies, the container exits and docker restarts it (restart: unless-stopped)
cron -f
