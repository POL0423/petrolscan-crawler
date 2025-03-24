#!/usr/bin/bash

###################################################
# Cron job script
# Simply runs the crawlers periodically
#--------------------------------------------------
# PetrolScan crawler
# @author Marek Poláček (POL0423)
# @version 0.0.1
# @description Web crawler for my Bachelor Thesis assignment: Fuel Price Comparison App
# @license MIT
# @link https://github.com/pol0423/petrolscan-crawler
#
# @see https://crawlee.dev
#
# File: scripts/run_cron.sh
###################################################

# Make sure we start in working directory
cd /app

# Print start job
echo -e "$(date +"[%F %T %Z]") \x1b[37mCrawlers started.\x1b[0m"

# Run crawlers
# Note: If you want to output logs, remove the "--silent" flag.
npm run start:prod --silent

# Resolve termination or successful finish
if [ $? -eq 0 ]
then
    # Crawlers successfully finished
    echo -e "$(date +"[%F %T %Z]") \x1b[32;1mCrawlers finished successfully.\x1b[0m"
else
    # Crawlers 
    echo -e "$(date +"[%F %T %Z]") \x1b[31;1mCrawlers terminated with exit code $?.\x1b[0m"
fi
