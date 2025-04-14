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
import { parentPort } from 'worker_threads';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";

class GlobusCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Globus", "https://www.globus.cz/", logger);
    }

    public async start(): Promise<void> {
        // Check interruption flag (should be false, but you never know)
        if (this.isInterrupted()) return;

        // Pass this object
        const thisObj = this;

        // Create a new crawler
        const crawler = new PlaywrightCrawler({
            requestHandler: async ({ page }) => {
                // Check if interrupted
                if (thisObj.isInterrupted()) return;

                // Log start
                parentPort?.postMessage(`Start ${this.getName()}`);

                // Crawling logic
                try {
                    parentPort?.postMessage(`${this.getName()} crawler is starting the extraction process...`);
                    
                    // Step 2: Handle cookie consent if present
                    const cookieConsentBtn = await page.$('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    if (cookieConsentBtn) {
                        parentPort?.postMessage('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForTimeout(1000); // Wait for consent to be processed
                    }
                    
                    // Step 3: Click on "Vybrat pobočku" button
                    parentPort?.postMessage('Clicking on "Vybrat pobočku" button...');
                    await page.waitForSelector('div#__nuxt header#header button.btn-lg');
                    await page.click('div#__nuxt header#header button.btn-lg');
                    await page.waitForTimeout(1000); // Wait for the location selection to appear
                    
                    // Step 4: Get all locations
                    parentPort?.postMessage('Collecting all available locations...');
                    await page.waitForSelector('#input_9 > ul > li');
                    
                    const locations = await page.$$eval('#input_9 > ul > li', (elements: any[]) => {
                        return elements.map(el => {
                            const input = el.querySelector('input');
                            const label = el.querySelector('label');
                            return {
                                value: input ? input.getAttribute('data-option-value') : null,
                                name: label ? label.textContent.trim() : 'Unknown location'
                            };
                        }).filter(loc => loc.value); // Filter out any null values
                    });
                    
                    parentPort?.postMessage(`Found ${locations.length} locations`);
                    
                    // Collected data structure
                    const fuelData = [];
                    
                    // Step 5-9: Iterate through each location
                    for (const location of locations) {
                        parentPort?.postMessage(`Processing location: ${location.name}`);
                        
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
                        const stationName = await page.$eval(
                            '#teleport-target > div > div > div > div.shrink-1.grow-0.max-h-full.min-h-0.overflow-y-auto.overflow-auto.overscroll-contain > div > section > div.flex.items-center.gap-x-4 > h2 > span.text-sm.lg\\:text-base',
                            (el: { textContent: string; }) => el.textContent.trim()
                        );
                        
                        // Extract fuel names and prices
                        const fuels = await page.$$eval(
                            'body > div#teleport-target > div.items-end > div.items-end > div.flex-col > div.overscroll-contain > div.max-h-full > div.lg\\:pl-6 > section.space-y-2 > table.w-full > tbody > tr',
                            (rows: any[]) => rows.map(row => {
                                const nameEl = row.querySelector('th.text-left');
                                const priceEl = row.querySelector('td.text-right');
                                
                                return {
                                    name: nameEl ? nameEl.textContent.trim() : 'Unknown',
                                    price: priceEl ? parseFloat(priceEl.textContent.replace('Kč', '').replace(',', '.').trim()) : 0
                                };
                            })
                        );
                        
                        // Add data to our collection
                        const locationData = {
                            stationName: `Globus ${stationName}`,
                            location: location.name,
                            fuels: fuels
                        };
                        
                        // Add data to collection
                        fuelData.push(locationData);
                        
                        // Log data for debugging
                        parentPort?.postMessage(`Station: ${locationData.stationName}`);
                        parentPort?.postMessage(`Location: ${locationData.location}`);
                        parentPort?.postMessage('Fuels:');
                        fuels.forEach((fuel: { name: string; price: any; }) => {
                            parentPort?.postMessage(`  - ${fuel.name}: ${fuel.price} Kč`);
                            
                            // Determine fuel type and quality using WebCrawler static methods
                            const fuelType = WebCrawler.resolveFuelType('Globus', fuel.name);
                            const fuelQuality = WebCrawler.resolveFuelQuality('Globus', fuel.name);
                            parentPort?.postMessage(`    Type: ${fuelType || 'Unknown'}, Quality: ${fuelQuality || 'N/A'}`);
                        });
                        
                        // Click the "Změnit" button to go back to location selection
                        const changeButton = await page.$('#teleport-target > div > div > div > div.shrink-1.grow-0.max-h-full.min-h-0.overflow-y-auto.overflow-auto.overscroll-contain > div > section > div.flex.items-center.gap-x-4 > button');
                        if (changeButton) {
                            await changeButton.click();
                            await page.waitForTimeout(1000);
                        } else {
                            parentPort?.postMessage('Could not find "Změnit" button, trying alternative approach...');
                            // Alternative: go back to main page and start over
                            await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                            await page.waitForTimeout(1000);
                            
                            // Need to accept cookies again potentially
                            const cookieBtn = await page.$('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                            if (cookieBtn) {
                                await cookieBtn.click();
                                await page.waitForTimeout(1000);
                            }
                        }
                    }
                    
                    parentPort?.postMessage('Globus crawler finished successfully');
                    parentPort?.postMessage(`Collected data from ${fuelData.length} locations with a total of ${fuelData.reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);
                    
                    // Save the collected data to dataset
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });
                    
                } catch (error) {
                    parentPort?.postMessage(`Error in ${this.getName()} crawler: ${error}`);
                }
            }
        });

        // Run the crawler
        await crawler.run([this.getUrl()]);
    }
}

export default GlobusCrawler;
