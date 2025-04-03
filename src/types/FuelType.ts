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
 * File: src/types/FuelType.ts
 */

// Types declarations
type FuelType =         "PETROL" |              // Petrol
                        "DIESEL" |              // Diesel
                        "CNG" |                 // Compressed natural gas
                        "LPG" |                 // Liquid petroleum gas
                        "HVO" |                 // Hydrotreated vegetable oil
                        "ADBLUE" |              // AdBlue (synthetic pee acid)
                        "WINDSCREEN_CLEANER" |  // Windscreen cleaning fluid
                        undefined;              // Unspecified type (most likely will result in an error)

export default FuelType;
