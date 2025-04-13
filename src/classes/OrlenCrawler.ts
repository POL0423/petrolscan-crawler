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

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

class OrlenCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Orlen", "https://www.example.com/", logger);
    }
    
        public async start(): Promise<void> {
            // Check interruption flag (should be false, but you never know)
        if (this.isInterrupted()) return;

        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            requestHandler: async ({ page, enqueueLinks }) => {
                // Check if interrupted
                if (thisObj.isInterrupted()) return;
                
                // Log start
                console.log(`Start ${this.getName()}`);
                
                // Crawling logic
                //-------------------------------------------------------------
                
                // TODO: Crawling logic
                console.log(`DEBUG: Page name ${page.title()}`);
                
                // Save the page details
                Dataset.pushData({
                    crawler: thisObj.getName(),
                    timestamp: moment().tz("UTC").toDate(),
                    data: null
                });
            }
        });

        // Run the crawler
        await crawler.run([this.getUrl()]);
    }
}

export default OrlenCrawler;
