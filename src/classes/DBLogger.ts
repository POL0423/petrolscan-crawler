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
import moment from 'moment-timezone';
import mysql from 'mysql2';

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
            port: Number.parseInt(this.settings.port),
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
            fuel_quality VARCHAR(255),
            fuel_name VARCHAR(255) NOT NULL,
            fuel_price FLOAT NOT NULL
        );`);
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

    public async checkUpdates(data: DBData): Promise<boolean> {
        // Update check flag
        let updated = false;

        // Create connection
        let connection = mysql.createConnection({
            host: this.settings.hostname,
            port: Number.parseInt(this.settings.port),
            user: this.settings.username,
            password: this.settings.password,
            database: this.settings.database,
            rowsAsArray: true
        }).promise();

        console.log(`[${moment().tz(moment.tz.guess())
            .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Checking for updates...`);
        
        // TODO: Check if data already exists in DB
        try {
            const [rows, fields] = await connection.query(`SELECT * FROM petrolscan_data
                WHERE station_name = ?
                AND station_loc_name = ?
                AND station_loc_lat = ?
                AND station_loc_lon = ?
                AND fuel_name = ?
                AND fuel_type = ? AND fuel_quality=?;`,
                [
                    data.StationName,
                    data.StationLocation.name,
                    data.StationLocation.lat,
                    data.StationLocation.lon,
                    data.FuelName,
                    data.FuelType,
                    data.FuelQuality
                ]
            );

            // Debug
            console.log(`[${moment().tz(moment.tz.guess()).format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Debug Result:`);
            console.log(rows);
            console.log(fields);
        } catch (error) {
            // Log error
            console.error(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Error while checking for updates: ${error}`);

            // Make sure updated is set to false and release connection
            updated = false;
            connection.end();

            // Return check flag
            return updated;
        }

        // Release connection
        await connection.end();

        // Return check flag
        return updated;
    }
    
    public log(data: DBData): void {
        const timezone = moment.tz.guess();                 // Get local timezone
        const format_string = "YYYY-MM-DD HH:mm:ss zz";     // Datetime format      Year-Month-Day Hours:Minutes:Seconds Timezone

        // Log new data to console
        console.log(`[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] New data:`);
        console.log(`    Station Name .............. ${data.StationName}`);
        console.log(`    Station Location Name ..... ${data.StationLocation.name}`);
        console.log(`    Station GPS Location ...... ${data.StationLocation.lat} ${data.StationLocation.lon}`);
        console.log(`    Fuel Type ................. ${data.FuelType || "N/A"}`);
        console.log(`    Fuel Quality .............. ${data.FuelQuality || "N/A"}`);
        console.log(`    Fuel Name ................. ${data.FuelName}`);
        console.log(`    Fuel Price ................ ${data.FuelPrice.toFixed(2)} CZK`);

        // Log start
        console.log(`\n[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Copying data into database...`);

        // TODO: Database logging logic

        // Log end
        console.log(`[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Data copied into database.`);
    }
}

export default DBLogger;
