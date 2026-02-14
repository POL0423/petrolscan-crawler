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
import FuelData from '../types/FuelData.js';
import LocationData from '../types/LocationData.js';

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
            // Headers and viewport
            preNavigationHooks: [
                async ({ page }) => {
                    // Set viewport to full HD resolution to avoid mobile layout
                    await page.setViewportSize({ width: 1920, height: 1080 });

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

                    // Step 3: Find "Vybrat hypermarket" button by text
                    thisObj.printMessage('Looking for "Vybrat hypermarket" button...');
                    const selectHypermarketBtn = page.getByRole('button', { name: /vybrat hypermarket/i });
                    try {
                        await selectHypermarketBtn.waitFor({ timeout: 30000 });
                    } catch (btnError) {
                        // Take screenshot on timeout
                        const errorDate = moment().tz("UTC").toDate().toISOString().slice(0, 10);
                        await page.screenshot({
                            path: `screenshots/${errorDate}/error-globus-button-timeout.png`
                        });
                        thisObj.printMessage(`Screenshot saved to screenshots/${errorDate}/error-globus-button-timeout.png`, "ERROR");
                        throw btnError;
                    }
                    await selectHypermarketBtn.click({ force: true });
                    await page.waitForLoadState('networkidle');

                    // Step 4: Get all locations from header
                    thisObj.printMessage(`${this.getName()} crawler is collecting all available locations...`);

                    // Wait for location links to be visible
                    await page.waitForSelector('#header div.max-md\\:hidden a', { timeout: 30000 });

                    // Extract location names from individual links
                    const locations = await page.locator('#header div.max-md\\:hidden a').evaluateAll((elements: any[]) => {
                        return elements.map(el => ({
                            name: el.textContent?.trim() || ''
                        })).filter(loc => loc.name.length > 0);
                    });

                    thisObj.printMessage(`Found ${locations.length} locations.`);

                    // All locations structure declaration
                    const fuelData = [];

                    // Iterate through each location
                    for (const location of locations) {
                        thisObj.printMessage(`Processing location: ${location.name}`);

                        try {
                            // Click on the location link in header (SPA - no navigation)
                            thisObj.printMessage(`Clicking on location: ${location.name}`);
                            const locationLink = page.locator('#header div.max-md\\:hidden').getByRole('link', { name: location.name, exact: true });
                            await locationLink.click();

                            // Wait for content to change (SPA behavior)
                            thisObj.printMessage('Waiting for content to load...');
                            await page.waitForLoadState('networkidle');

                            // Check if rate-limited by Globus anti-bot protection
                            const blocked = page.locator('text=Přístup je dočasně blokován');
                            if (await blocked.isVisible({ timeout: 1000 }).catch(() => false)) {
                                thisObj.printMessage(`Rate limited at ${location.name}, waiting 60s before retry...`, "ERROR");
                                await new Promise(resolve => setTimeout(resolve, 60000));
                                await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                                // Re-click the location after recovery
                                const retryLink = page.locator('#header div.max-md\\:hidden').getByRole('link', { name: location.name, exact: true });
                                await retryLink.click();
                                await page.waitForLoadState('networkidle');
                            }

                            // Wait for the fuel station table to load
                            thisObj.printMessage('Looking for "Čerpací stanice" table...');
                            const fuelTable = page.locator('section:has(h2:has-text("Čerpací stanice")) table.w-full');
                            await fuelTable.waitFor({ timeout: 15000 });

                            // Extract fuel data from the table
                            const fuels: FuelData[] = await fuelTable.locator('tbody > tr').evaluateAll((rows: any[]): {
                                name: string; price: number
                            }[] => rows.map((row: any): {
                                name: string; price: number
                            } => {
                                const nameEl = row.querySelector('th, td:first-child');
                                const priceEl = row.querySelector('td:last-child, td.text-right');

                                return {
                                    name: nameEl ? nameEl.textContent.trim() : 'Unknown',
                                    price: priceEl ? parseFloat(priceEl.textContent
                                        .replace('Kč', '').replace(',', '.').trim()) : NaN
                                };
                            }));

                            // Check if there are any fuel data
                            if (fuels.length === 0) {
                                thisObj.printMessage('No fuel data found, skipping.');
                                continue;
                            }

                            // Create location data for this location
                            const locationData: LocationData = {
                                stationName: `Globus ${location.name}`,
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

                            // Delay between locations to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 3000));

                        } catch (error) {
                            let errorDate = moment().tz("UTC").toDate().toISOString().slice(0, 10);
                            thisObj.printMessage(`Error processing location ${location.name}: ${error}`, "ERROR");

                            // Take a screenshot of the error
                            await page.screenshot({
                                path: `screenshots/${errorDate}/error-globus-${WebCrawler.convertFileName(location.name)}.png`
                            });
                            // SPA: Continue to next location - links in header remain clickable
                            await new Promise(resolve => setTimeout(resolve, 3000));
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
