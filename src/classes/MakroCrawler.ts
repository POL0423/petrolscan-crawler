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
 * File: src/classes/MakroCrawler.ts
 */

// Imports
//-------------------------------------------------

// Global imports
import { PlaywrightCrawler, Dataset } from 'crawlee';
import moment from 'moment-timezone';
import { chromium } from 'playwright';

// Local imports
import DBLogger from './DBLogger.js';
import WebCrawler from "./WebCrawler.js";
import LocationData from '../types/LocationData.js';
import FuelData from '../types/FuelData.js';
import MakroStoreLocator from '../types/MakroStoreLocator.js';

// Logic
//-------------------------------------------------

class MakroCrawler extends WebCrawler {
    constructor(logger: DBLogger) {
        super("Makro", "https://www.makro.cz", logger);
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
                // Crawling logic
                //-------------------------------------------------------------

                try {
                    // Prepare the location data array
                    const fuelData: LocationData[] = [];

                    // Step 1: Load the main page
                    //-------------------------------------------------------------
                    await page.goto(`${thisObj.getUrl()}/prodejny`, { waitUntil: 'networkidle' });

                    // Step 2: Handle cookies consent
                    //-------------------------------------------------------------
                    const cookiesConsentBtn = page.locator('div.consent-disclaimer button.accept-btn');
                    try {
                        await cookiesConsentBtn.waitFor({ timeout: 10000 });
                        thisObj.printMessage('Accepting cookies...');
                        await cookiesConsentBtn.click();
                        await page.waitForLoadState('networkidle');
                    } catch (_) {
                        thisObj.printMessage('No cookie consent dialog found or acceptance failed');
                    }

                    // Step 3: Extract stores data
                    //-------------------------------------------------------------

                    // Create list of store links
                    let storeLinks: MakroStoreLocator[] = [];

                    // Get all store elements
                    const storeList = await page.locator('#listview > div.store-locator-results > div[data-id]').all();

                    // Log the number of stores found
                    thisObj.printMessage(`Debug: Found ${storeList.length} stores on the page.`, 'DEBUG');

                    // Loop through each store element and store it into the storeLinks array
                    for (const storeElement of storeList) {
                        // Extract detail element
                        const detailElement = storeElement.locator('details.details-store-item').first();
                        try {
                            // Get the store name and address
                            const name = await detailElement.locator('span.sl-store-name').textContent();
                            const address = await detailElement.locator('span.sl-address').textContent();

                            // Get the store GPS coordinates
                            const latitude = parseFloat(await detailElement.getAttribute('data-latitude') ?? '0');
                            const longitude = parseFloat(await detailElement.getAttribute('data-longitude') ?? '0');

                            // Click the details to expand
                            await detailElement.click();
                            await page.waitForLoadState('networkidle');

                            // Get the store link
                            const href = await detailElement.locator('a.store-info-button').getAttribute('href');

                            // If the link is found, store the details
                            if (href) {
                                storeLinks.push({
                                    name: name?.trim() ?? "Unknown",
                                    address: address?.trim() ?? "Unknown",
                                    latitude: latitude,
                                    longitude: longitude,
                                    href: href
                                });
                            } else {
                                thisObj.printMessage('Store link not found, skipping this store.', 'WARN');
                                continue;   // Skip to the next store if the link is not found
                            }
                        } catch (error) {
                            thisObj.printMessage('Error extracting store details, skipping this store.', 'WARN');
                            thisObj.printMessage(`Error details: ${error}`, 'DEBUG');
                            continue;       // Skip to the next store if there's an error
                        }
                    }

                    // Log the number of stores found
                    thisObj.printMessage(`Extracted ${storeLinks.length} store links.`);

                    // Debugging info: Print the store links
                    thisObj.printMessage('Debug: Extracted store links', 'DEBUG');
                    thisObj.printMessage('----------------------------------------', 'DEBUG');
                    for (const store of storeLinks) {
                        thisObj.printMessage(`- ${store.name} (${store.address}) at ${store.href}`, 'DEBUG');
                    }

                    // Step 4: Extract fuel data for each store
                    //-------------------------------------------------------------
                    for (const store of storeLinks) {
                        // Log the store being processed
                        thisObj.printMessage(`Processing store: ${store.name} at ${store.address}`);

                        try {
                            // Use a new browser for each location
                            const browser = await chromium.launch();
                            const newContext = await browser.newContext();
                            const newPage = await newContext.newPage();

                            try {
                                // Navigate to the store's fuel prices page
                                await newPage.goto(`${thisObj.getUrl()}${store.href}`, { waitUntil: 'networkidle' });

                                // Debugging info: Log the URL being processed
                                thisObj.printMessage(`Debug: Navigating to ${thisObj.getUrl()}${store.href}`, 'DEBUG');

                                // Accept cookies if the dialog appears
                                const cookiesConsentBtn = newPage.locator('div.consent-disclaimer button.accept-btn');
                                try {
                                    await cookiesConsentBtn.waitFor({ timeout: 10000 });
                                    thisObj.printMessage('Accepting cookies...');
                                    await cookiesConsentBtn.click();
                                    await newPage.waitForLoadState('networkidle');
                                }
                                catch (_) {
                                    thisObj.printMessage('No cookie consent dialog found or acceptance failed');
                                }

                                // Extract fuel items
                                //--------------------------------------------------------------

                                // Prepare the fuel data array
                                const fuels: FuelData[] = [];

                                // Get all fuel items
                                try {
                                    thisObj.printMessage(`Extracting fuel prices for store: ${store.name}`);
                                    
                                    // Wait for the fuel items to be loaded and load the list
                                    await newPage.locator('div.fuel-prices div.price').waitFor({ timeout: 10000 });
                                    const fuelItems = await newPage.locator('div.fuel-prices div.price').all();

                                    // Debugging info: Log the number of fuel items found
                                    thisObj.printMessage(`Debug: Found ${fuelItems.length} fuel price items for store: ${store.name}`, 'DEBUG');
                                    
                                    for (const fuelItem of fuelItems) {
                                        try {
                                            // Extract fuel type and price
                                            const fuelName = await fuelItem.locator('div.field-name').textContent();
                                            const priceText = await fuelItem.locator('div.field-price').textContent();
                                            const price = parseFloat(priceText?.replace(',', '.') ?? 'NaN');
                                        
                                            // If the fuel name or price is not found, skip this item
                                            if (!fuelName || isNaN(price)) {
                                                thisObj.printMessage(`Fuel name or price not found for item, skipping...`, 'WARN');
                                                continue;
                                            }
                                        
                                            // Add the fuel data to the array
                                            fuels.push({
                                                name: fuelName.trim(),
                                                price: price
                                            });
                                        
                                            // Log the extracted fuel data
                                            thisObj.printMessage(`Extracted fuel: ${fuelName.trim()} at price: ${price}`, 'DEBUG');
                                        } catch (fuelError) {
                                            thisObj.printMessage(`Error extracting fuel data: ${fuelError}`, 'WARN');
                                        }
                                    }
                                
                                    // Log the number of fuels found
                                    thisObj.printMessage(`Found ${fuels.length} fuels for store: ${store.name}`);
                                
                                    // Push the location data to the fuelData array
                                    fuelData.push({
                                        stationName: store.name,
                                        location: store.address,
                                        coordinates: {
                                            latitude: store.latitude,
                                            longitude: store.longitude
                                        },
                                        fuels: fuels
                                    });
                                } catch (fuelError) {
                                    thisObj.printMessage('No fuel prices found or error extracting fuel prices.', 'WARN');
                                    thisObj.printMessage(`Error details: ${fuelError}`, 'DEBUG');

                                    // Take a screenshot of the error page
                                    await newPage.screenshot({
                                        path: `screenshots/error-makro-fuel-${WebCrawler.convertFileName(store.name)}.png`
                                    });
                                }
                            } catch (error) {
                                thisObj.printMessage(`Error processing location ${store.name}: ${error}`, "ERROR");

                                // Take a screenshot of the error page
                                await newPage.screenshot({
                                    path: `screenshots/error-makro-${WebCrawler.convertFileName(store.name)}.png`
                                });
                            } finally {
                                // Always close the browser
                                await newContext.close();
                                await browser.close();
                            }
                        } catch (browserError) {
                            thisObj.printMessage(`Error creating browser for location ${store.name}: ${browserError}`, "ERROR");
                        }
                    }
    
                    // Print statistics
                    thisObj.printMessage(`${thisObj.getName()} crawler finished successfully.`);
                    thisObj.printMessage(`Collected data from ${fuelData.length} locations with a total of ${fuelData
                        .reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);

                    // TODO: Save the fuel data to the dataset
                } catch (error) {
                    thisObj.printMessage(`\x1b[31;1mError in ${thisObj.getName()} crawler: ${error}\x1b[0m`, "ERROR");
                }
                
                // Save the page details
                Dataset.pushData({
                    crawler: thisObj.getName(),
                    timestamp: moment().tz("UTC").toDate(),
                    data: null
                });
            }
        });

        // Run the crawler
        await crawler.run([this.getUrl()]);

        // Log end
        this.printMessage("Crawler finished.");
    }
}

export default MakroCrawler;
