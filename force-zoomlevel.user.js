// ==UserScript==
// @id             iitc-plugin-force-zoomlevel
// @name           IITC plugin: Force Zoom Level
// @category       Tweaks
// @version        0.2.0.20250309.190933
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Force IITC to load all portals, all links, or default regardless of zoom level.
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/force-zoomlevel.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/force-zoomlevel.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 'forceZoomLevel';
    plugin_info.dateTimeVersion = '20250309.190933';
    plugin_info.pluginId = 'force-zoomlevel';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Use own namespace for plugin
    window.plugin.forceZoomLevel = function () { };
    var self = window.plugin.forceZoomLevel;

    self.mode = 'Default';
    self.functionsOverwritten = false;
    self.zoomOptions = {
        'Default': 'Default',
        'AllLinks': 'All Links',
        'AllPortals': 'All Portals'
    };

    self.showDialog = function () {
        var div = document.createElement('div');

        div.appendChild(document.createTextNode('Select a forced zoom level: '));
        div.appendChild(document.createElement('br'));

        for (var option in self.zoomOptions) {
            var label = div.appendChild(document.createElement('label'));
            var input = label.appendChild(document.createElement('input'));
            input.type = 'radio';
            input.name = 'plugin-force-zoomlevel';
            input.value = option;
            if (option === self.mode) {
                input.checked = true;
            }

            input.addEventListener('click', function (opt) {
                return function () {
                    self.setMode(opt);
                }
            }(option), false);

            label.appendChild(document.createTextNode(' ' + self.zoomOptions[option]));
            div.appendChild(document.createElement('br'));
        }

        dialog({
            id: 'plugin-force-zoomlevel',
            html: div,
            title: 'Force Zoom Level',
        });
    };

    self.setMode = function (mode) {
        self.mode = mode;
        localStorage['plugin-forcezoomlevel-mode'] = mode;

        switch (mode) {
            case 'Default':
                window.getDataZoomForMapZoom = window.getDataZoomForMapZoomDefault;
                break;
            case 'AllLinks':
                window.getDataZoomForMapZoom = window.getDataZoomForMapZoomAllLinks;
                break;
            case 'AllPortals':
                window.getDataZoomForMapZoom = window.getDataZoomForMapZoomAllPortals;
                break;
        }

        window.mapDataRequest.start();
    };

    self.init = function () {
        $('#toolbox').append(' <a onclick="window.plugin.forceZoomLevel.showDialog()">Force Zoom Opt</a>');

        window.getDataZoomForMapZoomDefault = window.getDataZoomForMapZoom;
        window.getDataZoomForMapZoomAllLinks = function () { return 13; };
        window.getDataZoomForMapZoomAllPortals = function () { return 17; };

        try {
            var mode = localStorage['plugin-forcezoomlevel-mode'];
            if (typeof (mode) === 'undefined') {
                mode = 'Default';
            }
            self.setMode(mode);
        } catch (e) {
            console.warn(e);
            self.mode = 'Default';
        }

        console.log('Force Zoom Level: Plugin loaded');
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