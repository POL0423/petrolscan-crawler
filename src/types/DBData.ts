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
 * File: src/types/DBData.ts
 */

// Imports
//-------------------------------------------------

// Local imports
import FuelQuality from './FuelQuality.js';
import FuelType from './FuelType.js';
import Location from './Location.js';

// Logic
//-------------------------------------------------
type DBData = {
    StationName: string;
    StationLocation: Location;
    FuelType: FuelType;
    FuelQuality: FuelQuality;
    FuelName: string;
    FuelPrice: number;
};

export default DBData;
