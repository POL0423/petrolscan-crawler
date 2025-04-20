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
 * File: src/crawlers/common/dbsettings.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import 'dotenv/config';     // Import .env file defined environment variables

// Local imports
import DBLogger from "../../classes/DBLogger.js";

// Environment variables
const logger = new DBLogger({
    hostname:   process.env.DB_HOSTNAME             ?? "localhost",     // MySQL database server hostname
    port:       Number.parseInt(process.env.DB_PORT ?? "3306"),         // MySQL database server port
    username:   process.env.DB_USERNAME             ?? "root",          // MySQL database server username
    password:   process.env.DB_PASSWORD             ?? "",              // MySQL database server user password
    database:   process.env.DB_DATABASE             ?? "default"        // MySQL database name
});

export default logger;
