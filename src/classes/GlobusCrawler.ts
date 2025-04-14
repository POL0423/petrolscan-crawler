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
import FuelQuality from '../types/FuelQuality.js';
import FuelType from '../types/FuelType.js';

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
                console.log(`[${moment().tz(timezone).format(format)}] [Process] Start ${this.getName()}`);

                // Crawling logic
                try {
                    console.log(`[${moment().tz(timezone)
                        .format(format)}] [Process] ${this.getName()} crawler is starting the extraction process...`);
                    
                    // Step 2: Handle cookie consent if present
                    await page.waitForSelector('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    const cookieConsentBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    if (cookieConsentBtn) {
                        console.log('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForTimeout(1000); // Wait for consent to be processed
                    }
                    
                    // Step 3: Click on "Vybrat pobočku" button
                    await page.waitForSelector('div#__nuxt header#header button.btn-lg');
                    await page.click('div#__nuxt header#header button.btn-lg');
                    await page.waitForTimeout(1000); // Wait for the location selection to appear
                    
                    // Step 4: Get all locations
                    console.log(`[${moment().tz(timezone)
                        .format(format)}] [Process] ${this.getName()} crawler is collecting all available locations...'`);
                    await page.waitForSelector('#input_9 > ul > li');
                    
                    const locations = await page.locator('#input_9 > ul > li').evaluateAll((elements: any[]) => {
                        return elements.map(el => {
                            const input = el.querySelector('input');
                            const label = el.querySelector('label');
                            return {
                                value: input ? input.getAttribute('data-option-value') : null,
                                name: label ? label.textContent.trim() : 'Unknown location'
                            };
                        }).filter(loc => loc.value); // Filter out any null values
                    });
                    
                    console.log(`[${moment().tz(timezone)
                        .format(format)}] [Process] Found ${locations.length} locations.`);

                    console.debug('DEBUG', locations);
                    
                    // Collected data structure
                    const fuelData = [];
                    
                    // Step 5-9: Iterate through each location
                    for (const location of locations) {
                        console.log(`[${moment().tz(timezone)
                            .format(format)}] [Process] Processing location: ${location.name}`);
                        
                        // Click on the location selection button again
                        await page.click('div#__nuxt header#header button.btn-lg');
                        await page.waitForTimeout(1000);
                        
                        // Find and click the specific location
                        const selector = `#input_9 > ul > li input[data-option-value="${location.value}"]`;
                        await page.waitForSelector(selector);
                        await page.click(selector);
                        
                        // Wait for the data to load
                        await page.waitForTimeout(1500);
                        
                        // Extract station name
                        const stationName = await page.locator(
                            '#teleport-target > div > div > div > div.shrink-1.grow-0.max-h-full.min-h-0.overflow-y-auto.overflow-auto.overscroll-contain > div > section > div.flex.items-center.gap-x-4 > h2 > span.text-sm.lg\\:text-base'
                        ).evaluate((el: HTMLElement | SVGElement) => { return el.textContent?.trim() || ''; });
                        
                        // Extract fuel names and prices
                        const fuels = await page.$$eval(
                            'body > div#teleport-target > div.items-end > div.items-end > div.flex-col > div.overscroll-contain > div.max-h-full > div.lg\\:pl-6 > section.space-y-2 > table.w-full > tbody > tr',
                            (rows: any[]) => rows.map(row => {
                                const nameEl = row.querySelector('th.text-left');
                                const priceEl = row.querySelector('td.text-right');
                                const type = WebCrawler.resolveFuelType('globus', nameEl ? nameEl.textContent.trim() : 'Unknown');
                                const quality = WebCrawler.resolveFuelQuality('globus', nameEl ? nameEl.textContent.trim() : 'Unknown');
                                
                                return {
                                    name: nameEl ? nameEl.textContent.trim() : 'Unknown',
                                    type: type,
                                    quality: quality,
                                    price: priceEl ? parseFloat(priceEl.textContent
                                        .replace('Kč', '').replace(',', '.').trim()) : 0
                                };
                            })
                        );
                        
                        // Add data to our collection
                        const locationData = {
                            stationName: `Globus ${stationName}`,
                            location: {
                                name: location.name,
                                lat: 0,
                                lon: 0
                            },
                            fuels: fuels
                        };
                        
                        // Add data to collection
                        fuelData.push(locationData);
                        
                        // Log data for debugging
                        console.debug(`Station: ${locationData.stationName}`);
                        console.debug(`Location: ${locationData.location}`);
                        console.debug('Fuels:');
                        fuels.forEach((fuel: { name: string; type: FuelType; quality: FuelQuality; price: any; }) => {
                            console.debug(`  - ${fuel.name}: ${fuel.price} Kč`);
                            
                            // Determine fuel type and quality using WebCrawler static methods
                            const fuelType = fuel.type;
                            const fuelQuality = fuel.quality;
                            console.debug(`    Type: ${fuelType || 'Unknown'}, Quality: ${fuelQuality || 'N/A'}`);
                        });
                        
                        // Click the "Změnit" button to go back to location selection
                        const changeButton = page.locator('#teleport-target > div > div > div > div.shrink-1.grow-0.max-h-full.min-h-0.overflow-y-auto.overflow-auto.overscroll-contain > div > section > div.flex.items-center.gap-x-4 > button');
                        if (changeButton) {
                            await changeButton.click();
                            await page.waitForTimeout(1000);
                        } else {
                            console.warn(`[${moment().tz(timezone).format(format)}] [Process] ${thisObj
                                .getName()} crawler could not find "Změnit" button, trying alternative approach...`);
                            // Alternative: go back to main page and start over
                            await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                            await page.waitForTimeout(1000);
                            
                            // Need to accept cookies again potentially
                            const cookieBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                            if (cookieBtn) {
                                await cookieBtn.click();
                                await page.waitForTimeout(1000);
                            }
                        }
                    }
                    
                    console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] ${thisObj
                        .getName()} crawler finished successfully.`);
                    console.log(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")}] [Process] Collected data from ${
                        fuelData.length} locations with a total of ${fuelData.reduce((sum, loc) => sum + loc.fuels.length,
                            0)} fuel prices`);
                    
                    // Save the collected data to dataset
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });
                    
                } catch (error) {
                    console.error(`[${moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss zz")
                        }] [Process] \x1b[31;1mError in ${this.getName()} crawler: ${error}\x1b[0m`);
                }
            }
        });

        // Run the crawler
        await crawler.run([this.getUrl()]);
    }
}

export default GlobusCrawler;
