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
 * File: src/classes/EuroOilCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
// TODO: Import necessary Crawlee modules

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

class EuroOilCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("EuroOil", "https://www.example.com/", logger);
    }

    public async start(): Promise<void> {
        // Check interruption flag (should be false, but you never know)
        if (this.isInterrupted()) return;

        // Crawler logic => Crawler disabled, no logic needed
    }
}

export default EuroOilCrawler;
