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
 * File: test/test_main.ts
 */

// Imports
//-------------------------------------------------
import fs from 'fs';
import { Worker, SHARE_ENV, MessageChannel } from 'worker_threads';
import moment from 'moment-timezone';

// Disabled crawlers
const disabled = ['shell', 'eurooil', 'mol', 'omv', 'prim'];

// TODO: Basic connectivity and database logging test

// TODO: Crawler tests
