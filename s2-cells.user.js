// ==UserScript==
// @id             iitc-plugin-s2-cells
// @name           IITC plugin: S2 Cells
// @category       Layer
// @version        0.2.1.20251018.000000
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Shows configurable S2 level cells on the map
// @homepageURL    https://github.com/Konano/iitc-plugins
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/s2-cells.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/s2-cells.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // Make sure that window.plugin exists
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN INFO ////////////////////////////////////////////////////////
    plugin_info.buildName = 's2Cells';
    plugin_info.dateTimeVersion = '20250930.000000';
    plugin_info.pluginId = 's2-cells';

    // PLUGIN START ////////////////////////////////////////////////////////

    // Use own namespace for plugin
    window.plugin.s2Cells = function () { };
    var self = window.plugin.s2Cells;

    // Default settings
    self.defaultSettings = {
        lightCell: 17,
        darkCell: 14,
        lightColor: '#f5fffa',
        darkColor: '#3cb371',
        lightWidth: 1,
        darkWidth: 8
    };

    self.settings = Object.assign({}, self.defaultSettings);
    self.storageKey = 's2-cells-settings';

    // Save settings to localStorage
    self.saveSettings = function () {
        localStorage[self.storageKey] = JSON.stringify(self.settings);
    };

    // Load settings from localStorage
    self.loadSettings = function () {
        if (typeof localStorage[self.storageKey] !== "undefined") {
            try {
                self.settings = Object.assign({}, self.defaultSettings, JSON.parse(localStorage[self.storageKey]));
            } catch (e) {
                console.error('S2 Cells: Error loading settings, using defaults', e);
                self.settings = Object.assign({}, self.defaultSettings);
            }
        }
    };

    // Reset settings to defaults
    self.resetSettings = function () {
        self.settings = Object.assign({}, self.defaultSettings);
        self.saveSettings();
        self.updateCells();
    };

    // Show configuration dialog
    self.showConfigDialog = function () {
        self.loadSettings();
        
        var dialogHtml = 
            '<div id="s2-cells-config-dialog">' +
            '<p><strong>Inner Cells (Level ' + self.settings.lightCell + ')</strong></p>' +
            '<div style="margin: 10px 0;">' +
                '<label>Level: <input type="number" id="light-cell" value="' + self.settings.lightCell + '" min="2" max="20" style="width: 60px;"/></label>' +
                '<label style="margin-left: 15px;">Color: <input type="color" id="light-color" value="' + self.settings.lightColor + '"/></label>' +
                '<label style="margin-left: 15px;">Width: <input type="number" id="light-width" value="' + self.settings.lightWidth + '" min="1" max="10" style="width: 60px;"/></label>' +
            '</div>' +
            '<p><strong>Outer Cells (Level ' + self.settings.darkCell + ')</strong></p>' +
            '<div style="margin: 10px 0;">' +
                '<label>Level: <input type="number" id="dark-cell" value="' + self.settings.darkCell + '" min="2" max="20" style="width: 60px;"/></label>' +
                '<label style="margin-left: 15px;">Color: <input type="color" id="dark-color" value="' + self.settings.darkColor + '"/></label>' +
                '<label style="margin-left: 15px;">Width: <input type="number" id="dark-width" value="' + self.settings.darkWidth + '" min="1" max="10" style="width: 60px;"/></label>' +
            '</div>' +
            '<div style="margin-top: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">' +
                '<p style="margin: 0 0 5px 0; font-size: 12px;"><strong>Note:</strong> If your choices would cause too many cells to be rendered, we will try not to display them.</p>' +
                '<p style="margin: 0; font-size: 12px;">Higher level numbers = smaller cells. Lower level numbers = larger cells.</p>' +
            '</div>' +
            '</div>';

        var dialog = window.dialog({
            title: "S2 Cells Configuration",
            html: dialogHtml,
            width: 'auto',
            dialogClass: 's2-cells-dialog',
            buttons: {
                'Reset to Defaults': function () {
                    self.resetSettings();
                    $(this).dialog('close');
                },
                'Cancel': function () {
                    $(this).dialog('close');
                },
                'Save': function () {
                    var darkCell = parseInt($("#dark-cell").val(), 10);
                    var lightCell = parseInt($("#light-cell").val(), 10);
                    var darkColor = $("#dark-color").val();
                    var lightColor = $("#light-color").val();
                    var lightWidth = parseInt($("#light-width").val(), 10);
                    var darkWidth = parseInt($("#dark-width").val(), 10);

                    // Validate inputs
                    if (isNaN(lightCell) || isNaN(darkCell) ||
                        lightCell < 2 || lightCell > 20 ||
                        darkCell < 2 || darkCell > 20 ||
                        isNaN(lightWidth) || isNaN(darkWidth) ||
                        lightWidth < 1 || lightWidth > 10 ||
                        darkWidth < 1 || darkWidth > 10) {
                        alert("Invalid value(s). Cell levels must be numbers between 2 and 20, widths between 1 and 10");
                        return;
                    }

                    // Save settings
                    self.settings.darkCell = darkCell;
                    self.settings.lightCell = lightCell;
                    self.settings.lightColor = lightColor;
                    self.settings.darkColor = darkColor;
                    self.settings.lightWidth = lightWidth;
                    self.settings.darkWidth = darkWidth;

                    self.saveSettings();
                    self.updateCells();
                    $(this).dialog('close');
                }
            }
        });
    };

    // S2 Geometry Library
    // Based on Google's S2 geometry library with modifications for JavaScript
    self.initS2Geometry = function () {
        if (window.S2) return; // Already initialized

        window.S2 = {};

        var LatLngToXYZ = function (latLng) {
            var d2r = Math.PI / 180.0;
            var phi = latLng.lat * d2r;
            var theta = latLng.lng * d2r;
            var cosphi = Math.cos(phi);
            return [Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi)];
        };

        var XYZToLatLng = function (xyz) {
            var r2d = 180.0 / Math.PI;
            var lat = Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]));
            var lng = Math.atan2(xyz[1], xyz[0]);
            return L.latLng(lat * r2d, lng * r2d);
        };

        var largestAbsComponent = function (xyz) {
            var temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

            if (temp[0] > temp[1]) {
                if (temp[0] > temp[2]) {
                    return 0;
                } else {
                    return 2;
                }
            } else {
                if (temp[1] > temp[2]) {
                    return 1;
                } else {
                    return 2;
                }
            }
        };

        var faceXYZToUV = function (face, xyz) {
            var u, v;

            switch (face) {
                case 0:
                    u = xyz[1] / xyz[0];
                    v = xyz[2] / xyz[0];
                    break;
                case 1:
                    u = -xyz[0] / xyz[1];
                    v = xyz[2] / xyz[1];
                    break;
                case 2:
                    u = -xyz[0] / xyz[2];
                    v = -xyz[1] / xyz[2];
                    break;
                case 3:
                    u = xyz[2] / xyz[0];
                    v = xyz[1] / xyz[0];
                    break;
                case 4:
                    u = xyz[2] / xyz[1];
                    v = -xyz[0] / xyz[1];
                    break;
                case 5:
                    u = -xyz[1] / xyz[2];
                    v = -xyz[0] / xyz[2];
                    break;
                default:
                    throw new Error('Invalid face: ' + face);
            }

            return [u, v];
        };

        var XYZToFaceUV = function (xyz) {
            var face = largestAbsComponent(xyz);

            if (xyz[face] < 0) {
                face += 3;
            }

            var uv = faceXYZToUV(face, xyz);
            return [face, uv];
        };

        var FaceUVToXYZ = function (face, uv) {
            var u = uv[0];
            var v = uv[1];

            switch (face) {
                case 0: return [1, u, v];
                case 1: return [-u, 1, v];
                case 2: return [-u, -v, 1];
                case 3: return [-1, -v, -u];
                case 4: return [v, -1, -u];
                case 5: return [v, u, -1];
                default:
                    throw new Error('Invalid face: ' + face);
            }
        };

        var STToUV = function (st) {
            var singleSTtoUV = function (st) {
                if (st >= 0.5) {
                    return (1 / 3.0) * (4 * st * st - 1);
                } else {
                    return (1 / 3.0) * (1 - (4 * (1 - st) * (1 - st)));
                }
            };

            return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
        };

        var UVToST = function (uv) {
            var singleUVtoST = function (uv) {
                if (uv >= 0) {
                    return 0.5 * Math.sqrt(1 + 3 * uv);
                } else {
                    return 1 - 0.5 * Math.sqrt(1 - 3 * uv);
                }
            };

            return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
        };

        var STToIJ = function (st, order) {
            var maxSize = (1 << order);

            var singleSTtoIJ = function (st) {
                var ij = Math.floor(st * maxSize);
                return Math.max(0, Math.min(maxSize - 1, ij));
            };

            return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
        };

        var IJToST = function (ij, order, offsets) {
            var maxSize = (1 << order);

            return [
                (ij[0] + offsets[0]) / maxSize,
                (ij[1] + offsets[1]) / maxSize
            ];
        };

        // Hilbert space-filling curve
        var pointToHilbertQuadList = function (x, y, order) {
            var hilbertMap = {
                'a': [
                    [0, 'd'], [1, 'a'], [3, 'b'], [2, 'a']
                ],
                'b': [
                    [2, 'b'], [1, 'b'], [3, 'a'], [0, 'c']
                ],
                'c': [
                    [2, 'c'], [3, 'd'], [1, 'c'], [0, 'b']
                ],
                'd': [
                    [0, 'a'], [3, 'c'], [1, 'd'], [2, 'd']
                ]
            };

            var currentSquare = 'a';
            var positions = [];

            for (var i = order - 1; i >= 0; i--) {
                var mask = 1 << i;
                var quad_x = x & mask ? 1 : 0;
                var quad_y = y & mask ? 1 : 0;
                var t = hilbertMap[currentSquare][quad_x * 2 + quad_y];
                positions.push(t[0]);
                currentSquare = t[1];
            }

            return positions;
        };

        // S2Cell class
        S2.S2Cell = function () { };

        // Static method to construct from LatLng
        S2.S2Cell.FromLatLng = function (latLng, level) {
            var xyz = LatLngToXYZ(latLng);
            var faceuv = XYZToFaceUV(xyz);
            var st = UVToST(faceuv[1]);
            var ij = STToIJ(st, level);
            return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level);
        };

        S2.S2Cell.FromFaceIJ = function (face, ij, level) {
            var cell = new S2.S2Cell();
            cell.face = face;
            cell.ij = ij;
            cell.level = level;
            return cell;
        };

        S2.S2Cell.prototype.toString = function () {
            return 'F' + this.face + 'ij[' + this.ij[0] + ',' + this.ij[1] + ']@' + this.level;
        };

        S2.S2Cell.prototype.getLatLng = function () {
            var st = IJToST(this.ij, this.level, [0.5, 0.5]);
            var uv = STToUV(st);
            var xyz = FaceUVToXYZ(this.face, uv);
            return XYZToLatLng(xyz);
        };

        S2.S2Cell.prototype.getCornerLatLngs = function () {
            var result = [];
            var offsets = [
                [0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]
            ];

            for (var i = 0; i < 4; i++) {
                var st = IJToST(this.ij, this.level, offsets[i]);
                var uv = STToUV(st);
                var xyz = FaceUVToXYZ(this.face, uv);
                result.push(XYZToLatLng(xyz));
            }
            return result;
        };

        S2.S2Cell.prototype.getFaceAndQuads = function () {
            var quads = pointToHilbertQuadList(this.ij[0], this.ij[1], this.level);
            return [this.face, quads];
        };

        S2.S2Cell.prototype.getNeighbors = function () {
            var fromFaceIJWrap = function (face, ij, level) {
                var maxSize = (1 << level);
                if (ij[0] >= 0 && ij[1] >= 0 && ij[0] < maxSize && ij[1] < maxSize) {
                    return S2.S2Cell.FromFaceIJ(face, ij, level);
                } else {
                    var st = IJToST(ij, level, [0.5, 0.5]);
                    var uv = STToUV(st);
                    var xyz = FaceUVToXYZ(face, uv);
                    var faceuv = XYZToFaceUV(xyz);
                    face = faceuv[0];
                    uv = faceuv[1];
                    st = UVToST(uv);
                    ij = STToIJ(st, level);
                    return S2.S2Cell.FromFaceIJ(face, ij, level);
                }
            };

            var face = this.face;
            var i = this.ij[0];
            var j = this.ij[1];
            var level = this.level;

            return [
                fromFaceIJWrap(face, [i - 1, j], level),
                fromFaceIJWrap(face, [i, j - 1], level),
                fromFaceIJWrap(face, [i + 1, j], level),
                fromFaceIJWrap(face, [i, j + 1], level)
            ];
        };
    };

    // Face names and code words for region naming
    self.FACE_NAMES = ['AF', 'AS', 'NR', 'PA', 'AM', 'ST'];
    self.CODE_WORDS = [
        'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA',
        'ECHO', 'FOXTROT', 'GOLF', 'HOTEL',
        'JULIET', 'KILO', 'LIMA', 'MIKE',
        'NOVEMBER', 'PAPA', 'ROMEO', 'SIERRA',
    ];

    // Generate region name for a cell
    self.getRegionName = function (cell) {
        // Ingress flips i and j coords for odd-numbered faces
        if (cell.face == 1 || cell.face == 3 || cell.face == 5) {
            cell = S2.S2Cell.FromFaceIJ(cell.face, [cell.ij[1], cell.ij[0]], cell.level);
        }

        var name = self.FACE_NAMES[cell.face];

        if (cell.level >= 4) {
            var regionI = cell.ij[0] >> (cell.level - 4);
            var regionJ = cell.ij[1] >> (cell.level - 4);
            name += window.zeroPad(regionI + 1, 2) + '-' + self.CODE_WORDS[regionJ];
        }

        if (cell.level >= 6) {
            var facequads = cell.getFaceAndQuads();
            var number = facequads[1][4] * 4 + facequads[1][5];
            name += '-' + window.zeroPad(number, 2);
        }

        return name;
    };

    // Calculate appropriate max zoom based on cell level
    self.getMaxZoomForLevel = function (level) {
        if (level <= 10) return 6;
        if (level <= 12) return 10;
        if (level <= 15) return 12;
        if (level <= 17) return 15;
        return 18;
    };

    // Draw a single cell
    self.drawCell = function (cell, color, weight, showName) {
        var corners = cell.getCornerLatLngs();
        var center = cell.getLatLng();
        var name = self.getRegionName(cell);

        // Draw cell border (only two edges to avoid overlap)
        var region = L.geodesicPolyline([corners[0], corners[1], corners[2]], {
            fill: false,
            color: color,
            opacity: 0.5,
            weight: weight,
            clickable: false
        });

        self.cellLayer.addLayer(region);

        if (showName) {
            // Draw cell name at high zoom levels
            if (window.map.getZoom() >= 9) {
                var namebounds = window.map.getBounds().pad(-0.1);
                if (!namebounds.contains(center)) {
                    var newlat = Math.max(Math.min(center.lat, namebounds.getNorth()), namebounds.getSouth());
                    var newlng = Math.max(Math.min(center.lng, namebounds.getEast()), namebounds.getWest());
                    var newpos = L.latLng(newlat, newlng);

                    var newposcell = S2.S2Cell.FromLatLng(newpos, 6);
                    if (newposcell.toString() == cell.toString()) {
                        center = newpos;
                    }
                }
            }

            var marker = L.marker(center, {
                icon: L.divIcon({
                    className: 's2-cells-name',
                    iconAnchor: [100, 5],
                    iconSize: [200, 10],
                    html: name,
                })
            });
            self.cellLayer.addLayer(marker);
        }
    };

    // Main update function
    self.updateCells = function () {
        if (!self.cellLayer) return;

        try {
            self.cellLayer.clearLayers();
        } catch (err) {
            console.error('S2 Cells: Error clearing layers:', err);
        }

        var bounds = window.map.getBounds();
        var seenCells = {};
        var zoom = window.map.getZoom();

        var drawCellAndNeighbors = function (cell, color, weight, showName) {
            var cellStr = cell.toString();

            if (!seenCells[cellStr]) {
                seenCells[cellStr] = true;

                var corners = cell.getCornerLatLngs();
                var cellBounds = L.latLngBounds([corners[0], corners[1]]).extend(corners[2]).extend(corners[3]);

                if (cellBounds.intersects(bounds)) {
                    self.drawCell(cell, color, weight, showName);

                    var neighbors = cell.getNeighbors();
                    for (var i = 0; i < neighbors.length; i++) {
                        drawCellAndNeighbors(neighbors[i], color, weight, showName);
                    }
                }
            }
        };

        // Determine if we should show cells based on zoom level
        var maxLevel = Math.max(self.settings.lightCell, self.settings.darkCell);
        var maxZoom = self.getMaxZoomForLevel(maxLevel);

        if (zoom >= maxZoom) {
            var lightCell = S2.S2Cell.FromLatLng(window.map.getCenter(), self.settings.lightCell);
            var darkCell = S2.S2Cell.FromLatLng(window.map.getCenter(), self.settings.darkCell);

            drawCellAndNeighbors(lightCell, self.settings.lightColor, self.settings.lightWidth, false);
            drawCellAndNeighbors(darkCell, self.settings.darkColor, self.settings.darkWidth, true);
        }

        // Draw S2 cube face boundaries
        self.drawGlobalBoundaries();
    };

    // Draw global S2 cube boundaries
    self.drawGlobalBoundaries = function () {
        var latLngs = [
            [45, -180], [35.264389682754654, -135], [35.264389682754654, -45],
            [35.264389682754654, 45], [35.264389682754654, 135], [45, 180]
        ];

        var globalCellOptions = {
            color: 'red',
            weight: 7,
            opacity: 0.5,
            clickable: false
        };

        for (var i = 0; i < latLngs.length - 1; i++) {
            var poly1 = L.geodesicPolyline([latLngs[i], latLngs[i + 1]], globalCellOptions);
            self.cellLayer.addLayer(poly1);

            var poly2 = L.geodesicPolyline([
                [-latLngs[i][0], latLngs[i][1]],
                [-latLngs[i + 1][0], latLngs[i + 1][1]]
            ], globalCellOptions);
            self.cellLayer.addLayer(poly2);
        }

        for (var i = -135; i <= 135; i += 90) {
            var poly = L.polyline([
                [35.264389682754654, i],
                [-35.264389682754654, i]
            ], globalCellOptions);
            self.cellLayer.addLayer(poly);
        }
    };

    // Setup plugin
    self.init = function () {
        self.loadSettings();
        self.initS2Geometry();

        // Create layer
        self.cellLayer = L.layerGroup();

        // Add custom CSS
        $("<style>")
            .prop("type", "text/css")
            .html(".s2-cells-name {\
                font-size: 14px;\
                font-weight: bold;\
                color: gold;\
                opacity: 0.7;\
                text-align: center;\
                text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000, 0 0 2px #000;\
                pointer-events: none;\
            }\
            .s2-cells-dialog .ui-dialog-titlebar {\
                text-align: center;\
            }")
            .appendTo("head");

        // Add layer to map
        window.addLayerGroup('S2 Cells', self.cellLayer, false);

        // Add toolbox link
        $('#toolbox').append(' <a onclick="window.plugin.s2Cells.showConfigDialog()" title="Configure S2 Cells display">S2 Cells</a>');

        // Add map event listeners
        window.map.on('moveend', self.updateCells);
        window.map.on('zoomend', self.updateCells);

        // Initial update
        self.updateCells();

        console.log('S2 Cells: Plugin initialized');
    };

    // Initialize plugin when IITC is ready
    var setup = function () {
        self.init();
    };

    setup.info = plugin_info;
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if (window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end

// Inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
