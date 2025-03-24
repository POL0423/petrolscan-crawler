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
import { 
    Worker, SHARE_ENV, MessageChannel, MessagePort, parentPort
} from 'worker_threads';

// Local imports
import Timestamp from './classes/Timestamp.js';

// Logic
//-------------------------------------------------
// Define exit fallback
const exit_fallback = (exitCode: number): void => {
    // Terminate everything if the process didn't finish successfully.
    if(exitCode !== 0) process.exit(exitCode);
}

// Create subthreads
const workers: {[a: string]: Worker} = {
    globus: new Worker('./crawlers/globus.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    orlen: new Worker('./crawlers/orlen.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    shell: new Worker('./crawlers/shell.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    euro_oil: new Worker('./crawlers/euroOil.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    ono: new Worker('./crawlers/ono.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    mol: new Worker('./crawlers/mol.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    omv: new Worker('./crawlers/omv.ts', { env: SHARE_ENV }).on('exit', exit_fallback),
    prim: new Worker('./crawlers/prim.ts', { env: SHARE_ENV }).on('exit', exit_fallback)
};

// Create communication channels
const channels: {[a: string]: MessageChannel} = {
    globus: new MessageChannel(),
    orlen: new MessageChannel(),
    shell: new MessageChannel(),
    euro_oil: new MessageChannel(),
    ono: new MessageChannel(),
    mol: new MessageChannel(),
    omv: new MessageChannel(),
    prim: new MessageChannel()
};

// Send initial messages
workers.globus.postMessage({command: 'start'}, [channels.globus.port1]);
workers.orlen.postMessage({command: 'start'}, [channels.orlen.port1]);
workers.shell.postMessage({command: 'start'}, [channels.shell.port1]);
workers.euro_oil.postMessage({command: 'start'}, [channels.euro_oil.port1]);
workers.ono.postMessage({command: 'start'}, [channels.ono.port1]);
workers.mol.postMessage({command: 'start'}, [channels.mol.port1]);
workers.omv.postMessage({command: 'start'}, [channels.omv.port1]);
workers.prim.postMessage({command: 'start'}, [channels.prim.port1]);

// Receive messages
channels.globus.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Globus Crawler sends info: ${value}`);
});
channels.orlen.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.shell.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.euro_oil.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.ono.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.mol.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.omv.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
channels.prim.port2.on('message', (value) => {
    console.log(`[${Timestamp.getFullDateTime(new Date())}] Orlen Crawler sends info: ${value}`);
});
