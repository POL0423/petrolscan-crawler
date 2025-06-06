/**************************************************
 * PetrolScan Crawler
 * @author Marek Poláček (POL0423)
 * @version 0.0.1
 * @description Web crawler for my Bachelor Thesis assignment: Fuel Price Comparison App
 * @license MIT
 * @link https://github.com/pol0423/petrolscan-crawler
 * 
 * @see https://crawlee.dev
 * 
 * File: src/main.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import moment from 'moment-timezone';

// Local imports
import WebCrawler from './classes/WebCrawler.js';
import GlobusCrawler from './classes/GlobusCrawler.js';
import ONOCrawler from './classes/ONOCrawler.js';
import logger from './crawlers/common/db_logger.js';

// Scraping logic
//-------------------------------------------------
const timezone = moment.tz.guess();     // Get local timezone

// Log start
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Starting...`);

// Create crawlers
const globus: WebCrawler = new GlobusCrawler(logger);
const ono: WebCrawler = new ONOCrawler(logger);

// Start crawlers
await globus.start();
await ono.start();

// Debug mode
if (process.argv.length > 2 && process.argv[2] === "debug") {
    // Retrieve data for verification
    console.log(`[${moment().tz(timezone)
        .format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Retrieving data from database for verification...`);
    const data = await logger.retrieveData();

    // Debug
    console.debug(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Processed Data:`);
    console.debug(data);
}

// Log end
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Finished.`);
