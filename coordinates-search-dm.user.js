// ==UserScript==
// @id             iitc-plugin-coordinates-search-dm
// @name           IITC plugin: Coordinates Search DM Format
// @category       Search
// @version        1.0.0.20250426.004531
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Adds support for searching coordinates in Degrees Minutes format (N 30° 14.832 E 120° 10.644)
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/coordinates-search-dm.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/coordinates-search-dm.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 'coordinatesSearchDM';
    plugin_info.dateTimeVersion = '20250426.004531';
    plugin_info.pluginId = 'coordinates-search-dm';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Base plugin setup
    window.plugin.coordinatesSearchDM = function () { };
    var self = window.plugin.coordinatesSearchDM;

    self.init = function () {
        // Add our search hook
        window.addHook('search', self.performSearch);
        console.log('Coordinates Search DM: Plugin loaded');
    };

    self.performSearch = function (query) {
        const added = new Set();
        
        // Regular expression for DM coordinates (N 30° 14.832 E 120° 10.644)
        const dmRegex = /([NS])\s*(\d{1,3})°\s*(\d{1,2}(?:\.\d+)?),?\s*([EW])\s*(\d{1,3})°\s*(\d{1,2}(?:\.\d+)?)/gi;

        // Convert DM to decimal format
        const parseDM = (dir, deg, min) => {
            const decimal = parseFloat(deg) + parseFloat(min) / 60;
            return dir === 'S' || dir === 'W' ? -decimal : decimal;
        };

        // Universal function for adding search result
        const addResult = (lat, lng) => {
            const latLngString = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (added.has(latLngString)) return;
            added.add(latLngString);

            query.addResult({
                title: latLngString,
                description: 'geo coordinates (DM format)',
                position: L.latLng(lat, lng),
                onSelected: (result) => {
                    for (const [guid, portal] of Object.entries(window.portals)) {
                        const { lat: pLat, lng: pLng } = portal.getLatLng();
                        if (`${pLat.toFixed(6)},${pLng.toFixed(6)}` === latLngString) {
                            window.renderPortalDetails(guid);
                            return;
                        }
                    }
                    window.urlPortalLL = [result.position.lat, result.position.lng];
                },
            });
        };

        // Search and process DM coordinates
        const dmMatches = Array.from(query.term.matchAll(dmRegex));
        dmMatches.forEach((match) => {
            const lat = parseDM(match[1], match[2], match[3]);
            const lng = parseDM(match[4], match[5], match[6]);
            addResult(lat, lng);
        });
    };

    // The entry point for this plugin
    function setup() {
        // Wait until IITC is loaded
        window.addHook('iitcLoaded', self.init);
    }

    // Add plugin info
    setup.info = plugin_info;

    // Add our startup hook
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);

    // If IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();
}

// Create a script element to hold our content script
var script = document.createElement('script');
var info = {};

// GM_info is defined by the assorted monkey-themed browser extensions
// and holds information parsed from the script header.
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}

// Create a text node and our IIFE inside of it
var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
// Add some content to the script element
script.appendChild(textContent);
// Finally, inject it... wherever.
(document.body || document.head || document.documentElement).appendChild(script);
