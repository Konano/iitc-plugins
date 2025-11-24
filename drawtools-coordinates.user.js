// ==UserScript==
// @id             iitc-plugin-drawtools-coordinates
// @name           IITC plugin: DrawTools Coordinates
// @category       Draw
// @version        0.2.1
// @author         Konano
// @namespace      https://github.com/Konano/iitc-plugins
// @description    Display coordinates of all drawn items from DrawTools plugin
// @updateURL      https://github.com/Konano/iitc-plugins/raw/main/drawtools-coordinates.user.js
// @downloadURL    https://github.com/Konano/iitc-plugins/raw/main/drawtools-coordinates.user.js
// @supportURL     https://github.com/Konano/iitc-plugins/issues
// @homepageURL    https://github.com/Konano/iitc-plugins
// @match          https://intel.ingress.com/*
// @license        MIT
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // 确保 window.plugin 存在
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // 插件信息
    plugin_info.buildName = 'drawToolsCoordinates';
    plugin_info.dateTimeVersion = '20250901.000000';
    plugin_info.pluginId = 'drawtools-coordinates';

    // 插件开始
    window.plugin.drawToolsCoordinates = function () { };
    var self = window.plugin.drawToolsCoordinates;

    // 格式化坐标为十进制度数
    self.formatDecimal = function(lat, lng) {
        return lat.toFixed(6) + ',' + lng.toFixed(6);
    };

    // 转换为度分格式
    self.toDegreeMinutes = function(decimal, isLat) {
        var absolute = Math.abs(decimal);
        var degrees = Math.floor(absolute);
        var minutes = (absolute - degrees) * 60;

        var direction;
        if (isLat) {
            direction = decimal >= 0 ? 'N' : 'S';
        } else {
            direction = decimal >= 0 ? 'E' : 'W';
        }

        // return direction + ' ' + degrees + '° ' + minutes.toFixed(3) + "'";
        return direction + ' ' + degrees + '° ' + minutes.toFixed(3).padStart(6, '0');
    };

    // 格式化坐标（包含两种格式）
    self.formatCoordinate = function(lat, lng) {
        var decimal = self.formatDecimal(lat, lng);
        var degMin = self.toDegreeMinutes(lat, true) + ' ' + self.toDegreeMinutes(lng, false);
        return decimal + '\n' + degMin;
    };

    // 获取所有绘制项目的坐标
    self.getAllCoordinates = function() {
        var coordinates = [];

        // 检查 DrawTools 插件是否存在
        if (!window.plugin.drawTools || !window.plugin.drawTools.drawnItems) {
            return ['DrawTools plugin not found or no items drawn'];
        }

        var itemCount = 0;

        // 遍历所有绘制的图层
        window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
            itemCount++;
            var coords = [];
            var type = '';

            if (layer instanceof L.Marker) {
                // 标记点
                type = 'Marker';
                var latLng = layer.getLatLng();
                coords.push(self.formatCoordinate(latLng.lat, latLng.lng));

                // } else if (layer instanceof L.Circle || layer instanceof L.GeodesicCircle) {
                //     // 圆形
                //     type = 'Circle';
                //     var center = layer.getLatLng();
                //     var radius = layer.getRadius();
                //     coords.push('Center:\n' + self.formatCoordinate(center.lat, center.lng));
                //     coords.push('Radius: ' + radius.toFixed(2) + 'm');

                // } else if (layer instanceof L.Polygon || layer instanceof L.GeodesicPolygon) {
                //     // 多边形
                //     type = 'Polygon';
                //     var latLngs = layer.getLatLngs();
                //     if (Array.isArray(latLngs[0])) {
                //         latLngs = latLngs[0]; // 处理嵌套数组的情况
                //     }
                //     latLngs.forEach(function(latLng, index) {
                //         coords.push('Point ' + (index + 1) + ':\n' + self.formatCoordinate(latLng.lat, latLng.lng));
                //     });

                // } else if (layer instanceof L.Polyline || layer instanceof L.GeodesicPolyline) {
                //     // 折线
                //     type = 'Polyline';
                //     var latLngs = layer.getLatLngs();
                //     latLngs.forEach(function(latLng, index) {
                //         coords.push('Point ' + (index + 1) + ':\n' + self.formatCoordinate(latLng.lat, latLng.lng));
                //     });
            }

            if (coords.length > 0) {
                coordinates.push('--- ' + type + ' #' + itemCount + ' ---');
                coordinates = coordinates.concat(coords);
                coordinates.push(''); // 添加空行分隔
            }
        });

        if (coordinates.length === 0) {
            return ['No drawn items found'];
        }

        return coordinates;
    };

    // 显示坐标对话框
    self.showDialog = function() {
        var coordinates = self.getAllCoordinates();
        var coordinatesText = coordinates.join('\n');

        // 创建对话框内容
        var html = '<div>';
        html += '<p style="margin-bottom: 10px; margin-top: 0px;">Coordinates of all drawn items:</p>';
        html += '<textarea id="drawtools-coords-textarea" readonly style="width: 100%; height: 400px; font-family: Consolas, monospace; font-size: 12px; resize: vertical;">';
        html += coordinatesText;
        html += '</textarea>';
        html += '<p style="margin-top: 10px; color: #888; font-size: 0.9em;">';
        html += 'Format:<br/>';
        html += 'decimal degrees (lat,lng)<br/>';
        // html += 'degree minutes (N/S xx° xx.xxx\' E/W xx° xx.xxx\')';
        html += 'degree minutes (N/S xx° xx.xxx E/W xx° xx.xxx)';
        html += '</p>';
        html += '</div>';

        // 显示对话框
        var dialog = window.dialog({
            id: 'plugin-drawtools-coordinates',
            title: 'DrawTools Coordinates',
            html: html,
            width: 600,
            height: 'auto',
            dialogClass: 'ui-dialog-drawtools-coords'
        });

        // // 添加选中全部文本的功能
        // $('#drawtools-coords-textarea').click(function() {
        //     this.select();
        // });
    };

    // 添加工具栏按钮
    self.addToolbarButton = function() {
        // 使用 IITC.toolbox API 添加按钮
        if (window.IITC && window.IITC.toolbox) {
            IITC.toolbox.addButton({
                label: 'DT Coords',
                title: 'Show DrawTools Coordinates',
                action: self.showDialog
            });
        } else {
            // 旧版本 IITC 的兼容方式
            $('#toolbox').append(' <a onclick="window.plugin.drawToolsCoordinates.showDialog()" title="Show DrawTools Coordinates">DT Coords</a>');
        }
    };

    // 初始化插件
    self.init = function() {
        // 检查 DrawTools 插件是否存在
        if (!window.plugin.drawTools) {
            console.warn('DrawTools Coordinates: DrawTools plugin not found. This plugin requires DrawTools to work.');
            // 延迟重试，因为 DrawTools 可能还没加载完成
            setTimeout(function() {
                if (window.plugin.drawTools) {
                    self.addToolbarButton();
                    console.log('DrawTools Coordinates: Plugin loaded successfully');
                } else {
                    console.error('DrawTools Coordinates: DrawTools plugin is required but not found');
                }
            }, 2000);
        } else {
            self.addToolbarButton();
            console.log('DrawTools Coordinates: Plugin loaded successfully');
        }

        // 添加自定义样式
        $('<style>').html(
            '.ui-dialog-drawtools-coords { max-width: 90% !important; }' +
            '.ui-dialog-drawtools-coords .ui-dialog-content { padding: 15px !important; }'
        ).appendTo('head');
    };

    // 设置函数
    function setup() {
        // 等待 IITC 加载完成
        window.addHook('iitcLoaded', self.init);
    }

    // 添加插件信息
    setup.info = plugin_info;

    // 添加到启动钩子
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);

    // 如果 IITC 已经加载，立即运行设置
    if (window.iitcLoaded && typeof setup === 'function') setup();
}

// 创建脚本元素
var script = document.createElement('script');
var info = {};

// GM_info 由各种浏览器扩展定义
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}

// 创建文本节点和 IIFE
var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
script.appendChild(textContent);
// 注入脚本
(document.body || document.head || document.documentElement).appendChild(script);
