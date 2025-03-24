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
 * File: src/classes/DBLogger.ts
 */

// Imports
//-------------------------------------------------

class Timestamp {
    private tmstmp: Date;

    /**********************************************
     * Creates a new Timestamp object
     * 
     * 
     */
    constructor(date_obj?: Date) {
        this.tmstmp = date_obj || new Date();
    }

    public getYear(): string {
        return `${this.tmstmp.getFullYear()}`;      // Always 4-digit by Date object
    }

    public getMonth(): string {
        return this.tmstmp.getMonth() < 9           // Numbered 0-11 by Date object; check for single-digit values
            ? `0${this.tmstmp.getMonth() + 1}` : `${this.tmstmp.getMonth() + 1}`;
    }

    public getDay(): string {
        return this.tmstmp.getDate() < 10           // Numbered 1-31 by Date object; check for single digit values
            ? `0${this.tmstmp.getDate() + 1}` : `${this.tmstmp.getDate() + 1}`;
    }

    public getHours(): string {
        return this.tmstmp.getHours() < 10          // Numbered 0-23 by Date object; check for single digit values
            ? `0${this.tmstmp.getHours()}` : `${this.tmstmp.getHours()}`;
    }

    public getMinutes(): string {
        return this.tmstmp.getMinutes() < 10        // Numbered 0-59 by Date object; check for single digit values
            ? `0${this.tmstmp.getMinutes()}` : `${this.tmstmp.getMinutes()}`;
    }

    public getSeconds(): string {
        return this.tmstmp.getSeconds() < 10        // Numbered 0-59 by Date object; check for single digit values
            ? `0${this.tmstmp.getSeconds()}` : `${this.tmstmp.getSeconds()}`;
    }

    public getFullDateTime(): string {
        // Format: YYYY-MM-DD HH:MM:SS => year-month-day hours:minutes:seconds
        return `${this.getYear()}-${this.getMonth()}-${this.getDay()} ${this.getHours()}:${this.getMinutes()}:${this.getSeconds()}`;
    }

    public static getFullDateTime(date_obj: Date): string {
        const date_time = new Timestamp(date_obj);

        return date_time.getFullDateTime();
    }
}

export default Timestamp;
