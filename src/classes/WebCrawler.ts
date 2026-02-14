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
 * File: src/classes/WebCrawler.ts
 */

// Imports
//-------------------------------------------------
import DBLogger from './DBLogger.js';
import FuelType from '../types/FuelType.js';
import FuelQuality from '../types/FuelQuality.js';
import moment from 'moment-timezone';
import MessageType from '../types/MessageType.js';
import LocationData from '../types/LocationData.js';
import Location from '../types/Location.js';
import DBData from '../types/DBData.js';
import StationStr from '../types/StationStr.js';
import { OSMSearchResult, OSMTypePriority, SearchTermConfig } from '../types/OSMTypes.js';

abstract class WebCrawler {
    private name: string;
    private url: string;
    private logger: DBLogger;
    private interrupt: boolean;

    constructor(name: string, url: string, logger: DBLogger) {
        this.name = name;
        this.url = url;
        this.logger = logger;
        this.interrupt = false;
    }

    public getName(): string {
        return this.name;
    }

    public getUrl(): string {
        return this.url;
    }

    public getLogger(): DBLogger {
        return this.logger;
    }

    public printMessage(message: string, type: MessageType = "LOG"): void {
        let localTZ = moment.tz.guess(true);

        if (type === "LOG")
            console.log(`[${moment().tz(localTZ)
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "DEBUG")
            console.debug(`[${moment().tz(localTZ)
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "ERROR")
            console.error(`[${moment().tz(localTZ)
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "WARN")
            console.warn(`[${moment().tz(localTZ)
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else
            console.warn(`[${moment().tz(localTZ)
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] Wrong message type: '${type}' for message: '${message}'`);
    }

    // OSM type priorities - lower number = higher priority
    private static readonly OSM_TYPE_PRIORITIES: OSMTypePriority[] = [
        { class: 'amenity', type: 'fuel', priority: 1 },      // Fuel station - highest priority
        { class: 'amenity', type: 'car_wash', priority: 2 },  // Car wash - fallback 1
        { class: 'shop', type: 'yes', priority: 3 },          // Shop - fallback 2
        { class: 'shop', type: 'kiosk', priority: 4 }         // Kiosk - fallback 3
    ];

    /**
     * Gets priority for a given class/type combination
     */
    private static getTypePriority(osmClass: string, osmType: string): number | null {
        const found = WebCrawler.OSM_TYPE_PRIORITIES.find(
            p => p.class === osmClass && p.type === osmType
        );
        return found ? found.priority : null;
    }

    /**
     * Selects the best location from OSM results based on type priority
     */
    private static selectBestOSMLocation(
        osmResults: OSMSearchResult[],
        nameFilter?: string,
        displayNameFilter?: string
    ): OSMSearchResult | null {
        let filteredResults = osmResults;

        // Apply display_name filter first if provided (e.g., for Cheb -> Odrava)
        if (displayNameFilter) {
            const normalizedFilter = displayNameFilter.toLowerCase();
            filteredResults = osmResults.filter(result =>
                result.display_name?.toLowerCase().includes(normalizedFilter)
            );

            // If display_name filter found nothing, use all results
            if (filteredResults.length === 0) {
                filteredResults = osmResults;
            }
        }

        // Apply name filter if provided (for disambiguation like Dolní Dvořiště I/II)
        if (nameFilter) {
            const normalizedFilter = nameFilter.toLowerCase();
            const nameFiltered = filteredResults.filter(result =>
                result.name?.toLowerCase().includes(normalizedFilter)
            );

            // If name filter found something, use it; otherwise keep previous results
            if (nameFiltered.length > 0) {
                filteredResults = nameFiltered;
            }
        }

        // Find result with highest priority (lowest number)
        let bestResult: OSMSearchResult | null = null;
        let bestPriority = Infinity;

        for (const result of filteredResults) {
            const priority = WebCrawler.getTypePriority(result.class, result.type);

            if (priority !== null && priority < bestPriority) {
                bestPriority = priority;
                bestResult = result;
            }
        }

        return bestResult;
    }

    /**
     * Generates OSM search term for Globus stations
     * Pattern: "Globus {shortened locality}"
     */
    private static generateGlobusSearchTerm(location: string): SearchTermConfig {
        // Pattern for "X u Y" - extract X
        const uPattern = /^(.+?)\s+u\s+/i;
        const match = location.match(uPattern);

        let searchLocation: string;
        if (match) {
            // "Chotíkov u Plzně" -> "Chotíkov"
            searchLocation = match[1].trim();
        } else {
            // "Praha-Čakovice" or "Brno" -> use as is
            searchLocation = location;
        }

        return {
            searchTerm: `Globus+${searchLocation.replace(/ +/g, '+')}`
        };
    }

    /**
     * Generates OSM search term for ONO stations
     * Pattern: "ONO {shortened locality}"
     */
    private static generateONOSearchTerm(location: string): SearchTermConfig {
        let searchLocation = location;
        let nameFilter: string | undefined;
        let displayNameFilter: string | undefined;

        // Pattern for "X - D# exit ###" - remove highway designations
        const exitPattern = /\s*-\s*D\d+\s+exit\s+\d+/i;
        searchLocation = searchLocation.replace(exitPattern, '');

        // Pattern for "X - ONO I" or "X - ONO II" - special case Dolní Dvořiště
        const onoNumberPattern = /^(.+?)\s*-\s*ONO\s+(I{1,2}|[12])$/i;
        const onoMatch = location.match(onoNumberPattern);
        if (onoMatch) {
            searchLocation = onoMatch[1].trim();
            // Map Roman numerals to Arabic for name filter
            const numMap: Record<string, string> = { 'I': '1', 'II': '2', '1': '1', '2': '2' };
            const num = numMap[onoMatch[2].toUpperCase()] || onoMatch[2];
            nameFilter = `Tank Ono ${searchLocation} ${num}`;
        }

        // Pattern for "X u Y" - shorten (only if not already matched ONO pattern)
        if (!onoMatch) {
            const uPattern = /^(.+?)\s+u\s+/i;
            const uMatch = searchLocation.match(uPattern);
            if (uMatch) {
                searchLocation = uMatch[1].trim();
            }
        }

        // Special case: Cheb is actually Odrava (not Vojtanov which also appears in results)
        if (searchLocation.toLowerCase() === 'cheb') {
            displayNameFilter = 'Odrava';
        }

        return {
            searchTerm: `ONO+${searchLocation.replace(/ +/g, '+')}`,
            nameFilter: nameFilter,
            displayNameFilter: displayNameFilter
        };
    }

    /**
     * Generates OSM search term based on station type
     */
    private static generateSearchTerm(station: StationStr, location: string): SearchTermConfig {
        switch (station) {
            case 'globus':
                return WebCrawler.generateGlobusSearchTerm(location);
            case 'ono':
                return WebCrawler.generateONOSearchTerm(location);
            default:
                // Default behavior for other stations
                return {
                    searchTerm: location.replace(/ +/g, '+')
                };
        }
    }

    public async writeToDB(station: StationStr, fuelData: LocationData[]): Promise<void> {
        for (const data of fuelData) {
            // Get station name and fuels
            let stationName = data.stationName;
            let fuels = data.fuels;

            // Get location GPS coordinates
            // Data source: https://openstreetmap.org/
            // Data license: Open Database License (ODbL) https://opendatacommons.org/licenses/odbl/

            // Declare coordinates with NaN defaults
            let osmLat = NaN, osmLon = NaN;

            // Try to use cached coordinates from DB first
            const cached = await this.getLogger().getCachedCoordinates(this.getName(), data.location);
            if (cached) {
                osmLat = cached.lat;
                osmLon = cached.lon;
                this.printMessage(`Using cached coordinates for ${data.location}: ${osmLat}, ${osmLon}`, "DEBUG");
            } else {
                // Generate search term based on station type
                const searchConfig = WebCrawler.generateSearchTerm(station, data.location);

                // Fetch OSM data with retry logic
                let osmData: OSMSearchResult[] = [];
                const maxRetries = 3;

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        // Encode each part of the search term separately (preserving + as separator)
                        const encodedSearchTerm = searchConfig.searchTerm
                            .split('+')
                            .map(part => encodeURIComponent(part))
                            .join('+');

                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?q=${encodedSearchTerm}&format=json`,
                            { headers: { 'User-Agent': 'PetrolScan/1.0 (bachelor-thesis; petrol-price-comparison)' } }
                        );

                        // Check HTTP status before parsing JSON
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        osmData = await response.json();
                        break; // Success, exit retry loop
                    } catch (error) {
                        this.printMessage(
                            `Failed to fetch OSM data for ${data.location} (attempt ${attempt}/${maxRetries}): ${error}`,
                            "ERROR"
                        );
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                        }
                    }
                }

                // Respect Nominatim rate limit (max 1 request per second)
                await new Promise(resolve => setTimeout(resolve, 1100));

                // Check if OSM data is valid
                if (!Array.isArray(osmData)) {
                    this.printMessage(
                        `Returned data for ${data.location} is not an array. Using Null Island coordinates.`,
                        "ERROR"
                    );
                    osmLat = 0;
                    osmLon = 0;
                } else if (osmData.length === 0) {
                    this.printMessage(
                        `No OSM results for ${data.location} (search: ${searchConfig.searchTerm}). Using Null Island coordinates.`,
                        "ERROR"
                    );
                    osmLat = 0;
                    osmLon = 0;
                } else {
                    // Select best location based on priority (fuel > car_wash > shop)
                    const bestLocation = WebCrawler.selectBestOSMLocation(
                        osmData,
                        searchConfig.nameFilter,
                        searchConfig.displayNameFilter
                    );

                    if (bestLocation) {
                        osmLat = Number.parseFloat(bestLocation.lat);
                        osmLon = Number.parseFloat(bestLocation.lon);

                        this.printMessage(
                            `Found ${bestLocation.class}/${bestLocation.type} for ${data.location}`,
                            "DEBUG"
                        );
                    } else {
                        this.printMessage(
                            `No matching location type found for ${data.location}. Using Null Island coordinates.`,
                            "ERROR"
                        );
                        osmLat = 0;
                        osmLon = 0;
                    }
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
                let fuelType = WebCrawler.resolveFuelType(station, fuelName);
                let fuelQuality = WebCrawler.resolveFuelQuality(station, fuelName);

                // Debug
                this.printMessage(`Collected data`, "DEBUG");
                this.printMessage(`    Station name: .... ${stationName}`, "DEBUG");
                this.printMessage(`    Location: ........ ${location.name}`, "DEBUG");
                this.printMessage(`    GPS coords: ...... ${location.lat}, ${location.lon}`, "DEBUG");
                this.printMessage(`    Fuel name: ....... ${fuelName}`, "DEBUG");
                this.printMessage(`    Fuel type: ....... ${fuelType ?? "N/A"}`, "DEBUG");
                this.printMessage(`    Fuel quality: .... ${fuelQuality ?? "N/A"}`, "DEBUG");
                this.printMessage(`    Fuel price: ...... ${fuelPrice.toFixed(2)} CZK`, "DEBUG");

                // Create database data object
                let logData: DBData = {
                    StationName: this.getName(),
                    StationLocation: location,
                    FuelName: fuelName,
                    FuelType: fuelType,
                    FuelQuality: fuelQuality,
                    FuelPrice: fuelPrice
                };

                // Check if data are updated
                let updated = await this.getLogger().checkUpdates(logData);

                // Log data into database if updated
                if (updated) this.getLogger().log(logData);

                // Pause for a moment to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        return Promise.resolve();
    }

    public abstract start(): Promise<void>;

    public static resolveFuelQuality(station: StationStr, fuelName: string): FuelQuality {
        let pslower = station.toLowerCase();            // Petrol station name (converted to lowercase)
        let ftlower = fuelName.toLowerCase();           // Fuel name (converted to lowercase)

        // Quality sorting for each petrol station
        if (
            // Regular
            pslower === "globus" && !ftlower.includes("plus")                       // Globus
            && (ftlower.includes("natural") || ftlower.includes("diesel"))      // (only include motion fuels)
            ||
            pslower === "orlen" && ftlower.includes("effecta")                      // Orlen
            ||
            pslower === "shell" && ftlower.includes("fuelsave")                     // Shell
            ||
            pslower === "ono" && ((ftlower.includes("natural 95") || ftlower.includes("diesel")) && !ftlower.includes("+"))
            ||                                                                      // ONO
            pslower === "mol" && !ftlower.includes("plus")                          // MOL (*)
            ||
            pslower === "omv" && !ftlower.includes("maxxmotion") && (ftlower.includes("natural") || ftlower.includes("diesel"))
            ||                                                                      // OMV
            pslower === "makro" && !ftlower.includes("drive") && (ftlower.includes("natural") || ftlower.includes("diesel"))
            // Makro
            //----------------------------------------- No data
            // EuroOil (**) + Prim (**)
        ) return "STANDARD";

        if (
            // Mid-grade
            pslower === "ono" && ftlower.includes("natural 98") && !ftlower.includes("+")
            // ONO
            //----------------------------------------- No data
            // Globus + Orlen + Shell + EuroOil (**) + MOL (*) + OMV + Makro + Prim (**)
        ) return "MIDGRADE";

        if (
            // Premium
            pslower === "globus" && ftlower.includes("plus")                        // Globus
            && (ftlower.includes("natural") || ftlower.includes("diesel"))      // (only include motion fuels)
            ||
            pslower === "orlen" && ftlower.includes("verva")                        // Orlen
            ||
            pslower === "shell" && ftlower.includes("v-power")                      // Shell
            && !ftlower.includes("racing")      // Racing is its own category!
            ||
            pslower === "ono" && ((ftlower.includes("natural 95") || ftlower.includes("diesel")) && ftlower.includes("+"))
            ||                                                                      // ONO
            pslower === "mol" && ftlower.includes("plus")                           // MOL (*)
            ||
            pslower === "omv" && (ftlower.includes("maxxmotion") && !ftlower.includes("100"))
            ||                                                                      // OMV
            pslower === "makro" && ftlower.includes("drive")                        // Makro

            //----------------------------------------- No data
            // EuroOil (**) + Prim (**)
        ) return "PREMIUM";

        if (
            // Racing
            pslower === "shell" && ftlower.includes("racing")                       // Shell
            ||
            pslower === "omv" && ftlower.includes("maxxmotion 100")                 // OMV

            //----------------------------------------- No data
            // Globus + Orlen + EuroOil (**) + ONO + Prim (**) + Makro
        ) return "RACING";

        // Nothing else
        return undefined;

        // Notes
        //---------------------------------------------------------------------------------------------------
        // (*)      MOL's website map page apparently doesn't work with privacy browser extensions.
        //
        // (**)     No data for "Prim" petrol stations are provided, since their website doesn't provide
        //          any price data. The same applies to "EuroOil" and "MOL" as well.
    }

    public static resolveFuelType(station: StationStr, fuelName: string): FuelType {
        let pslower = station.toLowerCase();            // Petrol station name (converted to lowercase)
        let ftlower = fuelName.toLowerCase();           // Fuel name (converted to lowercase)

        // Fuel type sorting for each petrol station
        if (
            // Petrols
            (pslower === "globus" || pslower === "omv")     // Globus + OMV
            && (ftlower.includes("natural") || ftlower.includes("maxxmotion 95")) ||

            pslower === "orlen"                             // Orlen
            && (ftlower.includes("effecta") || ftlower.includes("verva")) && !ftlower.includes("diesel") ||

            pslower === "shell"                             // Shell
            && !ftlower.startsWith("nafta") ||

            pslower === "eurooil"                           // EuroOil
            && (ftlower.includes("ba 95") || ftlower.includes("ba 98") || ftlower.includes("ba 100")) ||

            pslower === "ono"                               // ONO
            && (ftlower.includes("natural")) ||

            pslower === "mol"                               // MOL (*)
            && ftlower.includes("benzin") ||

            pslower === "makro"                             // Makro
            && (ftlower.includes("natural") || ftlower.includes("drive") && !ftlower.includes("diesel"))

            //----------------------------------------- No data
            // Prim (**)
        ) return "PETROL";

        if (
            // Diesels
            (pslower === "globus" || pslower === "orlen" || pslower === "eurooil" || pslower === "mol" ||
                pslower === "omv" || pslower === "makro")
            && ftlower.includes("diesel") ||            // Globus + Orlen + EuroOil + MOL (*) + OMV + Makro

            pslower === "shell"                             // Shell
            && ftlower.startsWith("nafta") ||

            pslower === "ono"                               // ONO
            && ftlower.includes("diesel")

            //----------------------------------------- No data
            // Prim (**)
        ) return "DIESEL";

        if (
            // CNG
            ftlower.includes("cng")                 // Orlen + EuroOil

            //----------------------------------------- No data
            // Globus + Shell + ONO + MOL + OMV + Prim (**)
        ) return "CNG";

        if (
            // LPG
            ftlower.includes("lpg")                 // Orlen + EuroOil + OMV + ONO

            //----------------------------------------- No data
            // Globus + Shell + MOL + Prim (**)
        ) return "LPG";

        if (
            // HVO
            ftlower.includes("hvo")                 // EuroOil

            //----------------------------------------- No data
            // Globus + Orlen + Shell + ONO + MOL + OMV + Prim (**)
        ) return "HVO";

        if (
            // AdBlue
            ftlower.includes("adblue")              // Globus + EuroOil + MOL (*) + ONO

            //----------------------------------------- No data
            // Orlen + Shell + OMV + Prim (**)
        ) return "ADBLUE";

        if (
            // Windscreen Cleaner
            ftlower.includes("kapalina do ostřikovačů")         // Globus

            //----------------------------------------- No data
            // Orlen + Shell + EuroOil + ONO + MOL + OMV + Prim (**)
        ) return "WINDSCREEN_CLEANER";

        // Nothing else
        return undefined;

        // Notes
        //---------------------------------------------------------------------------------------------------
        // (*)      MOL's website map page apparently doesn't work with privacy browser extensions.
        //
        // (**)     No data for "Prim" petrol stations are provided, since their website doesn't provide
        //          any price data. The same applies to "EuroOil" and "MOL" as well.
    }

    public static convertFileName(name: string): string {
        // Convert the name to lowercase
        let lowerName = name.toLowerCase();

        // Replace diacritics with their ASCII equivalents
        lowerName = lowerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Replace spaces with hyphens
        lowerName = lowerName.replace(/\s+/g, "-");

        // Remove all non-alphanumeric characters except hyphens
        lowerName = lowerName.replace(/[^a-z0-9-]/g, "");

        // Remove multiple consecutive hyphens
        lowerName = lowerName.replace(/-+/g, "-");

        // Trim hyphens from the start and end
        lowerName = lowerName.replace(/^-|-$/g, "");

        // Return the converted name
        return lowerName;
    }
}

export default WebCrawler;
