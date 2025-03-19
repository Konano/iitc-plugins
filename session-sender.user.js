// ==UserScript==
// @id             iitc-plugin-session-sender
// @name           IITC plugin: Session Sender
// @category       Misc
// @version        0.1.0.20250320.001111
// @author         AI Assistant
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Sends session ID to a specified URL via POST request.
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/session-sender.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/session-sender.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          GM_cookie
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 'sessionSender';
    plugin_info.dateTimeVersion = '20250320.001111';
    plugin_info.pluginId = 'session-sender';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Use own namespace for plugin
    window.plugin.sessionSender = function () { };
    var self = window.plugin.sessionSender;

    self.targetUrl = '';

    self.showDialog = function () {
        var div = document.createElement('div');

        div.appendChild(document.createTextNode('Enter URL to send session ID: '));
        div.appendChild(document.createElement('br'));

        var urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.id = 'session-sender-url';
        urlInput.value = self.targetUrl;
        urlInput.placeholder = 'https://example.com/api/session';
        urlInput.style.width = '100%';
        div.appendChild(urlInput);

        div.appendChild(document.createElement('br'));

        // Add note about HTTPS requirement
        var note = document.createElement('p');
        note.style.color = '#888';
        note.style.fontSize = '0.9em';
        note.textContent = 'Note: URL must begin with https://';
        div.appendChild(note);

        window.dialog({
            id: 'plugin-session-sender',
            html: div,
            title: 'Session Sender'
        }).dialog('option', 'buttons', {
            'Save': function() {
                var url = document.getElementById('session-sender-url').value;
                // Validate URL starts with https://
                if (url && !url.startsWith('https://')) {
                    alert('URL must begin with https://');
                    return;
                }
                self.setTargetUrl(url);
                if (url) {
                    self.sendSessionId();
                }
                $(this).dialog('close');
            },
            'Close': function() {
                $(this).dialog('close');
            }
        });
    };

    self.setTargetUrl = function (url) {
        // Only set URL if it's empty or starts with https://
        if (!url || url.startsWith('https://')) {
            self.targetUrl = url;
            localStorage['plugin-sessionsender-url'] = url;
            console.log('Session Sender: Target URL set to ' + url);
        } else {
            console.warn('Session Sender: Invalid URL format - must begin with https://');
        }
    };

    self.getSessionId = function(callback) {
        GM_cookie.list(
            { domain: "intel.ingress.com" },
            function(cookies) {
                var sessionId = '';
                for (var i = 0; i < cookies.length; i++) {
                    if (cookies[i].name === 'sessionid') {
                        sessionId = cookies[i].value;
                        break;
                    }
                }
                callback(sessionId);
            }
        );
    };

    self.sendSessionId = function() {
        if (!self.targetUrl) {
            console.log('Session Sender: No target URL set');
            return;
        }

        self.getSessionId(function(sessionId) {
            if (!sessionId) {
                console.log('Session Sender: No session ID found');
                return;
            }

            // Send session ID to target URL
            fetch(self.targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: sessionId })
            })
            .then(response => {
                if (response.ok) {
                    console.log('Session Sender: Session ID sent successfully');
                } else {
                    console.error('Session Sender: Failed to send session ID');
                }
            })
            .catch(error => {
                console.error('Session Sender: Error sending session ID', error);
            });
        });
    };

    self.init = function () {
        $('#toolbox').append(' <a onclick="window.plugin.sessionSender.showDialog()">Session Sender</a>');

        try {
            var url = localStorage['plugin-sessionsender-url'];
            // Check if URL exists, is not undefined, and is not an empty string
            if (url && url.trim() !== '') {
                // Additional validation to ensure it starts with https://
                if (url.startsWith('https://')) {
                    self.targetUrl = url;
                    self.sendSessionId();
                } else {
                    console.warn('Session Sender: Stored URL invalid - must begin with https://');
                    // Clear invalid URL
                    localStorage['plugin-sessionsender-url'] = '';
                }
            }
        } catch (e) {
            console.warn(e);
        }

        console.log('Session Sender: Plugin loaded');
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

unsafeWindow.GM_cookie = GM_cookie;
