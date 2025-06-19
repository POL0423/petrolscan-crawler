#!/usr/bin/bash

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

# Make sure we start in working directory
cd /app

# Print start job
echo -e "$(date +"[%F %T %Z]") [Service] Database population started."
npm run start:prod --loglevel notice

# Check if the command was successful
if [ $? -ne 0 ]; then
    echo -e "$(date +"[%F %T %Z]") [Service] \x1b[31;1mError: Database population failed.\x1b[0m"
    echo -e "$(date +"[%F %T %Z]") [Service] Please check the logs for more details."
    exit 1
fi

# Print end job
echo -e "$(date +"[%F %T %Z]") [Service] Database population finished."
