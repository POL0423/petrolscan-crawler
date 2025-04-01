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
 * File: src/classes/OMVCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
// TODO: Import necessary Crawlee modules

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

class OMVCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("OMV", "https://www.example.com/", logger);
    }

    public start(): void {
        // Check interruption flag (should be false, but you never know)
        if (this.isInterrupted()) return;

        // TODO: Crawler logic
    }
}

export default OMVCrawler;
