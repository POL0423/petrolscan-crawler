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
 * File: test/test_main.ts
 */

// Imports
//-------------------------------------------------
import moment from 'moment-timezone';

// Logic
//-------------------------------------------------
const timezone = moment.tz.guess();     // Get local timezone

// Log start
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Test Starting...`);

// TODO: Basic connectivity and database logging test

// TODO: Crawler tests

// Log end
console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Test Finished.`);
