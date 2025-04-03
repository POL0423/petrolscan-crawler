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
 * File: src/crawlers/prism.ts
 */

// Imports
//-------------------------------------------------

// Node.js core modules

// Import submodule for the crawler
import WebCrawler from '../classes/WebCrawler.js';
import PrimCrawler from '../classes/PrimCrawler.js';

// Import database settings
import logger from './common/db_logger.js'

// Scraping logic
//-------------------------------------------------
const crawler: WebCrawler = new PrimCrawler(logger);

// Crawler disabled => no logic needed
