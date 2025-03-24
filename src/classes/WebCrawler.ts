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
 * File: src/classes/WebCrawler.ts
 */

// Imports
//-------------------------------------------------
import DBLogger from './DBLogger.js';
import FuelType from '../types/FuelType.js';

abstract class WebCrawler {
    private name: string;
    private url: string;
    private logger: DBLogger;

    constructor(name: string, url: string, logger: DBLogger) {
        this.name = name;
        this.url = url;
        this.logger = logger;
    }

    public getName(): string {
        return this.name;
    }

    public getUrl(): string {
        return this.url;
    }

    public abstract start(): void;

    public static resolveFuelType(fuelName: string): FuelType {
        let ftlower = fuelName.toLowerCase();

        if (
            // Regular petrols
            ftlower.includes("natural") && !ftlower.endsWith("plus")    // Globus
            // ...
        ) return "PETROL_REGULAR";

        if (
            // Premium petrols
            ftlower.includes("natural") && ftlower.endsWith("plus")     // Globus
            // ...
        ) return "PETROL_PREMIUM";

        if (
            // Regular diesels
            ftlower.includes("diesel") && !ftlower.endsWith("plus")     // Globus
            // ...
        ) return "DIESEL_REGULAR";

        if (
            // Premium diesels
            ftlower.includes("diesel") && ftlower.endsWith("plus")      // Globus
            // ...
        ) return "DIESEL_PREMIUM";

        if (
            // AdBlue
            ftlower.includes("adblue")                                  // Globus
            // ...
        ) return "ADBLUE";

        if (
            // Windscreen
            ftlower.includes("kapalina do ostřikovačů")                 // Globus
            // ...
        ) return "WINDSCREEN";

        // Nothing else
        return undefined;
    }
}

export default WebCrawler;
