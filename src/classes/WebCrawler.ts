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

    public abstract start(): Promise<void>;

    public static resolveFuelQuality(station: string, fuelName: string): FuelQuality {
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
            pslower === "ono" && (ftlower.includes("natural 95") || ftlower.includes("diesel") && !ftlower.includes("+"))
            ||                                                                      // ONO
            pslower === "mol" && !ftlower.includes("plus")                          // MOL (*)
            ||
            pslower === "omv" && !ftlower.includes("maxxmotion") && (ftlower.includes("natural") || ftlower.includes("diesel"))
            ||                                                                      // OMV
            pslower === "makro" && !ftlower.includes("drive") && (ftlower.includes("natural") || ftlower.includes("diesel"))
                                                                                    // Makro
            //----------------------------------------- No data
            // EuroOil (**) + Prim (**)
        ) return "REGULAR";

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
            pslower === "ono" && (ftlower.includes("natural 98") || ftlower.includes("diesel+"))
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

    public static resolveFuelType(station: string, fuelName: string): FuelType {
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
                && (ftlower.includes("natural") || ftlower.includes("drive") && !ftlower.includes("diesel") )

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
