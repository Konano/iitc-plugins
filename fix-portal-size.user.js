// ==UserScript==
// @id             iitc-plugin-fix-portal-size
// @name           IITC plugin: Fix Portal Size
// @category       Highlighter
// @version        1.0.0.20250424.125800
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Fixes portal size rendering with options for all portals or only machina portals.
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/fix-portal-size.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/fix-portal-size.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 'fixPortalSize';
    plugin_info.dateTimeVersion = '20250424.125800';
    plugin_info.pluginId = 'fix-portal-size';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Base plugin setup
    window.plugin.fixPortalSize = function () { };
    var self = window.plugin.fixPortalSize;

    // Function to fix all portal sizes
    self.fixAllPortalSize = function (data) {
        var params = window.getMarkerStyleOptions({ team: data.portal.options.team, level: 1 });
        data.portal.setStyle(params);
    };

    // Function to fix only machina portal sizes
    self.fixMachinaPortalSize = function (data) {
        // Only apply to MACHINIMA (machina) portals
        if (data.portal.options.team === window.TEAM_MAC) {
            var params = window.getMarkerStyleOptions({ team: data.portal.options.team, level: 1 });
            data.portal.setStyle(params);
        }
    };

    // Add toggle button to the portal highlighter menu
    self.setupHighlighter = function () {
        window.addPortalHighlighter('Fix All Portal Sizes', self.fixAllPortalSize);
        window.addPortalHighlighter('Fix Machina Portal Sizes', self.fixMachinaPortalSize);
    };

    // Initialize plugin
    self.init = function () {
        self.setupHighlighter();
        console.log('Fix Portal Size: Plugin loaded');
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
