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
            // Zvýšíme limity timeoutů ještě více
            navigationTimeoutSecs: 180,
            requestHandlerTimeoutSecs: 300, // Zvýšení na 5 minut
            maxRequestRetries: 3,
            // Přidáme hlavičky pro lepší stabilitu
            preNavigationHooks: [
                async ({ page }) => {
                    // Nastavíme hlavičky jako reálný prohlížeč
                    await page.setExtraHTTPHeaders({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'cs,en-US;q=0.9,en;q=0.8'
                    });
                }
            ],
            requestHandler: async ({ page }) => { // Odstraněn parameter 'request'
                try {
                    // Nejprve stáhneme všechny lokace na jednom místě
                    // Step 1: Load the main page
                    await page.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
    
                    // Step 2: Handle cookie consent if present
                    const cookieConsentBtn = page.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                    try {
                        await cookieConsentBtn.waitFor({ timeout: 10000 });
                        console.log('Accepting cookies...');
                        await cookieConsentBtn.click();
                        await page.waitForLoadState('networkidle');
                    } catch (_) { // Změněno z 'e' na '_' pro indikaci úmyslně ignorované proměnné
                        console.log('No cookie consent dialog found or acceptance failed');
                    }
    
                    // Step 3: Click on "Vybrat pobočku" button
                    const selectLocationBtn = page.locator('div#__nuxt header#header button.btn-lg');
                    await selectLocationBtn.waitFor({ timeout: 30000 });
                    await selectLocationBtn.click({ force: true });
                    await page.waitForLoadState('networkidle');
    
                    // Přidáme dynamické čekání na zobrazení dialogu
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
    
                    // Přidáme ověření, že jsou lokace načteny
                    await page.waitForFunction(() => {
                        const list = document.querySelector('#input_9 > ul');
                        return list && list.children.length > 0;
                    }, { timeout: 30000 }).catch(_ => {
                        console.warn('Timeout waiting for location items to load');
                    });
    
                    const locations = await page.locator('#input_9 > ul > li').evaluateAll((elements: any[]) => {
                        // Existující kód pro extrakci lokací
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
                        }).filter(loc => loc.value); // Filter out any null values
                    });
    
                    console.log(`Found ${locations.length} locations.`);
    
                    // Uložíme lokace do struktury a zavřeme dialog
                    const allLocations = [...locations];
    
                    // Klikneme mimo dialog pro jeho zavření
                    await page.click('div#__nuxt header#header').catch(_ => {
                        console.log('Failed to close location dialog by clicking header');
                    });
    
                    // Data struktura pro všechny lokace
                    const fuelData = [];
    
                    // Iterate through each location separately with new browser instances
                    for (const location of allLocations) {
                        // Vytvoříme nový prohlížeč pro každou lokaci
                        // Toto zajistí čistý stav a oddělení od předchozích lokací
                        console.log(`Processing location: ${location.name} (${location.value})`);
                        
                        try {
                            // Použijeme nový prohlížeč pro každou lokaci
                            const browser = await chromium.launch();
                            const newContext = await browser.newContext();
                            const newPage = await newContext.newPage();
                            
                            try {
                                // Navigujeme na hlavní stránku
                                await newPage.goto(thisObj.getUrl(), { waitUntil: 'networkidle' });
                                
                                // Akceptujeme cookies
                                const cookieBtn = newPage.locator('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
                                try {
                                    await cookieBtn.waitFor({ timeout: 10000 });
                                    console.log('Accepting cookies...');
                                    await cookieBtn.click();
                                    await newPage.waitForLoadState('networkidle');
                                } catch (e) {
                                    console.log('No cookie dialog visible');
                                }
                                
                                // Klikneme na tlačítko pro výběr pobočky
                                console.log('Clicking on "Vybrat pobočku" button...');
                                const locBtn = newPage.locator('div#__nuxt header#header button.btn-lg');
                                await locBtn.waitFor({ timeout: 20000 });
                                
                                // Použijeme force: true pro překonání překrývajících elementů
                                await locBtn.click({ force: true });
                                await newPage.waitForLoadState('networkidle');
                                
                                // Ověříme, že jsme ve výběru pobočky s prodlouženým timeoutem
                                console.log('Verifying location selection dialog is visible...');
                                await newPage.waitForSelector('#input_9', { timeout: 20000 });
                                
                                // Počkáme na načtení seznamu lokací
                                console.log('Waiting for locations list to be fully loaded...');
                                await newPage.waitForFunction(() => {
                                    const list = document.querySelector('#input_9 > ul');
                                    return list && list.children.length > 0;
                                }, { timeout: 15000 });
                                
                                // Najdeme požadovanou lokaci
                                const locItemSelector = `#input_9 > ul > li[data-option-value="${location.value}"] > label`;
                                console.log(`Looking for location item: ${locItemSelector}`);
                                
                                // Klikneme na lokaci - vyzkoušíme všechny tři způsoby postupně
                                let locationSelected = false;
                                
                                // 1. Metoda: JavaScript click
                                try {
                                    console.log('Trying JavaScript click...');
                                    await newPage.evaluate((selector: string) => {
                                        const element = document.querySelector(selector);
                                        if (element instanceof HTMLElement) {
                                            element.click();
                                        }
                                    }, locItemSelector);
                                    
                                    // Počkáme na načtení dat
                                    await newPage.waitForTimeout(2000);
                                    
                                    // Ověříme, že dialog zmizel
                                    const isDialogClosed = await newPage.locator('#input_9').isHidden()
                                        .catch(() => false);
                                    
                                    if (isDialogClosed) {
                                        locationSelected = true;
                                        console.log('Location selected using JavaScript click');
                                    }
                                } catch (e) {
                                    console.log('JavaScript click failed, trying next method');
                                }
                                
                                // 2. Metoda: Force click
                                if (!locationSelected) {
                                    try {
                                        console.log('Trying force click...');
                                        await newPage.locator(locItemSelector).click({ force: true, timeout: 10000 });
                                        
                                        // Počkáme na načtení dat
                                        await newPage.waitForTimeout(2000);
                                        
                                        // Ověříme, že dialog zmizel
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
                                
                                // 3. Metoda: Hledání podle textu
                                if (!locationSelected) {
                                    try {
                                        console.log('Trying text search...');
                                        
                                        const allLocationItems = newPage.locator('#input_9 > ul > li');
                                        const count = await allLocationItems.count();
                                        
                                        for (let i = 0; i < count; i++) {
                                            const itemText = await allLocationItems.nth(i).locator('label').textContent();
                                            const locationNameParts = location.name.split('-')
                                                .map((item: string) => item.trim());
                                            
                                            if (itemText && itemText.includes(locationNameParts[0])) {
                                                console.log(`Found matching location by text: "${itemText}"`);
                                                await allLocationItems.nth(i).locator('label').click({ force: true });
                                                
                                                // Počkáme na načtení dat
                                                await newPage.waitForTimeout(2000);
                                                
                                                // Ověříme, že dialog zmizel
                                                const isDialogClosed = await newPage.locator('#input_9').isHidden()
                                                    .catch(() => false);
                                                
                                                if (isDialogClosed) {
                                                    locationSelected = true;
                                                    console.log('Location selected using text search');
                                                    break;
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
                                
                                // Počkáme na načtení detailu po kliknutí
                                await newPage.waitForLoadState('networkidle');
                                
                                // Počkáme na zobrazení detailu
                                console.log('Waiting for detail page to load...');
                                await newPage.locator('#teleport-target div.flex.items-center.gap-x-4')
                                    .waitFor({ timeout: 15000 });
                                
                                // Extrahujeme název stanice
                                const stationName = await newPage.locator('#teleport-target span.text-sm.lg\\:text-base')
                                    .evaluate((el: HTMLElement | SVGElement) => { 
                                        return el.textContent?.trim() || ''; 
                                    });
                                
                                // Extrahujeme ceny paliv
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
                                
                                // Přidáme data do kolekce
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
                                
                                // Přidáme data do kolekce
                                fuelData.push(locationData);
                                
                            } catch (error) {
                                console.error(`Error processing location ${location.name}: ${error}`);
                                await newPage.screenshot({ path: `error-${location.value}.png` });
                            } finally {
                                // Vždy zavřeme kontext a prohlížeč
                                await newContext.close();
                                await browser.close();
                            }
                        } catch (browserError) {
                            console.error(`Error creating browser for location ${location.name}: ${browserError}`);
                        }
                    }
    
                    // Vypíšeme statistiky
                    console.log(`${thisObj.getName()} crawler finished successfully.`);
                    console.log(`Collected data from ${fuelData.length} locations with a total of ${fuelData
                        .reduce((sum, loc) => sum + loc.fuels.length, 0)} fuel prices`);
                    
                    // Uložíme sesbíraná data
                    await Dataset.pushData({
                        crawler: thisObj.getName(),
                        timestamp: moment().tz("UTC").toDate(),
                        data: fuelData
                    });

                    // Log into database
                    fuelData.forEach(async (data: any) => {
                        // Get station name
                        let stationName = data.stationName;
                        let fuels = data.fuels;

                        // Pause for a moment to avoid rate limiting
                        setTimeout(() => {}, 1000);

                        // Get location GPS coordinates
                        let searchTerm = data.location.split('-').slice(-1)[0].trim();
                        let osmData = await fetch(`https://nominatim.openstreetmap.org/search?q=Globus+${searchTerm}&format=json`)
                            .then(response => response.json());

                        let osmLat: number = NaN, osmLon: number = NaN;       // Declare variables

                        osmData.array().forEach((element: any) => {
                            // Check fuel location
                            if (element.type && element.type === 'fuel') {
                                osmLat = Number.parseFloat(element.lat);
                                osmLon = Number.parseFloat(element.lon);
                            }
                        });

                        // Debug
                        // console.log("DEBUG", searchTerm);
                        // let osmData = await fetch(`https://nominatim.openstreetmap.org/search?q=Globus+${searchTerm}&format=json`)
                        //     .then(response => response.text());
                        // console.log("DEBUG", osmData);
                        // let osmLat: number = NaN, osmLon: number = NaN;       // Declare variables

                        // Check if coordinates were found
                        if (Number.isNaN(osmLat) || Number.isNaN(osmLon)) {
                            console.error(`Failed to find fuel station location coordinates for ${data.location
                                }. Using Null Island coordinates.`);
                            
                            osmLat = 0;
                            osmLon = 0;
                        }

                        // Create location object
                        let location: Location = {
                            name: data.location,
                            lat: osmLat,
                            lon: osmLon
                        };
    
                        // Iterate over the fuels and log them into database
                        fuels.forEach((fuel: FuelData) => {
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
                            let updated = thisObj.getLogger().checkUpdates(logData);
    
                            // Log data into database if updated
                            if (updated) thisObj.getLogger().log(logData);

                            // Pause for a moment to avoid rate limiting
                            setTimeout(() => {}, 1000);
                        });
                    });
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
