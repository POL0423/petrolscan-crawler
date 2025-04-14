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
import { parentPort } from 'worker_threads';

// Local imports
import DBData from '../types/DBData.js';
import DBSettings from '../types/DBSettings.js';
import WebCrawler from './WebCrawler.js';

// Logic
//-------------------------------------------------

// Class declaration
class DBLogger {
    private settings: DBSettings;

    constructor(settings: DBSettings) {
        // Save settings
        this.settings = settings;

        // Initialize database and check table existance
        const connection = mysql.createConnection({
            host: this.settings.hostname,
            port: this.settings.port,
            user: this.settings.username,
            password: this.settings.password
        });
        connection.connect();
        connection.query(`CREATE DATABASE IF NOT EXISTS ${this.settings.database}`);
        connection.query(`CREATE TABLE IF NOT EXISTS ${this.settings.database}.petrolscan_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            station_name VARCHAR(255) NOT NULL,
            station_loc_name VARCHAR(255) NOT NULL,
            station_loc_lat FLOAT NOT NULL,
            station_loc_lon FLOAT NOT NULL,
            fuel_type VARCHAR(255),
            fuel_name VARCHAR(255) NOT NULL,
            fuel_price FLOAT NOT NULL
        )`);
        // Created table should have following structure:
        // id INT AUTO_INCREMENT PRIMARY KEY, ......................... ID of the record (auto-incremented)
        // timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, .... Timestamp in UTC (YYYY-MM-DD HH:mm:ss)
        // station_name VARCHAR(255) NOT NULL, ........................ Name of the petrol station
        // station_loc_name VARCHAR(255) NOT NULL, .................... Name of the petrol station location (City, Street, etc.)
        // station_loc_lat FLOAT NOT NULL, ............................ Latitude of the petrol station (GPS coordinates)
        // station_loc_lon FLOAT NOT NULL, ............................ Longitude of the petrol station (GPS coordinates)
        // fuel_type VARCHAR(255), .................................... Type of the fuel (see src/types/FuelType.ts)
        // fuel_name VARCHAR(255) NOT NULL, ........................... Name of the fuel as defined by the petrol station
        // fuel_price FLOAT NOT NULL .................................. Price of the fuel in the petrol station

        // Close connection
        connection.end();
    }

    public checkUpdates(data: DBData): boolean {
        // Update check flag
        let updated = false;

        // Create connection
        let connection = mysql.createConnection({
            host: this.settings.hostname,
            port: this.settings.port,
            user: this.settings.username,
            password: this.settings.password,
            database: this.settings.database
        });
        connection.connect();

        parentPort?.postMessage(`[${moment().tz("UTC")
            .format("YYYY-MM-DD HH:mm:ss")}][Database Logger] Checking for updates...`);
        
        // Debug
        parentPort?.postMessage(`[${moment().tz("UTC")
            .format("YYYY-MM-DD HH:mm:ss")}][Database Logger] Query: SELECT * FROM petrolscan_data
            WHERE station_name="${data.StationName}"
            AND fuel_name="${data.FuelName}"
            AND station_loc_lat="${data.StationLocation.lat}"
            AND station_loc_lon="${data.StationLocation.lon}" AND fuel_type="${data.FuelType}"`);

        // TODO: Check if data already exists in DB
        // connection.query(`SELECT * FROM petrolscan_data
            // WHERE station_name="${data.StationName}"
            // AND fuel_name="${data.FuelName}"
            // AND station_loc_lat="${data.StationLocation.lat}"
            // AND station_loc_lon="${data.StationLocation.lon}" AND fuel_type="${data.FuelType}"`);

        // Return check flag
        return updated;
    }
    
    public log(data: DBData, crawler: WebCrawler): void {
        const timezone = moment.tz.guess();                 // Get local timezone
        const format_string = "YYYY-MM-DD HH:mm:ss zz";     // Datetime format      Year-Month-Day Hours:Minutes:Seconds Timezone

        // Log new data to console
        parentPort?.postMessage(`[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] New data from crawler "${crawler.getName()}":`);
        parentPort?.postMessage(`    Station Name .......... ${data.StationName}`);
        parentPort?.postMessage(`    Station GPS Location .. ${data.StationLocation.lat} ${data.StationLocation.lon}`);
        parentPort?.postMessage(`    Fuel Type ............. ${data.FuelType || "NOT_SPECIFIED"}`);
        parentPort?.postMessage(`    Fuel Name ............. ${data.FuelName}`);
        parentPort?.postMessage(`    Fuel Price ............ ${data.FuelPrice}`);

        parentPort?.postMessage(`\n[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Copying data into database...`);

        // TODO: Database logging logic
    }
}

export default DBLogger;
