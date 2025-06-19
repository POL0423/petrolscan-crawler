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
import mysql, { FieldPacket, RowDataPacket } from 'mysql2';

// Local imports
import DBData from '../types/DBData.js';
import DBSettings from '../types/DBSettings.js';

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
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            station_name VARCHAR(255) NOT NULL,
            station_loc_name VARCHAR(255) NOT NULL,
            station_loc_lat DOUBLE NOT NULL,
            station_loc_lon DOUBLE NOT NULL,
            fuel_type VARCHAR(255) NOT NULL,
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
            port: this.settings.port,
            user: this.settings.username,
            password: this.settings.password,
            database: this.settings.database
        }).promise();

        console.log(`[${moment().tz(moment.tz.guess())
            .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Checking for updates...`);
        
        // Check if data already exists in DB
        try {
            // Prepare retrieving variables
            let rows: RowDataPacket[], _fields: FieldPacket[];

            // Send database query
            [rows, _fields] = await connection.query<RowDataPacket[]>(
                `SELECT * FROM petrolscan_data
                WHERE station_name = ?
                AND station_loc_lat = ?
                AND station_loc_lon = ?
                AND fuel_type = ?
                AND fuel_quality ${data.FuelQuality ? "= ?" : "IS NULL"};`,
                [
                    data.StationName,
                    data.StationLocation.lat,
                    data.StationLocation.lon,
                    data.FuelType,
                    data.FuelQuality
                ]
            );

            // Debug
            console.debug(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Found ${rows.length} records.`);
            console.debug('Data:', rows);

            // Check if there are any records
            if (rows.length === 0) {
                console.log(`[${moment().tz(moment.tz.guess())
                    .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] No records found, new data will be inserted.`);
                connection.end();
                return true;
            }

            // Check if data are updated
            for (const row of rows) {
                if(
                    row.station_loc_name !== data.StationLocation.name ||
                    row.fuel_name !== data.FuelName ||
                    row.fuel_price !== data.FuelPrice
                ) {
                    console.log(`[${moment().tz(moment.tz.guess())
                        .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Updated data detected, new data will be inserted.`);
                    updated = true;
                    break;
                }
            }

            // No new data
            if (!updated) {
                console.log(`[${moment().tz(moment.tz.guess())
                    .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] No new data found, skipping.`);
            }
        } catch (error) {
            // Log error
            console.error(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Error while checking for updates: ${error}`);

            // Make sure updated is set to false
            updated = false;
        }

        // Release connection
        await connection.end();

        // Return check flag
        return updated;
    }
    
    public async log(data: DBData): Promise<void> {
        const timezone = moment.tz.guess();                 // Get local timezone
        const format_string = "YYYY-MM-DD HH:mm:ss zz";     // Datetime format      Year-Month-Day Hours:Minutes:Seconds Timezone

        // Log new data to console
        console.log(`[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Logging new data:`);
        console.log(`    Station Name .............. ${data.StationName}`);
        console.log(`    Station Location Name ..... ${data.StationLocation.name}`);
        console.log(`    Station GPS Location ...... ${data.StationLocation.lat}, ${data.StationLocation.lon}`);
        console.log(`    Fuel Type ................. ${data.FuelType ?? "N/A"}`);
        console.log(`    Fuel Quality .............. ${data.FuelQuality ?? "N/A"}`);
        console.log(`    Fuel Name ................. ${data.FuelName}`);
        console.log(`    Fuel Price ................ ${data.FuelPrice.toFixed(2)} CZK`);

        // Create connection
        let connection = mysql.createConnection({
            host: this.settings.hostname,
            port: this.settings.port,
            user: this.settings.username,
            password: this.settings.password,
            database: this.settings.database
        }).promise();

        // Log start
        console.log(`\n[${moment().tz(timezone)
            .format(format_string)}] [Database Logger] Copying data into database...`);

        // TODO: Database logging logic
        try {
            let [rows, _fields] = await connection.query<RowDataPacket[]>(
                `SELECT * FROM petrolscan_data
                WHERE station_name = ?
                AND station_loc_lat = ?
                AND station_loc_lon = ?
                AND fuel_type = ?
                AND fuel_quality ${data.FuelQuality ? "= ?" : "IS NULL"};`,
                [
                    data.StationName,
                    data.StationLocation.lat,
                    data.StationLocation.lon,
                    data.FuelType,
                    data.FuelQuality
                ]
            );

            // Check if data is found
            if (rows.length > 0) {              // Data found => update
                // Update data
                await connection.query(
                    `UPDATE petrolscan_data
                    SET station_loc_name = ?,
                    fuel_name = ?, fuel_price = ?
                    WHERE station_name = ?
                    AND station_loc_lat = ?
                    AND station_loc_lon = ?
                    AND fuel_type = ?
                    AND fuel_quality = ?;`,
                    [
                        // Set
                        data.StationLocation.name,
                        data.FuelName,
                        data.FuelPrice,
                        // Where
                        data.StationName,
                        data.StationLocation.lat,
                        data.StationLocation.lon,
                        data.FuelType,
                        data.FuelQuality
                    ]
                );
            } else {                            // No data found => insert
                // Insert data
                await connection.query(
                    `INSERT INTO petrolscan_data (station_name, station_loc_name, station_loc_lat, station_loc_lon, fuel_type, fuel_quality, fuel_name, fuel_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        data.StationName,
                        data.StationLocation.name,
                        data.StationLocation.lat,
                        data.StationLocation.lon,
                        data.FuelType,
                        data.FuelQuality,
                        data.FuelName,
                        data.FuelPrice
                    ]
                );
            }

            // Log end
            console.log(`[${moment().tz(timezone)
                .format(format_string)}] [Database Logger] Data copied into database.`);
        } catch (error) {
            // Log error
            console.error(`[${moment().tz(timezone)
                .format(format_string)}] [Database Logger] Error while copying data into database: ${error}`);
        }

        // Release connection
        connection.end();
    }

    public async retrieveData(): Promise<DBData[]> {
        // Log start
        console.log(`[${moment().tz(moment.tz.guess())
            .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Retrieving data from database...`);

        // Prepare data structure
        let data: DBData[] = [];

        // Create connection
        let connection = mysql.createConnection({
            host: this.settings.hostname,
            port: this.settings.port,
            user: this.settings.username,
            password: this.settings.password,
            database: this.settings.database
        }).promise();
        
        // TODO: Retrieve data from database
        try {
            let [rows, _fields] = await connection.query<RowDataPacket[]>(
                `SELECT * FROM petrolscan_data;`
            );

            for (const row of rows) {
                // Debug
                console.debug(`[${moment().tz(moment.tz.guess())
                    .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Retrieved data:`);
                console.debug(row);

                // Push data
                data.push({
                    StationName: row.station_name,
                    StationLocation: {
                        name: row.station_loc_name,
                        lat: row.station_loc_lat,
                        lon: row.station_loc_lon
                    },
                    FuelType: row.fuel_type,
                    FuelQuality: row.fuel_quality,
                    FuelName: row.fuel_name,
                    FuelPrice: row.fuel_price
                });
            }

            // Log end
            console.log(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Data successfully retrieved from database.`);
        } catch (error) {
            // Log error
            console.error(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [Database Logger] Error while retrieving data from database: ${error}`);
        }

        // Release connection
        connection.end();
        return data;
    }
}

export default DBLogger;
