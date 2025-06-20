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
# File: scripts/run_cron.sh
###################################################

# Make sure the starting environment is set
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/app/node_modules/.bin:$PATH"
export HOME="/root"
export PLAYWRIGHT_BROWSERS_PATH="/app/node_modules/playwright-core/.local-browsers"

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
echo "$(date +"[%F %T %Z]") [Service] Crawlers started."
npm run start:prod $MODE

# Resolve termination or successful finish
if [ $? -eq 0 ]
then
    # Crawlers successfully finished
    echo "$(date +"[%F %T %Z]") [Service] Crawlers finished successfully."
else
    # Crawlers encountered an error
    echo "$(date +"[%F %T %Z]") [Service] Crawlers terminated with exit code $?. Please check the logs for more details."
    exit $?
fi
