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
 * File: src/types/StationLinks.ts
 */

// Imports
//-------------------------------------------------
import { Locator } from "playwright-core";

// Logic
//-------------------------------------------------

type MakroStoreLocator = {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    href: string;
}

export default MakroStoreLocator;
