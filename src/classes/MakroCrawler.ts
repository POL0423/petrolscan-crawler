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
 * File: src/classes/MakroCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import { PlaywrightCrawler, Dataset } from 'crawlee';
import moment from 'moment-timezone';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

// Logic
//-------------------------------------------------

class MakroCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Makro", "https://www.makro.cz/", logger);
    }

    public async start(): Promise<void> {
        // Log start
        this.printMessage("Starting the extraction process...");

        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            // Timeouts
            navigationTimeoutSecs: 180,         // navigation timeout of ........... 3 minutes
            requestHandlerTimeoutSecs: 600,     // request handler timeout of ..... 10 minutes
            maxRequestRetries: 3,
            // Headers
            preNavigationHooks: [
                async ({ page }) => {
                    // Set real user agent of Google Chrome browser
                    await page.setExtraHTTPHeaders({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'cs,en-US;q=0.9,en;q=0.8'
                    });
                }
            ],
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

        // Log end
        this.printMessage("Crawler finished.");
    }
}

export default MakroCrawler;
