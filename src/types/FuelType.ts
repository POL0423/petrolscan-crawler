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
type FuelTypeEnum = "PETROL_REGULAR" |      // Regular petrol (cheaper)
                    "PETROL_PREMIUM" |      // Premium petrol (expensive)
                    "DIESEL_REGULAR" |      // Regular diesel (cheaper)
                    "DIESEL_PREMIUM" |      // Premium diesel (expensive)
                    "ADBLUE" |              // AdBlue (pee acid)
                    "WINDSCREEN";           // Windscreen fluid (windshield cleaning fluid)

type FuelType = FuelTypeEnum | undefined;

export default FuelType;
