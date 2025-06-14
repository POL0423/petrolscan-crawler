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
import { chromium } from 'playwright';
import moment from 'moment-timezone';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";
import DBData from '../types/DBData.js';
import FuelData from '../types/FuelData.js';
import LocationData from '../types/LocationData.js';
import Location from '../types/Location.js';

// Logic
//-------------------------------------------------

class GlobusCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Globus", "https://www.globus.cz/", logger);
    }

    public async start(): Promise<void> {
        // Log start
        this.printMessage("Starting the extraction process...");

        // Pass this object
        const thisObj = this;
    
        // Create a new crawler with properly configured timeouts
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
                try {
                    // Clear cookies before starting
                    await page.context().clearCookies();
                    thisObj.printMessage('Cookies cleared before starting the crawler');

                    // Step 1: Load the main page
                    await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
    
                    // Step 2: Handle cookie consent if present
                    const cookieConsentBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    try {
                        await cookieConsentBtn.waitFor({ timeout: 10000 });
                        thisObj.printMessage('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForLoadState('networkidle');
                    } catch (_) {
                        thisObj.printMessage('No cookie consent dialog found or acceptance failed');
                    }
    
                    // Step 3: Click on "Vybrat pobočku" button
                    const selectLocationBtn = page.locator('div#__nuxt header#header button.btn-lg');
                    await selectLocationBtn.waitFor({ timeout: 30000 });
                    await selectLocationBtn.click({ force: true });
                    await page.waitForLoadState('networkidle');
    
                    // Dynamically wait for location dropdown
                    thisObj.printMessage('Waiting for location dropdown to appear...');
                    await page.waitForSelector('#input_9', { timeout: 30000 })
                        .catch(async _ => {
                            thisObj.printMessage('Failed to find location selector, trying alternative approach...');
                            // Zkusíme kliknout znovu na tlačítko
                            await selectLocationBtn.click({ force: true });
                            await page.waitForLoadState('networkidle');
                            await page.waitForSelector('#input_9', { timeout: 30000 });
                        });
    
                    // Step 4: Get all locations
                    thisObj.printMessage(`${this.getName()} crawler is collecting all available locations...`);
    
                    // Check if location items are loaded
                    await page.waitForFunction(() => {
                        const list = document.querySelector('#input_9 > ul');
                        return list && list.children.length > 0;
                    }, { timeout: 30000 }).catch(_ => {
                        thisObj.printMessage('Timeout waiting for location items to load', "WARN");
                    });
    
                    const locations = await page.locator('#input_9 > ul > li').evaluateAll((elements: any[]) => {
                        return elements.map(el => {
                            const input = el.querySelector('input');
                            const label = el.querySelector('label');
                            const label_main = label.querySelector('span.items-baseline > span.text-base');
                            const label_sub = label.querySelector('span.items-baseline > span.text-xs');
                            let label_str = '';
                            if (label) {
                                if (label_main) {
                                    label_str = label_main.textContent.trim();
                                }
                                if (label_sub) {
                                    label_str += ` - ${label_sub.textContent.trim()}`;
                                }
                            }
                        
                            return {
                                value: input ? el.getAttribute('data-option-value') : null,
                                name: label ? label_str : 'Unknown location'
                            };
                        }).filter(loc => loc.value);    // Filter out any null values
                    });
    
                    thisObj.printMessage(`Found ${locations.length} locations.`);
    
                    // Click outside the location dialog to close it
                    await page.click('div#__nuxt header#header').catch(_ => {
                        thisObj.printMessage('Failed to close location dialog by clicking header');
                    });
    
                    // All locations structure declaration
                    const fuelData = [];
    
                    // Iterate through each location separately with new browser instances
                    for (const location of locations) {
                        // Create a new browser for each location
                        // That ensures clean state for each location processing
                        thisObj.printMessage(`Processing location: ${location.name} (${location.value})`);
                        
                        try {
                            // Use a new browser for each location
                            const browser = await chromium.launch();
                            const newContext = await browser.newContext();
                            const newPage = await newContext.newPage();
                            
                            try {
                                // Clear cookies before starting
                                await newPage.context().clearCookies();
                                thisObj.printMessage('Cookies cleared before processing location');
                                
                                // Navigate to the home page
                                await newPage.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                                
                                // Accept cookies if present
                                const cookieBtn = newPage.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                                try {
                                    await cookieBtn.waitFor({ timeout: 10000 });
                                    thisObj.printMessage('Accepting cookies...');
                                    await cookieBtn.click();
                                    await newPage.waitForLoadState('networkidle');
                                } catch (e) {
                                    thisObj.printMessage('No cookie dialog visible');
                                }
                                
                                // Click on "Vybrat pobočku" button
                                thisObj.printMessage('Clicking on "Vybrat pobočku" button...');
                                const locBtn = newPage.locator('div#__nuxt header#header button.btn-lg');
                                await locBtn.waitFor({ timeout: 20000 });
                                
                                // Use force: true to force click
                                await locBtn.click({ force: true });
                                await newPage.waitForLoadState('networkidle');
                                
                                // Verify that location selection dialog is visible, using an extended timeout
                                thisObj.printMessage('Verifying location selection dialog is visible...');
                                await newPage.locator('#input_9').waitFor({ timeout: 20000 });

                                // Wait for locations list to be fully loaded
                                thisObj.printMessage('Waiting for locations list to be fully loaded...');
                                await newPage.waitForFunction(() => {
                                    const list = document.querySelector('#input_9 > ul');
                                    return list && list.children.length > 0;
                                }, { timeout: 15000 });
                                
                                // Find the specified location item
                                const locItemSelector = `#input_9 > ul > li[data-option-value="${location.value}"] > label`;
                                thisObj.printMessage(`Looking for location item: ${locItemSelector}`);
                                
                                // Click on the specified location -> use 3 different methods
                                let locationSelected = false;
                                
                                // Method 1: JavaScript click
                                try {
                                    thisObj.printMessage('Trying JavaScript click...');
                                    await newPage.evaluate((selector: string) => {
                                        const element = document.querySelector(selector);
                                        if (element instanceof HTMLElement) {
                                            element.click();
                                        }
                                    }, locItemSelector);
                                    
                                    // Wait for the data to load
                                    await newPage.waitForFunction(async () => {
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                    }, { timeout: 10000 });
                                    
                                    // Verify the dialog is closed
                                    const isLocationOpen = await newPage.locator('#teleport-target h2').first()
                                        .isVisible()
                                        .catch(() => false);
                                    
                                    // Log the state of the location dialog in debug mode
                                    thisObj.printMessage(`Location dialog is ${isLocationOpen ? 'open' : 'closed'}`, "DEBUG");
                                    
                                    if (isLocationOpen) {
                                        locationSelected = true;
                                        thisObj.printMessage('Location selected using JavaScript click');
                                    }
                                } catch (e) {
                                    thisObj.printMessage('JavaScript click failed, trying next method');
                                }
                                
                                // Method 2: Force click
                                if (!locationSelected) {
                                    try {
                                        thisObj.printMessage('Trying force click...');
                                        await newPage.locator(locItemSelector).click({ force: true, timeout: 10000 });
                                        
                                        // Wait for the data to load
                                        await newPage.waitForFunction(async () => {
                                            await new Promise(resolve => setTimeout(resolve, 1500));
                                        }, { timeout: 10000 });
                                        
                                        // Verify the dialog is closed
                                        const isLocationOpen = await newPage.locator('#teleport-target h2').first()
                                            .isVisible()
                                            .catch(() => false);
                                    
                                        // Log the state of the location dialog in debug mode
                                        thisObj.printMessage(`Location dialog is ${isLocationOpen ? 'open' : 'closed'}`, "DEBUG");
                                        
                                        if (isLocationOpen) {
                                            locationSelected = true;
                                            thisObj.printMessage('Location selected using JavaScript click');
                                        ;}
                                    } catch (e) {
                                        thisObj.printMessage('Force click failed, trying next method');
                                    }
                                }
                                
                                // Method 3: Search using text
                                if (!locationSelected) {
                                    try {
                                        thisObj.printMessage('Trying text search...');
                                        
                                        const allLocationItems = newPage.locator('#input_9 > ul > li');
                                        const count = await allLocationItems.count();
                                        
                                        for (let i = 0; i < count; i++) {
                                            const itemText = await allLocationItems.nth(i).locator('label').textContent();
                                            const locationNameParts = location.name.split('-')
                                                .map((item: string) => item.trim());

                                            // Check if the location name contains multiple parts
                                            let multipart = (locationNameParts.length > 1);
                                            
                                            // Check if the item text contains all location parts
                                            if (itemText && itemText.includes(locationNameParts[0])) {
                                                if(!multipart || itemText.includes(locationNameParts[1])) {
                                                    thisObj.printMessage(`Found matching location by text: "${itemText}"`);
                                                    await allLocationItems.nth(i).locator('label').click({ force: true });

                                                    // Wait for the data to load
                                                    await newPage.waitForFunction(async () => {
                                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                                    }, { timeout: 10000 });

                                                    // Verify the dialog is closed
                                                    const isLocationOpen = await newPage.locator('#teleport-target h2').first()
                                                        .isVisible()
                                                        .catch(() => false);
                                    
                                                    // Log the state of the location dialog in debug mode
                                                    thisObj.printMessage(`Location dialog is ${isLocationOpen
                                                        ? 'open' : 'closed'}`, "DEBUG");
                                                    
                                                    if (isLocationOpen) {
                                                        locationSelected = true;
                                                        thisObj.printMessage('Location selected using JavaScript click');
                                                    }
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        thisObj.printMessage('Text search failed');
                                    }
                                }
                                
                                if (!locationSelected) {
                                    throw new Error('All methods to select location failed');
                                }
                                
                                // Wait for the network to settle
                                await newPage.waitForLoadState('networkidle');
                                
                                // Wait for the detail page to load
                                thisObj.printMessage('Waiting for detail page to load...');
                                await newPage.locator('#teleport-target div.flex.items-center.gap-x-4')
                                    .waitFor({ timeout: 15000 });
                                
                                // Extract the station name
                                const stationName = await newPage.locator('#teleport-target span.text-sm.lg\\:text-base')
                                    .evaluate((el: HTMLElement | SVGElement) => { 
                                        return el.textContent?.trim() || ''; 
                                    });
                                
                                // Extract the fuel names and prices
                                const fuels: FuelData[] = await newPage
                                    .locator('#teleport-target div.lg\\:pl-6 section:nth-child(1) > table.w-full > tbody > tr')
                                    .evaluateAll((rows: any[]): {name: string; price: number}[] => rows.map((row: any): {
                                        name: string; price: number
                                    } => {
                                        const nameEl = row.querySelector('th.text-left');
                                        const priceEl = row.querySelector('td.text-right');
                                    
                                        return {
                                            name: nameEl ? nameEl.textContent.trim() : 'Unknown',
                                            price: priceEl ? parseFloat(priceEl.textContent
                                                .replace('Kč', '').replace(',', '.').trim()) : NaN
                                        };
                                    })
                                );

                                // Check if there are any fuel data
                                if (fuels.length === 0) {
                                    thisObj.printMessage('No fuel data found, skipping.');
                                    continue;
                                }
                                
                                // Create location fata for this location
                                const locationData: LocationData = {
                                    stationName: `Globus ${stationName}`,
                                    location: location.name,
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
                                thisObj.printMessage(`Error processing location ${location.name}: ${error}`, "ERROR");
                                await newPage.screenshot({
                                    path: `screenshots/error-globus-${WebCrawler.convertFileName(location.value)}.png`
                                });
                            } finally {
                                // Always close the browser
                                await newContext.close();
                                await browser.close();
                            }
                        } catch (browserError) {
                            thisObj.printMessage(`Error creating browser for location ${location.name}: ${browserError}`, "ERROR");
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
                    await thisObj.writeToDB('globus', fuelData);
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
}

export default GlobusCrawler;
