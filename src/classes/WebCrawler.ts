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
        if (type === "LOG")
            console.log(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "DEBUG")
            console.debug(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "ERROR")
            console.error(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else if (type === "WARN")
            console.warn(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] ${message}`);
        else
            console.warn(`[${moment().tz(moment.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss zz")}] [${this.name} crawler] Wrong message type: '${type}' for message: '${message}'`);
    }

    public async writeToDB(station: StationStr, fuelData: LocationData[]): Promise<void> {
        for (const data of fuelData) {
            // Get station name and fuels
            let stationName = data.stationName;
            let fuels = data.fuels;

            // Get location GPS coordinates
            // Data source: https://openstreetmap.org/
            // Data license: Open Database License (ODbL) https://opendatacommons.org/licenses/odbl/

            let searchTerm, osmData;

            if (station === 'globus') {
                searchTerm = data.location.split('-').slice(-1)[0].trim();
                osmData = await fetch(`https://nominatim.openstreetmap.org/search?q=Globus+${searchTerm}&format=json`)
                    .then(response => response.json());
            } else {
                searchTerm = data.stationName.replace(/ +/g, '+');
                osmData = await fetch(`https://nominatim.openstreetmap.org/search?q=${searchTerm}&format=json`)
                            .then(response => response.json());
            }

            // Declare variables, preload with NaN
            let osmLat = NaN, osmLon = NaN;

            // Prepare failure flag
            let fail = false;

            // Check if OSM data is an array
            let isArray = Array.isArray(osmData);
            if (!isArray) {
                // Print error
                this.printMessage(`Returned data for ${data.location
                    } is not an array. Using Null Island coordinates.`, "ERROR");

                // Set coordinates to (0, 0)
                osmLat = 0;
                osmLon = 0;

                // Set failure flag
                fail = true;
            }
                        
            // Check for petrol station coordinates
            if(!fail) osmData.forEach((element: any) => {
                // Check fuel location
                if (element.type && (
                    element.type === "fuel" ||
                    element.type === "yes" ||       // ???      = I have no idea who put this in OSM data
                    element.type === "alcohol"      // WTF????  = I have no idea who put this in OSM data
                )) {
                    osmLat = Number.parseFloat(element.lat);
                    osmLon = Number.parseFloat(element.lon);
                }
            });

            // Check if coordinates were found
            if (Number.isNaN(osmLat) || Number.isNaN(osmLon)) {
                // Print error
                this.printMessage(`Failed to find fuel station location coordinates for ${data.location}. Trying to use store coordinates.`, "ERROR");

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
                    this.printMessage(`Failed to find store location coordinates for ${data.location
                        }. Using Null Island coordinates.`, "ERROR");

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
