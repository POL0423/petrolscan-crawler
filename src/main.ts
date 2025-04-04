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
 * File: src/main.ts
 */

// Imports
//-------------------------------------------------

// Node.js core modules
import fs from 'fs';
import { Worker, SHARE_ENV, MessageChannel } from 'worker_threads';
import moment from 'moment-timezone';

// Logic
//-------------------------------------------------

// Disabled crawlers (Check out README.md for their exclusion reasons)
const disabled = ['orlen', 'shell', 'eurooil', 'mol', 'omv', 'prim'];

// Read directory
const dir: string[] = fs.readdirSync('./crawlers/');

// Create subthreads
const workers: {[a: string]: Worker} = {};
dir.forEach((f: string) => {
    let m = f.replace(/\.[jt]s$/, '');

    if(!(m in disabled))        // Exclude disabled crawlers
        workers[m] = new Worker(`./crawlers/${m}.js`, { env: SHARE_ENV });
});

// Create communication channels
const channels: {[a: string]: MessageChannel} = {};
dir.forEach((f: string): void => {
    let m = f.replace(/\.[jt]s$/, '');

    if(!(m in disabled))        // Exclude disabled crawlers
        channels[m] = new MessageChannel();
});

// Datetime format              Year-Month-Day Hours:Minutes:Seconds Timezone
const format_string = "YYYY-MM-DD HH:mm:ss zz";
const timezone = moment.tz.guess();                 // Get the local timezone

// Receive messages
Object.keys(channels).forEach((c: string) => {
    channels[c].port2.on('message', (msg) => {
        console.log(`[${moment().tz(timezone).format(format_string)}] [Process "${c}"] Received data: ${msg}`);
    });
});

// Wait for all workers to finish
Object.keys(workers).forEach((w: string) => {
    // Handling errors
    workers[w].on("error", (err: Error) => {
        console.error(`[${moment().tz(timezone).format(format_string)}] [Process "${w}"] Error: ${err}`);
    });

    // Handling exits
    workers[w].on("exit", (retval: number) => {
        console.log(`[${moment().tz(timezone).format(format_string)}] [Process "${w}"] Received Exit code ${retval}`);
        
    });

    // Handling starts
    workers[w].on("online", () => {
        console.log(`[${moment().tz(timezone).format(format_string)}] [Process "${w}"] Process online`);
    });
});

// Check for SIGTERM or SIGKILL
process.on("SIGTERM", () => {
    console.log(`[${moment().tz(timezone).format(format_string)}] [Main] Received SIGTERM, ending all jobs...`);
    process.exit(-1);
});

process.on("SIGKILL", () => {
    console.log(`[${moment().tz(timezone).format(format_string)}] [Main] Received SIGKILL, terminating all jobs...`);
    Object.keys(workers).forEach((w: string) => {
        // Terminate all workers
        workers[w].terminate();
    });
    process.exit(-2);
});

// Exit gracefully
process.on("exit", (retval: number) => {
    // Send exit message to all workers
    Object.keys(channels).forEach((c: string) => {
        channels[c].port1.postMessage({signal: "SIGTERM"});
    });

    // Print exit message
    console.log(`[${moment().tz(timezone).format(format_string)}] [Main] All processes ended.`);
    
    // Return exit code
    return retval;
});
