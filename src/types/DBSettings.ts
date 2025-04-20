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
 * File: src/types/DBSettings.ts
 */

// Imports
//-------------------------------------------------

// Logic
//-------------------------------------------------
type DBSettings = {
    hostname: string;       // Database server hostname
    port: number;           // Database server port
    username: string;       // Database server username
    password: string;       // Database server user password
    database: string;       // Database name
};

export default DBSettings;
