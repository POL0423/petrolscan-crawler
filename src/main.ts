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
import GlobusCrawler from './classes/GlobusCrawler.js';
import ONOCrawler from './classes/ONOCrawler.js';
import logger from './crawlers/common/db_logger.js';

// Scraping logic
//-------------------------------------------------
const timezone = moment.tz.guess();     // Get local timezone

// Log start
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Starting...`);

// Create crawlers
const crawlers = {
    globus: new GlobusCrawler(logger),
    ono: new ONOCrawler(logger)
};

// Start crawlers
crawlers.globus.start();
crawlers.ono.start();

// Log end
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Finished.`);
