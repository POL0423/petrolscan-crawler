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
 * File: src/crawlers/globus.ts
 */

// Imports
//-------------------------------------------------

// Import submodule for the crawler
import WebCrawler from '../classes/WebCrawler.js';
import GlobusCrawler from '../classes/GlobusCrawler.js';
import { parentPort } from 'worker_threads';

// Import database settings
import logger from './common/db_logger.js';

// Scraping logic
//-------------------------------------------------
const crawler: WebCrawler = new GlobusCrawler(logger);
crawler.start();

// Interruption
parentPort?.on('message', (message) => {
    if (message.signal === "SIGTERM") {
        parentPort?.postMessage(`Crawler ${crawler.getName()} interrupted.`);
        crawler.interruptExecution();
    }
});
