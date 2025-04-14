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

# Set an output mode flag
case $1 in
    --silent)
        MODE="--loglevel silent"
        ;;
    --error)
        MODE="--loglevel error"
        ;;
    --warn)
        MODE="--loglevel warn"
        ;;
    --notice)
        MODE="--loglevel notice"
        ;;
    --http)
        MODE="--loglevel http"
        ;;
    --timing)
        MODE="--loglevel timing"
        ;;
    --info)
        MODE="--loglevel info"
        ;;
    --verbose)
        MODE="--loglevel verbose"
        ;;
    --silly)
        MODE="--loglevel silly"
        ;;
    *)
        MODE=""
        ;;
esac

# Print start job
echo -e "$(date +"[%F %T %Z]") [Service] Crawlers started."

# Run crawlers;     ${MODE}: Sets the output mode for crawlers
npm run start:prod $MODE

# Resolve termination or successful finish
if [ $? -eq 0 ]
then
    # Crawlers successfully finished
    echo -e "$(date +"[%F %T %Z]") [Service] \x1b[32;1mCrawlers finished successfully.\x1b[0m"
else
    # Crawlers encountered an error
    echo -e "$(date +"[%F %T %Z]") [Service] \x1b[31;1mCrawlers terminated with exit code $?.\x1b[0m"
fi
