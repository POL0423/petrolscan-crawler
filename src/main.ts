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
import WebCrawler from './classes/WebCrawler.js';

// Scraping logic
//-------------------------------------------------
const timezone = moment.tz.guess();     // Get local timezone

// Get process argument
const arg = (process.argv.length > 2) ? process.argv[2] : null;
const allowed = ['Globus', 'ONO'];

if (!arg || !allowed.includes(arg)) {
    console.error(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Invalid argument provided!`);
    process.exit(1);
}

// Create crawler
const crawler: WebCrawler = (arg === "Globus") ? new GlobusCrawler(logger) : new ONOCrawler(logger);

// Start crawler
crawler.start();
