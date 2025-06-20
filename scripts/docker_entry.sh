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
printenv | grep -E '^(DB_HOSTNAME|DB_PORT|DB_USERNAME|DB_PASSWORD|DB_DATABASE)=' > /etc/cron.env

# Make sure we start in working directory
cd /app

# Start populating the database
/app/scripts/populate.sh notice 2>&1 | tee /var/log/populate.log

# Start the cron service and follow new log entries
cron
tail -f -n 0 /var/log/cron.log
