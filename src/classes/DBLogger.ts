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
import moment from 'moment-timezone';

// Local imports
import DBData from '../types/DBData.js';
import Timestamp from './Timestamp.js';
import WebCrawler from './WebCrawler.js';

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
    
    public log(data: DBData, crawler: WebCrawler): void {
        const timezone = moment.tz.guess();                 // Get local timezone
        const format_string = "YYYY-MM-DD HH:mm:ss zz";     // Datetime format      Year-Month-Day Hours:Minutes:Seconds Timezone

        // Log new data to console
        console.log(`[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] New data from crawler "${crawler.getName()}":`);
        console.log(`    Station Name .......... ${data.StationName}`);
        console.log(`    Station GPS Location .. ${data.StationLocation.lat} ${data.StationLocation.lon}`);
        console.log(`    Fuel Type ............. ${data.FuelType || "NOT_SPECIFIED"}`);
        console.log(`    Fuel Name ............. ${data.FuelName}`);
        console.log(`    Fuel Price ............ ${data.FuelPrice}`);

        console.log(`\n[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Copying data into database...`);

        // TODO: Database logging logic
    }
}

export default DBLogger;
