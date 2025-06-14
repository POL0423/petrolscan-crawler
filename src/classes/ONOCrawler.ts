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
 * File: src/classes/ONOCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { chromium } from 'playwright';
import moment from 'moment-timezone';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";
import StationLinks from '../types/StationLinks.js';
import Location from '../types/Location.js';
import FuelData from '../types/FuelData.js';
import LocationData from '../types/LocationData.js';
import DBData from '../types/DBData.js';

// Logic
//-------------------------------------------------

class ONOCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("ONO", "https://tank-ono.cz/cz/", logger);
    }

    public async start(): Promise<void> {
        // Log start
        this.printMessage("Starting the extraction process...");

        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            // Timeouts
            navigationTimeoutSecs: 180,         // navigation timeout of ........... 3 minutes
            requestHandlerTimeoutSecs: 900,     // request handler timeout of ..... 15 minutes
            maxRequestRetries: 3,
            // Headers
            preNavigationHooks: [
                async ({ page }) => {
                    // Set real user agent of Google Chrome browser
                    await page.setExtraHTTPHeaders({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'cs,en-US;q=0.9,en;q=0.8'
                    });
                }
            ],
            requestHandler: async ({ page }) => {
                // Crawling logic
                //-------------------------------------------------------------

                try {
                    // Step 1: Load the main page
                    //-------------------------------------------------------------
                    await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });

                    // Step 2: Crawl links of petrol stations
                    //-------------------------------------------------------------

                    // Get the list of links
                    const station_links = await page.locator('map#mapname > area').all();

                    // Convert to an array of petrol station link data
                    const stations: StationLinks[] = [];
                    for (let station_link of station_links) {
                        const href = await station_link.getAttribute('href');
                        const location = await station_link.getAttribute('alt');

                        stations.push({
                            location: location || "Unknown",
                            href: href || "#"
                        });

                        // Debug info
                        thisObj.printMessage(`Found petrol station: '${location}' at '${href}'`, "DEBUG");
                    }

                    // Step 3: Crawl petrol stations
                    //-------------------------------------------------------------

                    // Create fuel data array
                    const fuelData: LocationData[] = [];

                    // Crawl the links and extract data
                    for (let station of stations) {
                        // Create a new browser for each location
                        // That ensures clean state for each location processing
                        thisObj.printMessage(`Processing location: ${station.location}`);

                        try {
                            // Use a new browser for each location
                            const browser = await chromium.launch();
                            const newContext = await browser.newContext();
                            const newPage = await newContext.newPage();

                            try {
                                await newPage.goto(thisObj.getUrl() + station.href, { waitUntil: 'networkidle' });

                                // Find full name of the petrol station
                                const full_name_locator = newPage.locator('div#nadpis');
                                let full_name = await full_name_locator.textContent();
                                full_name = full_name?.replace(/ +/g, " ").trim() || "Unknown";
        
                                // Get station location name
                                let station_location = station.location;
                                let changed = false;
        
                                // Check if the name contains "exit" to trim it
                                if (station_location.toLowerCase().includes("exit")) {
                                    station_location = station_location
                                    .replace(/ *[,-] +D[0-9]+ +exit +[0-9]+/g, "").trim();
                                    changed = true;
                                }
                                
                                // Replace "ONO I" and "ONO II" with "1" or "2"
                                if (station_location.toLowerCase().endsWith("ono i")) {
                                    station_location = station_location.replace("ONO I", "1");
                                    changed = true;
                                }
                                if (station_location.toLowerCase().endsWith("ono ii")) {
                                    station_location = station_location.replace("ONO II", "2");
                                    changed = true;
                                }

                                // Trim "u Kroměříže" as it doesn't work
                                if (station_location.toLowerCase().includes("u kroměříže")) {
                                    station_location = station_location.replace(" u Kroměříže", "");
                                    changed = true;
                                }

                                // Debug info: print changed location
                                if (changed) {
                                    thisObj.printMessage(`Location changed from '${station.location
                                        }' to '${station_location}' for GPS query purposes`, "DEBUG");
                                }

                                // Get fuel rows
                                let fuel_rows = await newPage
                                    .locator("div#stojan > table tr:has(> td:nth-child(1) > img):has(> td:nth-child(2) > img)")
                                    .all();
                                
                                // Create elements map
                                let elements_map = [];
                                for (let fuel_row of fuel_rows) {
                                    let name_element = fuel_row.locator("td:nth-child(1) > img").first();
                                    let price_element = fuel_row.locator("td:nth-child(2)").first();
        
                                    elements_map.push({
                                        name: name_element,
                                        price: price_element
                                    });
                                }

                                // Valid fuel names and digits values
                                const valid_fuel_names = [
                                    "../images/n95c.gif",
                                    "../images/n95pc.gif",
                                    "../images/n98c.gif",
                                    "../images/dc.gif",
                                    "../images/dpc.gif",
                                    "../images/lpgc.gif",
                                    "../images/abc.gif"
                                ];
                                const valid_digit_values = [
                                    // Whole CZK
                                    "../images/n0.gif",
                                    "../images/n1.gif",
                                    "../images/n2.gif",
                                    "../images/n3.gif",
                                    "../images/n4.gif",
                                    "../images/n5.gif",
                                    "../images/n6.gif",
                                    "../images/n7.gif",
                                    "../images/n8.gif",
                                    "../images/n9.gif",
                                    // Decimals
                                    "../images/m0.gif",
                                    "../images/m1.gif",
                                    "../images/m2.gif",
                                    "../images/m3.gif",
                                    "../images/m4.gif",
                                    "../images/m5.gif",
                                    "../images/m6.gif",
                                    "../images/m7.gif",
                                    "../images/m8.gif",
                                    "../images/m9.gif"
                                ];

                                // Filter out invalid elements
                                elements_map = elements_map.filter(async (element) => {
                                    // Set the preset flag
                                    let valid = false;

                                    // Get the fuel name img src
                                    let name_src = await element.name.getAttribute('src');

                                    // Check if it exists
                                    if(!name_src) return false;

                                    // Get the fuel price img elements
                                    let price_imgs = await element.price.locator('img').all();

                                    // Iterate through them
                                    for (let price_img of price_imgs) {
                                        // Get the img src
                                        let src = await price_img.getAttribute('src');

                                        // Check if it exists
                                        if(!src) continue;

                                        // Check if it is a valid digit value => just one is enough
                                        if(src in valid_digit_values) {
                                            valid = true;
                                            break;
                                        }
                                    }

                                    // Check if the name is valid
                                    valid = valid && name_src in valid_fuel_names;

                                    // Return the preset flag
                                    return valid;
                                });
                                
                                // Iterate through fuels
                                let fuels: FuelData[] = [];
                                for (let element of elements_map) {
                                    // Get fuel name
                                    let fuel_name = await element.name.getAttribute('src');
                                    fuel_name = ONOCrawler.convertName(fuel_name);
        
                                    // Get fuel price
                                    let price_str = "";             // Prepare string builder
                                    for(let j = 0; j < 5; j++) {
                                        // Get the digit of the price
                                        let price_digit = await element.price.locator(`img:nth-child(${j + 1})`).getAttribute('src');
                                        // Append the digit to the string
                                        price_str += (j > 0) ? `|${price_digit}` : price_digit;
                                    }
                                    let price = ONOCrawler.convertPrice(price_str);
        
                                    // Skip empty lines
                                    if (fuel_name === "" || price === 0) continue;
        
                                    // Push fuel name
                                    fuels.push({
                                        name: fuel_name,
                                        price: price
                                    });
                                }
                                
                                // Check if there are any fuel data
                                if (fuels.length === 0) {
                                    thisObj.printMessage('No fuel data found, skipping.');
                                    continue;
                                }
                                        
                                // Create location fata for this location
                                const locationData: LocationData = {
                                    stationName: `ONO ${station_location}`,
                                    location: full_name || station_location,
                                    fuels: fuels
                                };
                                        
                                // Log data for debugging
                                thisObj.printMessage(`Station: ${locationData.stationName}`, "DEBUG");
                                thisObj.printMessage(`Location: ${locationData.location}`, "DEBUG");
                                thisObj.printMessage('Fuels:', "DEBUG");
                                fuels.forEach((fuel: { name: string; price: number; }) => {
                                    thisObj.printMessage(`  - ${fuel.name}: ${fuel.price.toFixed(2)} CZK`, "DEBUG");
                                });
                                
                                // Add location data to collection
                                fuelData.push(locationData);
                            } catch (error) {
                                thisObj.printMessage(`Error processing location ${station.location}: ${error}`, "ERROR");

                                // Take a screenshot of the error
                                await newPage.screenshot({
                                    path: `screenshots/error-ono-${WebCrawler.convertFileName(station.location)}.png`
                                });
                            } finally {
                                // Always close the browser
                                await newContext.close();
                                await browser.close();
                            }
                        } catch (browserError) {
                            thisObj.printMessage(`Error creating browser for location ${
                                station.location}: ${browserError}`, "ERROR");
                        }
                    }
                        
                    // Print statistics
                    thisObj.printMessage(`${thisObj.getName()} crawler finished successfully.`);
                    thisObj.printMessage(`Collected data from ${fuelData.length} locations with a total of ${fuelData
                        .reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);
                    
                    // Save collected data to local dataset
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });

                    // Log into database
                    await thisObj.writeToDB('ono', fuelData);
                } catch (error) {
                    thisObj.printMessage(`\x1b[31;1mError in ${thisObj.getName()} crawler: ${error}\x1b[0m`, "ERROR");
                }
            }
        });

        // Run the crawler
        await crawler.run([this.getUrl()]);

        // Log end
        this.printMessage("Crawler finished.");
    }

    public static convertName(name: string | null): string {
        // Check if the name is null => return empty string
        if (name === null) return "";

        // Convert img src to fuel name
        if (name.includes('n95c')) return "Natural 95";
        if (name.includes('n95pc')) return "Natural 95+";
        if (name.includes('n98c')) return "Natural 98";
        if (name.includes('n98pc')) return "Natural 98+";
        if (name.includes('dc')) return "Diesel";
        if (name.includes('dpc')) return "Diesel+";
        if (name.includes('lpgc')) return "LPG";
        if (name.includes('abc')) return "AdBlue";

        // Defaults to empty string
        return "";
    }

    public static convertPrice(price: string | null): number {
        // TODO: Convert price img src string to number

        // Check if the price is null => return 0
        if (price === null) return 0;

        // Check if the price is empty => return 0
        if (price === "") return 0;

        // Split the digits
        let digits = price.split("|");

        // Create string builder and decimal point counter
        let price_str = "", decimal_counter = 0;
        for (let i = 0; i < digits.length; i++) {
            // Get the digit of the price
            let price_digit = digits[i];

            // Check for the decimal point
            if (price_digit.includes('/m')) {
                // If the digit is a decimal point, increment the counter
                decimal_counter++;
                if (decimal_counter === 1) price_str += "."; // Add decimal point only once
            }

            // Determine the digit value
            if (price_digit.includes('0')) price_str += "0";
            if (price_digit.includes('1')) price_str += "1";
            if (price_digit.includes('2')) price_str += "2";
            if (price_digit.includes('3')) price_str += "3";
            if (price_digit.includes('4')) price_str += "4";
            if (price_digit.includes('5')) price_str += "5";
            if (price_digit.includes('6')) price_str += "6";
            if (price_digit.includes('7')) price_str += "7";
            if (price_digit.includes('8')) price_str += "8";
            if (price_digit.includes('9')) price_str += "9";
        }

        // Check if the price is empty => return 0
        if (price_str === ".") return 0;

        // Check if the price begins with a decimal point
        if (price_str.startsWith(".")) {
            // Add a zero before the decimal point
            price_str = "0" + price_str;
        }

        // Return the price
        return parseFloat(price_str);
    }
}

export default ONOCrawler;
