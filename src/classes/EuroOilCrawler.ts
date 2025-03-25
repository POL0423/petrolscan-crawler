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

    public start(): void {
        // TODO: Crawler logic
    }
}

export default EuroOilCrawler;
