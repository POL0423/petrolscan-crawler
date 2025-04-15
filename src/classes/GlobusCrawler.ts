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
 * File: src/classes/GlobusCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import { PlaywrightCrawler, Dataset } from 'crawlee';
import moment from 'moment-timezone';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";
import DBData from '../types/DBData.js';

class GlobusCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Globus", "https://www.globus.cz/", logger);
    }

    public async start(): Promise<void> {
        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            requestHandler: async ({ page }) => {

                // Get local timezone
                const timezone = moment.tz.guess();
                const format = "YYYY-MM-DD HH:mm:ss zz";

                // Log start
                console.log(`[${moment().tz(timezone).format(format)}] [Process] Start ${this.getName()} crawler...`);

                // Crawling logic
                try {
                    console.log(`${this.getName()} crawler is starting the extraction process...`);
                    
                    // Step 2: Handle cookie consent if present
                    const cookieConsentBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    await cookieConsentBtn.waitFor();
                    if (cookieConsentBtn) {
                        console.log('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForLoadState('networkidle');     // Wait for consent to be processed
                    }
                    
                    // Step 3: Click on "Vybrat pobočku" button
                    const selectLocationBtn = page.locator('div#__nuxt header#header button.btn-lg');
                    await selectLocationBtn.waitFor();
                    await selectLocationBtn.click();
                    await page.waitForLoadState('networkidle');         // Wait for the location selection to appear
                    
                    // Step 4: Get all locations
                    console.log(`${this.getName()} crawler is collecting all available locations...'`);
                    const locations = await page.locator('#input_9 > ul > li').evaluateAll((elements: any[]) => {
                        return elements.map(el => {
                            const input = el.querySelector('input');
                            const label = el.querySelector('label');
                            const label_main = el.querySelector('span.text-base');
                            const label_sub = el.querySelector('span.text-xs');
                            let label_str = label ? (
                                label_main ? label_main.textContent.trim() : ''
                                + label_sub ? ` (${label_sub.textContent.trim()})` : ''
                            ) : '';

                            return {
                                value: input ? el.getAttribute('data-option-value') : null,
                                name: label ? label_str : 'Unknown location',
                                debug: {
                                    el_label_main: label_main.textContent.trim() || null,
                                    el_label_sub: label_sub.textContent.trim() || null
                                }
                            };
                        }).filter(loc => loc.value); // Filter out any null values
                    });
                    
                    console.log(`Found ${locations.length} locations.`);

                    console.log('DEBUG', locations);
                    
                    // Collected data structure
                    const fuelData = [];
                    
                    // Step 5-9: Iterate through each location
                    for (const location of locations) {
                        // Wait for the data to load
                        await page.waitForLoadState('networkidle');
                        
                        // Console log
                        console.log(`Processing location: ${location.name}`);
                        
                        // Find and click the specific location
                        const locInput = page.locator(`#input_9 > ul > li[data-option-value="${location.value}"] > label`);
                        await locInput.waitFor();
                        await locInput.click();
                        
                        // Wait for the data to load
                        await page.waitForLoadState('networkidle');
                        
                        // Extract station name
                        const stationName = await page.locator('#teleport-target span.text-sm.lg\\:text-base')
                            .evaluate((el: HTMLElement | SVGElement) => { return el.textContent?.trim() || ''; });
                        
                        // Extract fuel names and prices
                        const fuels = await page.locator('#teleport-target table.w-full > tbody > tr')
                            .evaluateAll((rows: any[]): {name: string; price: number}[] => rows.map((row: any): {
                                name: string; price: number
                            } => {
                                const nameEl = row.querySelector('th.text-left');
                                const priceEl = row.querySelector('td.text-right');

                                return {
                                    name: nameEl ? nameEl.textContent.trim() : 'Unknown',
                                    price: priceEl ? parseFloat(priceEl.textContent
                                        .replace('Kč', '').replace(',', '.').trim()) : 0
                                };
                            })
                        );
                        
                        // Add data to our collection
                        const locationData = {
                            stationName: `Globus ${stationName}`,
                            location: location.name,
                            fuels: fuels
                        };
                        
                        // Log data for debugging
                        console.debug(`Station: ${locationData.stationName}`);
                        console.debug(`Location: ${locationData.location}`);
                        console.debug('Fuels:');
                        fuels.forEach((fuel: { name: string; price: number; }) => {
                            console.debug(`  - ${fuel.name}: ${fuel.price} Kč`);
                            
                            // Determine fuel type and quality using WebCrawler static methods
                            const fuelType = WebCrawler.resolveFuelType('globus', fuel.name);
                            const fuelQuality = WebCrawler.resolveFuelQuality('globus', fuel.name);
                            console.debug(`    Type: ${fuelType || 'Unknown'}, Quality: ${fuelQuality || 'N/A'}`);
                        });
                        
                        // Add data to collection
                        fuelData.push(locationData);
                        
                        // Click the "Změnit" button to go back to location selection
                        const changeButton = page.locator('#teleport-target div.flex.items-center.gap-x-4 > button');
                        await changeButton.waitFor();
                        if (changeButton) {
                            await changeButton.click();
                            await page.waitForLoadState('networkidle');
                        } else {
                            console.warn(`${thisObj.getName()} crawler couldn't find "Změnit" button, trying alternative approach...`);
                            // Alternative: go back to main page and start over
                            await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                            await page.waitForLoadState('networkidle');
                            
                            // Need to accept cookies again potentially
                            const cookieBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                            if (cookieBtn) {
                                await cookieBtn.click();
                                await page.waitForLoadState('networkidle');
                            }
                        }
                    }
                    
                    console.log(`${thisObj.getName()} crawler finished successfully.`);
                    console.log(`Collected data from ${fuelData.length} locations with a total of ${fuelData
                        .reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);
                    
                    // Save the collected data to dataset
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });

                    // TODO: Log collected data to database
                    fuelData.forEach((location) => {
                        // Station name and location name
                        const stationName = location.stationName;
                        const stationLocationName = location.location;

                        // TODO: Location GPS coordinates
                        const stationLocationLat = 0;
                        const stationLocationLon = 0;

                        // Log data
                        location.fuels.forEach((fuel) => {
                            let data: DBData = {
                                StationName: stationName,
                                StationLocation: {
                                    name: stationLocationName,
                                    lat: stationLocationLat,
                                    lon: stationLocationLon
                                },
                                FuelName: fuel.name,
                                FuelPrice: fuel.price,
                                FuelType: WebCrawler.resolveFuelType('globus', fuel.name),
                                FuelQuality: WebCrawler.resolveFuelQuality('globus', fuel.name)
                            }

                            // Check if data are updated
                            let updated = thisObj.getLogger().checkUpdates(data);

                            // Log updated data
                            if(updated) thisObj.getLogger().log(data, thisObj);
                        });
                    });

                    // Log end
                    console.log(`[${moment().tz(timezone)
                        .format("YYYY-MM-DD HH:mm:ss zz")}] [Process] ${thisObj.getName()} crawler finished.`);
                } catch (error) {
                    console.error(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")
                        }] [Process] \x1b[31;1mError in ${thisObj.getName()} crawler: ${error}\x1b[0m`);
                }
            },


        });

        // Run the crawler
        await crawler.run([this.getUrl()]);
    }
}

export default GlobusCrawler;
