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
 * File: src/classes/OrlenCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import { PlaywrightCrawler, Dataset } from 'crawlee';
import moment from 'moment-timezone';
import { parentPort } from 'worker_threads';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

class OrlenCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Orlen", "https://www.example.com/", logger);
    }
    
    public async start(): Promise<void> {
        // Crawler logic => Crawler disabled, no logic needed
    }
}

export default OrlenCrawler;
