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
 * File: src/classes/DBLogger.ts
 */

// Imports
//-------------------------------------------------

// Global imports
const mysql = require('mysql');

// Local imports
import DBData from '../types/DBData.js';
import Timestamp from './Timestamp.js';

// Logic
//-------------------------------------------------

// Class declaration
class DBLogger {
    private settings: object;

    constructor(settings: {
        hostname: string;
        port: string;
        username: string;
        password: string;
        database: string;
    }) {
        this.settings = settings;
    }

    public checkUpdates(data: DBData): boolean {
        // Update check flag
        let updated = false;

        // TODO: Checking logic

        // Return value
        return updated;
    }
    
    public log(data: DBData, crawler_name: string): void {
        let timestamp = new Date();

        // Log new data to console
        console.log(`[${Timestamp.getFullDateTime(timestamp)}] New data from crawler ""${crawler_name}:`);
        console.log(`    Station Name .......... ${data.StationName}`);
        console.log(`    Station GPS Location .. ${data.StationLocation.lat} ${data.StationLocation.lon}`);
        console.log(`    Fuel Type ............. ${data.FuelType || "NOT_SPECIFIED"}`);
        console.log(`    Fuel Name ............. ${data.FuelName}`);
        console.log(`    Fuel Price ............ ${data.FuelPrice}`);

        // TODO: Database logging logic
    }
}

export default DBLogger;
