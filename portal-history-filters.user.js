// ==UserScript==
// @id             iitc-portal-history-filters
// @name           IITC plugin: Portal History Filters
// @category       Layer
// @version        1.0.1.20250309.185524
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Allow users to filter portals based on their history (visited, unvisited, captured, uncaptured)
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/portal-history-filters.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/portal-history-filters.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 'portalHistoryFilters';
    plugin_info.dateTimeVersion = '20250309.185524';
    plugin_info.pluginId = 'portal-history-filters';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Base plugin setup
    window.plugin.portalHistoryFilters = function () { };
    var self = window.plugin.portalHistoryFilters;

    self.addHistoryLayers = function () {
        // Make sure layerChooser is available
        if (!window.layerChooser) {
            console.error('Portal History Filters: layerChooser not available');
            return;
        }

        // Define all history filter configurations
        const historyFilters = [
            {
                id: 'unvisited',
                name: 'Unvisited Portals',
                filter: { portal: true, data: { history: { visited: false } } }
            },
            {
                id: 'visited',
                name: 'Visited but Uncaptured Portals',
                filter: { portal: true, data: { history: { visited: true, captured: false } } }
            },
            {
                id: 'captured',
                name: 'Captured Portals',
                filter: { portal: true, data: { history: { captured: true } } }
            }
        ];

        // Create and add all filter layers
        historyFilters.forEach(filter => {
            self[filter.id + 'Layer'] = new IITC.filters.FilterLayer({
                name: filter.name,
                filter: filter.filter
            });

            window.layerChooser.addOverlay(self[filter.id + 'Layer'], filter.name);
        });
    };

    // Initialize plugin
    self.init = function () {
        // Wait for IITC to fully load
        if (!window.IITC || !window.IITC.filters) {
            console.log('Portal History Filters: Waiting for IITC filters...');
            setTimeout(self.init, 1000);
            return;
        }

        self.addHistoryLayers();
        console.log('Portal History Filters: Plugin loaded');
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
