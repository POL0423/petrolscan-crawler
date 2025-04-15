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
import { expect } from 'playwright/test';

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
                            const label_main = el.querySelector('span.items-baseline > span.text-base');
                            const label_sub = el.querySelector('span.items-baseline > span.text-xs');
                            let label_str = '';
                            if (label) {
                                if (label_main) {
                                    label_str = label_main.textContent.trim();
                                }
                                if (label_sub) {
                                    label_str += ` (${label_sub.textContent.trim()})`;
                                }
                            }

                            return {
                                value: input ? el.getAttribute('data-option-value') : null,
                                name: label ? label_str : 'Unknown location'
                            };
                        }).filter(loc => loc.value); // Filter out any null values
                    });
                    
                    console.log(`Found ${locations.length} locations.`);
                    
                    // Collected data structure
                    const fuelData = [];
                    
                    // Step 5-9: Iterate through each location
                    for (const location of locations) {
                        try {
                            // Console log
                            console.log(`Processing location: ${location.name} (${location.value})`);
                            console.log('Returning to main page to ensure fresh state...');
                            
                            // Clear cookies
                            console.log('Clearing browser cookies to reset session state...');
                            await page.context().clearCookies();
                            
                            // Refresh page
                            await Promise.all([
                                page.goto(thisObj.getUrl()),
                                page.waitForLoadState('networkidle')
                            ]);
                            
                            // Accept cookies
                            const cookieBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                            if (await cookieBtn.isVisible()) {
                                console.log('Accepting cookies...');
                                // Použijeme Promise.all pro efektivnější kliknutí a čekání
                                await Promise.all([
                                    cookieBtn.click(),
                                    page.waitForLoadState('networkidle')
                                ]);
                            }
                            
                            // Open location selector
                            console.log('Clicking on "Vybrat pobočku" button...');
                            const selectLocationBtn = page.locator('div#__nuxt header#header button.btn-lg');
                            
                            // Wait for the button to be visible
                            await selectLocationBtn.waitFor({ state: 'visible', timeout: 20000 });
                            // Check clickability
                            await expect(selectLocationBtn).toBeEnabled();
                            
                            // Click and wait for data to load
                            await Promise.all([
                                selectLocationBtn.click(),
                                // Čekáme na dokončení navigace a kompletní načtení sítě
                                page.waitForLoadState('networkidle'),
                                // Čekáme, až DOM bude připraven
                                page.waitForLoadState('domcontentloaded')
                            ]);
                            
                            // Chech we are in location selector
                            console.log('Verifying location selection dialog is visible...');
                            const locSelector = '#input_9';
                            
                            try {
                                // Wait for dialog to appear
                                await page.locator(locSelector).waitFor({ 
                                    state: 'visible', 
                                    timeout: 20000 
                                });
                                
                                // Check location list is loaded
                                console.log('Waiting for locations list to be fully loaded...');
                                await page.waitForFunction(() => {
                                    const list = document.querySelector('#input_9 > ul');
                                    return list && list.children.length > 0;
                                }, { timeout: 15000 });
                                
                            } catch (waitError) {
                                console.warn('Timeout waiting for location dialog, attempting to recover...');
                                
                                // Diagnostics screenshot
                                await page.screenshot({ path: `error-dialog-${location.value}.png` });
                                
                                // Try clicking again
                                if (await selectLocationBtn.isVisible()) {
                                    console.log('Location button still visible, clicking again...');
                                    await Promise.all([
                                        selectLocationBtn.click(),
                                        page.waitForLoadState('networkidle')
                                    ]);
                                    
                                    // Wait for dialog again
                                    await page.locator(locSelector).waitFor({ 
                                        state: 'visible', 
                                        timeout: 15000 
                                    }).catch(e => {
                                        throw new Error(`Failed to open location dialog: ${e.message}`);
                                    });
                                } else {
                                    throw new Error('Location selection button no longer visible');
                                }
                            }
                            
                            // Get specified location
                            const locItemSelector = `#input_9 > ul > li[data-option-value="${location.value}"] > label`;
                            console.log(`Looking for location item: ${locItemSelector}`);
                            
                            // Check all location items are loaded
                            const allLocationItems = page.locator('#input_9 > ul > li');
                            const count = await allLocationItems.count();
                            console.log(`Found ${count} location items in the list`);
                            
                            if (count === 0) {
                                console.warn('No location items found, DOM structure might have changed');
                                // Zobrazíme HTML strukturu pro diagnostiku
                                const html = await page.locator('#input_9').evaluate(el => el.outerHTML);
                                console.log(`Current DOM structure: ${html.substring(0, 200)}...`);
                                throw new Error('Location items not found');
                            }
                            
                            // Try to locate the specified location
                            const locItem = page.locator(locItemSelector);
                            
                            // Check it exists
                            const exists = await locItem.count() > 0;
                            if (!exists) {
                                console.warn(`Location item with selector "${locItemSelector}" not found`);
                                // Try to find using a text search
                                console.log(`Trying to find location by text: "${location.name}"`);
                                
                                // Alternative approach - iterare all location items and try to find the correct one
                                let found = false;
                                for (let i = 0; i < count; i++) {
                                    const itemText = await allLocationItems.nth(i).locator('label').textContent();
                                    let locationNameSplitted = location.name.split('(').map(item => item.replace(')', '').trim());

                                    // Check substrings
                                    let isSubstring = locationNameSplitted.length > 1;

                                    // Check text
                                    if (itemText && itemText.includes(locationNameSplitted[0])) {
                                        if(!isSubstring || itemText.includes(locationNameSplitted[1])) {
                                            console.log(`Found matching location at index ${i}: "${itemText}"`);
                                            await allLocationItems.nth(i).locator('label').click();
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (!found) {
                                    throw new Error(`Could not find location "${location.name}" by text search`);
                                }
                            } else {
                                // Wait for the item to appear, timeout at 10s
                                await locItem.waitFor({ state: 'visible', timeout: 10000 });
                                // Click on the location
                                await locItem.click();
                            }
                            
                            // Wait for the data to load
                            await page.waitForLoadState('networkidle');
                            
                            // Wait for the detail page to appear
                            const detailPage = page.locator('#teleport-target div.flex.items-center.gap-x-4');
                            await detailPage.waitFor({ state: 'visible', timeout: 10000 });
                            
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
                            });
                            
                            // Add data to collection
                            fuelData.push(locationData);
                            
                        } catch (error) {
                            console.error(`Error processing location ${location.name}: ${error}`);
                            // We continue further without throwing out the error
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
                    // fuelData.forEach((location) => {
                    //     // Station name and location name
                    //     const stationName = location.stationName;
                    //     const stationLocationName = location.location;

                    //     // TODO: Location GPS coordinates
                    //     const stationLocationLat = 0;
                    //     const stationLocationLon = 0;

                    //     // Log data
                    //     location.fuels.forEach((fuel) => {
                    //         let data: DBData = {
                    //             StationName: stationName,
                    //             StationLocation: {
                    //                 name: stationLocationName,
                    //                 lat: stationLocationLat,
                    //                 lon: stationLocationLon
                    //             },
                    //             FuelName: fuel.name,
                    //             FuelPrice: fuel.price,
                    //             FuelType: WebCrawler.resolveFuelType('globus', fuel.name),
                    //             FuelQuality: WebCrawler.resolveFuelQuality('globus', fuel.name)
                    //         }

                    //         // Check if data are updated
                    //         let updated = thisObj.getLogger().checkUpdates(data);

                    //         // Log updated data
                    //         if(updated) thisObj.getLogger().log(data, thisObj);
                    //     });
                    // });

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
