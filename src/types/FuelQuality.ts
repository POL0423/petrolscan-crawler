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
 * File: src/types/FuelQuality.ts
 */

type FuelQuality =      "STANDARD" |        // Standard fuel (cheaper option)
                        "MIDGRADE" |        // Mid-grade fuel (intermediate price option)
                        "PREMIUM" |         // Premium fuel (more expensive option)
                        "RACING" |          // Racing fuel (most expensive, provided by some petrol stations)
                        undefined;          // Unspecified quality (valid value, sometimes there's no other option)

export default FuelQuality;
