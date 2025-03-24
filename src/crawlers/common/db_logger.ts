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
    hostname: process.env.DB_HOSTNAME || "localhost",
    port: process.env.DB_PORT || "3306",
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "default"
});

export default logger;
