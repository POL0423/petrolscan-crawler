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
 * File: src/types/OSMTypes.ts
 */

// OSM Nominatim API search result
type OSMSearchResult = {
    lat: string;
    lon: string;
    type: string;
    class: string;
    name?: string;
    display_name?: string;
    importance?: number;        // Used to rank fallback results when no priority type matches
    [key: string]: any;         // Allow additional properties
};

// Priority configuration for OSM location types
type OSMTypePriority = {
    class: string;
    type: string;
    priority: number;
};

// Search term configuration for station
type SearchTermConfig = {
    searchTerm: string;
    nameFilter?: string;           // Filter by 'name' field (e.g., "Tank Ono Dolní Dvořiště 1")
    displayNameFilter?: string;    // Filter by 'display_name' field (e.g., "Odrava")
};

export { OSMSearchResult, OSMTypePriority, SearchTermConfig };