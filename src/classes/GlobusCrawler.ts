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
            requestHandlerTimeoutSecs: 600,     // request handler timeout of ..... 10 minutes
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
                    // Step 1: Load the main page
                    await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
    
                    // Step 2: Handle cookie consent if present
                    const cookieConsentBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    try {
                        await cookieConsentBtn.waitFor({ timeout: 10000 });
                        console.log('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForLoadState('networkidle');
                    } catch (_) {
                        console.log('No cookie consent dialog found or acceptance failed');
                    }
    
                    // Step 3: Click on "Vybrat pobočku" button
                    const selectLocationBtn = page.locator('div#__nuxt header#header button.btn-lg');
                    await selectLocationBtn.waitFor({ timeout: 30000 });
                    await selectLocationBtn.click({ force: true });
                    await page.waitForLoadState('networkidle');
    
                    // Dynamically wait for location dropdown
                    console.log('Waiting for location dropdown to appear...');
                    await page.waitForSelector('#input_9', { timeout: 30000 })
                        .catch(async _ => {
                            console.log('Failed to find location selector, trying alternative approach...');
                            // Zkusíme kliknout znovu na tlačítko
                            await selectLocationBtn.click({ force: true });
                            await page.waitForLoadState('networkidle');
                            await page.waitForSelector('#input_9', { timeout: 30000 });
                        });
    
                    // Step 4: Get all locations
                    console.log(`${this.getName()} crawler is collecting all available locations...`);
    
                    // Check if location items are loaded
                    await page.waitForFunction(() => {
                        const list = document.querySelector('#input_9 > ul');
                        return list && list.children.length > 0;
                    }, { timeout: 30000 }).catch(_ => {
                        console.warn('Timeout waiting for location items to load');
                    });
    
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
                                    label_str += ` - ${label_sub.textContent.trim()}`;
                                }
                            }
                        
                            return {
                                value: input ? el.getAttribute('data-option-value') : null,
                                name: label ? label_str : 'Unknown location'
                            };
                        }).filter(loc => loc.value);    // Filter out any null values
                    });
    
                    console.log(`Found ${locations.length} locations.`);
    
                    // Save locations to a structure
                    const allLocations = [...locations];
    
                    // Click outside the location dialog to close it
                    await page.click('div#__nuxt header#header').catch(_ => {
                        console.log('Failed to close location dialog by clicking header');
                    });
    
                    // All locations structure declaration
                    const fuelData = [];
    
                    // Iterate through each location separately with new browser instances
                    for (const location of allLocations) {
                        // Create a new browser for each location
                        // That ensures clean state for each location processing
                        console.log(`Processing location: ${location.name} (${location.value})`);
                        
                        try {
                            // Use a new browser for each location
                            const browser = await chromium.launch();
                            const newContext = await browser.newContext();
                            const newPage = await newContext.newPage();
                            
                            try {
                                // Navigate to the home page
                                await newPage.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                                
                                // Accept cookies if present
                                const cookieBtn = newPage.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                                try {
                                    await cookieBtn.waitFor({ timeout: 10000 });
                                    console.log('Accepting cookies...');
                                    await cookieBtn.click();
                                    await newPage.waitForLoadState('networkidle');
                                } catch (e) {
                                    console.log('No cookie dialog visible');
                                }
                                
                                // Click on "Vybrat pobočku" button
                                console.log('Clicking on "Vybrat pobočku" button...');
                                const locBtn = newPage.locator('div#__nuxt header#header button.btn-lg');
                                await locBtn.waitFor({ timeout: 20000 });
                                
                                // Use force: true to force click
                                await locBtn.click({ force: true });
                                await newPage.waitForLoadState('networkidle');
                                
                                // Verify that location selection dialog is visible, using an extended timeout
                                console.log('Verifying location selection dialog is visible...');
                                await newPage.waitForSelector('#input_9', { timeout: 20000 });
                                
                                // Wait for locations list to be fully loaded
                                console.log('Waiting for locations list to be fully loaded...');
                                await newPage.waitForFunction(() => {
                                    const list = document.querySelector('#input_9 > ul');
                                    return list && list.children.length > 0;
                                }, { timeout: 15000 });
                                
                                // Find the specified location item
                                const locItemSelector = `#input_9 > ul > li[data-option-value="${location.value}"] > label`;
                                console.log(`Looking for location item: ${locItemSelector}`);
                                
                                // Click on the specified location -> use 3 different methods
                                let locationSelected = false;
                                
                                // Method 1: JavaScript click
                                try {
                                    console.log('Trying JavaScript click...');
                                    await newPage.evaluate((selector: string) => {
                                        const element = document.querySelector(selector);
                                        if (element instanceof HTMLElement) {
                                            element.click();
                                        }
                                    }, locItemSelector);
                                    
                                    // Wait for the data to load
                                    await newPage.waitForTimeout(2000);
                                    
                                    // Verify the dialog is closed
                                    const isDialogClosed = await newPage.locator('#input_9').isHidden()
                                        .catch(() => false);
                                    
                                    if (isDialogClosed) {
                                        locationSelected = true;
                                        console.log('Location selected using JavaScript click');
                                    }
                                } catch (e) {
                                    console.log('JavaScript click failed, trying next method');
                                }
                                
                                // Method 2: Force click
                                if (!locationSelected) {
                                    try {
                                        console.log('Trying force click...');
                                        await newPage.locator(locItemSelector).click({ force: true, timeout: 10000 });
                                        
                                        // Wait for the data to load
                                        await newPage.waitForTimeout(2000);
                                        
                                        // Verify the dialog is closed
                                        const isDialogClosed = await newPage.locator('#input_9').isHidden()
                                            .catch(() => false);
                                        
                                        if (isDialogClosed) {
                                            locationSelected = true;
                                            console.log('Location selected using force click');
                                        }
                                    } catch (e) {
                                        console.log('Force click failed, trying next method');
                                    }
                                }
                                
                                // Method 3: Search using text
                                if (!locationSelected) {
                                    try {
                                        console.log('Trying text search...');
                                        
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
                                                if(!multipart || itemText.includes(locationNameParts[1]))
                                                {
                                                    console.log(`Found matching location by text: "${itemText}"`);
                                                    await allLocationItems.nth(i).locator('label').click({ force: true });

                                                    // Wait for the data to load
                                                    await newPage.waitForTimeout(2000);

                                                    // Verify the dialog is closed
                                                    const isDialogClosed = await newPage.locator('#input_9').isHidden()
                                                        .catch(() => false);

                                                    if (isDialogClosed) {
                                                        locationSelected = true;
                                                        console.log('Location selected using text search');
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.log('Text search failed');
                                    }
                                }
                                
                                if (!locationSelected) {
                                    throw new Error('All methods to select location failed');
                                }
                                
                                // Wait for the network to settle
                                await newPage.waitForLoadState('networkidle');
                                
                                // Wait for the detail page to load
                                console.log('Waiting for detail page to load...');
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
                                    console.log('No fuel data found, skipping.');
                                    continue;
                                }
                                
                                // Create location fata for this location
                                const locationData: LocationData = {
                                    stationName: `Globus ${stationName}`,
                                    location: location.name,
                                    fuels: fuels
                                };
                                
                                // Log data for debugging
                                console.debug(`Station: ${locationData.stationName}`);
                                console.debug(`Location: ${locationData.location}`);
                                console.debug('Fuels:');
                                fuels.forEach((fuel: { name: string; price: number; }) => {
                                    console.debug(`  - ${fuel.name}: ${fuel.price.toFixed(2)} CZK`);
                                });
                                
                                // Add location data to collection
                                fuelData.push(locationData);
                                
                            } catch (error) {
                                console.error(`Error processing location ${location.name}: ${error}`);
                                await newPage.screenshot({ path: `error-${location.value}.png` });
                            } finally {
                                // Always close the browser
                                await newContext.close();
                                await browser.close();
                            }
                        } catch (browserError) {
                            console.error(`Error creating browser for location ${location.name}: ${browserError}`);
                        }
                    }
    
                    // Print statistics
                    console.log(`${thisObj.getName()} crawler finished successfully.`);
                    console.log(`Collected data from ${fuelData.length} locations with a total of ${fuelData
                        .reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);
                    
                    // Save collected data to local dataset
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });

                    // Log into database
                    for (const data of fuelData) {
                        // Get station name and fuels
                        let stationName = data.stationName;
                        let fuels = data.fuels;

                        // Get location GPS coordinates
                        // Data source: https://openstreetmap.org/
                        // Data license: Open Database License (ODbL) https://opendatacommons.org/licenses/odbl/
                        let searchTerm = data.location.split('-').slice(-1)[0].trim();
                        let osmData = await fetch(`https://nominatim.openstreetmap.org/search?q=Globus+${searchTerm}&format=json`)
                            .then(response => response.json());

                        // Declare variables, preload with NaN
                        let osmLat = NaN, osmLon = NaN;

                        // Prepare failure flag
                        let fail = false;

                        // Check if OSM data is an array
                        let isArray = Array.isArray(osmData);
                        if(!isArray) {
                            // Print error
                            console.error(`Returned data for ${data.location} is not an array. Using Null Island coordinates.`);
                            
                            // Set coordinates to (0, 0)
                            osmLat = 0;
                            osmLon = 0;

                            // Set failure flag
                            fail = true;
                        }
                        
                        // Check for petrol station coordinates
                        if(!fail) osmData.forEach((element: any) => {
                            // Check fuel location
                            if (element.type && element.type === 'fuel') {
                                osmLat = Number.parseFloat(element.lat);
                                osmLon = Number.parseFloat(element.lon);
                            }
                        });

                        // Check if coordinates were found
                        if (Number.isNaN(osmLat) || Number.isNaN(osmLon)) {
                            // Print error
                            console.error(`Failed to find fuel station location coordinates for ${data.location
                                }. Trying to use store coordinates.`);
                            
                            // Prepare found flag
                            let found = false;

                            // Iterate over OSM data again -> return first finding
                            osmData.forEach((element: any) => {
                                if (!found && element.type && element.type === 'supermarket') {
                                    // Get coordinates
                                    osmLat = Number.parseFloat(element.lat);
                                    osmLon = Number.parseFloat(element.lon);

                                    // Set found flag
                                    found = true;
                                }
                            });

                            if (!found) {
                                // Print error
                                console.error(`Failed to find store location coordinates for ${data.location
                                    }. Using Null Island coordinates.`);
                                
                                // Set coordinates to (0, 0)
                                osmLat = 0;
                                osmLon = 0;
                            }
                        }

                        // Create location object
                        let location: Location = {
                            name: data.location,
                            lat: osmLat,
                            lon: osmLon
                        };
    
                        // Iterate over the fuels and log them into database
                        for (const fuel of fuels) {
                            // Get fuel name and price
                            let fuelName = fuel.name;
                            let fuelPrice = fuel.price;

                            // Get fuel type and quality
                            let fuelType = WebCrawler.resolveFuelType('globus', fuelName);
                            let fuelQuality = WebCrawler.resolveFuelQuality('globus', fuelName);

                            // Debug
                            console.debug(`[${moment().tz(moment.tz.guess())
                                .format("YYYY-MM-DD HH:mm:ss zz")}] [${thisObj.getName()} crawler] Debugging info`);
                            console.debug(`    Station name: ........ ${stationName}`);
                            console.debug(`    Location: ............ ${location.name} (${location.lat}, ${location.lon})`);
                            console.debug(`    Fuel name: ........... ${fuelName}`);
                            console.debug(`    Fuel type: ........... ${fuelType}`);
                            console.debug(`    Fuel quality: ........ ${fuelQuality}`);
                            console.debug(`    Fuel price: .......... ${fuelPrice.toFixed(2)} CZK`);

                            // Create database data object
                            let logData: DBData = {
                                StationName: thisObj.getName(),
                                StationLocation: location,
                                FuelName: fuelName,
                                FuelType: fuelType,
                                FuelQuality: fuelQuality,
                                FuelPrice: fuelPrice
                            };

                            // Check if data are updated
                            let updated = await thisObj.getLogger().checkUpdates(logData);
    
                            // Log data into database if updated
                            if (updated) thisObj.getLogger().log(logData);

                            // Pause for a moment to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                } catch (error) {
                    console.error(`[${moment().tz(moment.tz.guess()).format("YYYY-MM-DD HH:mm:ss zz")
                        }] [Process] \x1b[31;1mError in ${thisObj.getName()} crawler: ${error}\x1b[0m`);
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
