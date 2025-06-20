#!/bin/sh

###################################################
# Database population script
# Simply runs the crawlers once to populate
# the database
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
# File: scripts/populate.sh
###################################################

# Make sure the starting environment is set
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/app/node_modules/.bin:$PATH"
export HOME="/root"
export PLAYWRIGHT_BROWSERS_PATH="/app/node_modules/playwright-core/.local-browsers"

# Make sure we start in working directory
cd /app

# Print start job
echo "$(date +"[%F %T %Z]") [Service] Database population started."
npm run start:prod --loglevel notice

# Check if the command was successful
if [ $? -eq 0 ]; then
    # Print end job
    echo "$(date +"[%F %T %Z]") [Service] Database population finished."
else
    # Print error message and exit with a non-zero status
    echo "$(date +"[%F %T %Z]") [Service] Error: Database population failed. Please check the logs for more details."
    exit $?
fi
