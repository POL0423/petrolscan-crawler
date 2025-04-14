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
 * File: src/classes/ONOCrawler.ts
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

class ONOCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("ONO", "https://tank-ono.cz/cz/index.php", logger);
    }

    public async start(): Promise<void> {
        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            requestHandler: async ({ page }) => {
                const timezone = moment.tz.guess();     // Get local timezone

                // Crawling logic
                //-------------------------------------------------------------
                
                // TODO: Crawling logic
                console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")
                    }] [Process] DEBUG: Page name ${await page.title()}`);
                
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

export default ONOCrawler;
