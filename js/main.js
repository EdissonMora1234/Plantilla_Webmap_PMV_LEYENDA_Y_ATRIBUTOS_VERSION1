document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([4.664628, -74.064095], 18);

    // Agregar capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 21 }).addTo(map);

    // Configuración de las capas WMS
    var wmsLayers = [
        { url: 'https://geoserver.scrd.gov.co/geoserver/Investigacion_Cultured_Maps/wms', layerName: 'Investigacion_Cultured_Maps:Localidad_Storymap_RolMujer', displayName: 'Localidad Rol Mujer' },
        { url: 'https://geoserver.scrd.gov.co/geoserver/Investigacion_Cultured_Maps/wms', layerName: 'Investigacion_Cultured_Maps:Actores_BasuraNoPaisaje', displayName: 'Actores' },
        { url: 'https://geoserver.scrd.gov.co/geoserver/Investigacion_Cultured_Maps/wms', layerName: 'Investigacion_Cultured_Maps:Residuos_BasuraNoPaisaje', displayName: 'Residuos' },
        { url: 'https://geoserver.scrd.gov.co/geoserver/Investigacion_Cultured_Maps/wms', layerName: 'Investigacion_Cultured_Maps:Escenarios_BasuraNoPaisaje', displayName: 'Escenarios' }
    ];

    var overlays = {}, activeLayers = [];

    // Inicializar capas WMS y el control de capas
    function setupWMSLayers() {
        wmsLayers.forEach(function(wmsLayer) {
            var layer = L.tileLayer.wms(wmsLayer.url, {
                layers: wmsLayer.layerName,
                format: 'image/png',
                transparent: true,
                maxZoom: 21
            });
            overlays[wmsLayer.displayName] = layer;
            layer.addTo(map);
            addLegendItem(wmsLayer.url, wmsLayer.layerName, wmsLayer.displayName);

            map.on('overlayadd', updateActiveLayers);
            map.on('overlayremove', updateActiveLayers);
        });
        L.control.layers(null, overlays, { collapsed: false }).addTo(map);
    }

    // Función para agregar elementos a la leyenda
    function addLegendItem(wmsUrl, layerName, displayName) {
        var legendUrl = `${wmsUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}`;
        var legendContainer = document.getElementById('legend-content');

        var legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `<div class="legend-title">${displayName}</div><img src="${legendUrl}" alt="Leyenda de ${displayName}">`;
        legendContainer.appendChild(legendItem);
    }

    // Función para actualizar la leyenda según las capas activas
    function updateLegend() {
        var legendContainer = document.getElementById('legend-content');
        legendContainer.innerHTML = ''; // Limpiar contenido actual

        activeLayers.forEach(layer => {
            const wmsLayer = wmsLayers.find(w => w.layerName === layer.options.layers);
            if (wmsLayer) addLegendItem(wmsLayer.url, wmsLayer.layerName, wmsLayer.displayName);
        });
    }

    // Función para actualizar lista de capas activas y el panel de atributos
    function updateActiveLayers() {
        activeLayers = Object.values(overlays).filter(layer => map.hasLayer(layer));
        updateLegend();
        updateAttributesPanel();
    }

    // Función para actualizar el panel de atributos
    function updateAttributesPanel() {
        var attributesContent = document.getElementById('attributes-content');
        attributesContent.innerHTML = ''; // Limpiar el contenido anterior

        if (activeLayers.length > 0) {
            var tabContainer = document.createElement('div');
            tabContainer.className = 'tab-container';

            activeLayers.forEach(layer => {
                var tabButton = document.createElement('button');
                tabButton.className = 'tab-button';
                tabButton.innerText = wmsLayers.find(w => w.layerName === layer.options.layers).displayName;
                tabButton.onclick = () => showAttributes(layer); // Mostrar atributos de la capa seleccionada
                tabContainer.appendChild(tabButton);
            });
            attributesContent.appendChild(tabContainer);

            showAttributes(activeLayers[0]); // Mostrar atributos de la primera capa activa
        } else {
            attributesContent.innerHTML = '<p>No hay capas activas para mostrar atributos.</p>';
        }
    }

    // Función para mostrar los atributos completos de una capa específica
    async function showAttributes(layer) {
        var attributesContent = document.getElementById('attributes-content');
        attributesContent.innerHTML = ''; // Limpiar contenido previo

        var displayName = wmsLayers.find(w => w.layerName === layer.options.layers).displayName;
        attributesContent.innerHTML = `<p><strong>Atributos de la capa:</strong> ${displayName}</p>`;

        var url = `${layer._url}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layer.options.layers}&outputFormat=application/json`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                var table = document.createElement('table');
                table.className = 'attributes-table';

                var headerRow = document.createElement('tr');
                Object.keys(data.features[0].properties).forEach(key => {
                    var headerCell = document.createElement('th');
                    headerCell.innerText = key;
                    headerRow.appendChild(headerCell);
                });
                table.appendChild(headerRow);

                data.features.forEach(feature => {
                    var row = document.createElement('tr');
                    Object.values(feature.properties).forEach(value => {
                        var cell = document.createElement('td');
                        cell.innerText = value;
                        row.appendChild(cell);
                    });
                    table.appendChild(row);
                });

                attributesContent.appendChild(table);
            } else {
                attributesContent.innerHTML += '<p>No hay datos disponibles para esta capa.</p>';
            }
        } catch (error) {
            console.error('Error al obtener atributos:', error);
            attributesContent.innerHTML = '<p>Error al obtener los datos de la capa.</p>';
        }
    }

    // Función para manejar clics en el mapa y mostrar popup con GetFeatureInfo
    map.on('click', function(e) {
        var wmsUrl = 'https://geoserver.scrd.gov.co/geoserver/Investigacion_Cultured_Maps/wms';
        var url = wmsUrl + L.Util.getParamString({
            request: 'GetFeatureInfo',
            service: 'WMS',
            srs: 'EPSG:4326',
            styles: '',
            version: '1.1.1',
            format: 'image/png',
            transparent: true,
            bbox: map.getBounds().toBBoxString(),
            height: map.getSize().y,
            width: map.getSize().x,
            layers: wmsLayers.map(layer => layer.layerName).join(','),
            query_layers: wmsLayers.map(layer => layer.layerName).join(','),
            info_format: 'application/json',
            x: Math.floor(e.containerPoint.x),
            y: Math.floor(e.containerPoint.y)
        });

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    var props = data.features[0].properties;
                    var content = Object.entries(props).map(([key, value]) => `<b>${key}</b>: ${value}`).join('<br>');
                    L.popup().setLatLng(e.latlng).setContent(content).openOn(map);
                } else {
                    L.popup().setLatLng(e.latlng).setContent('No hay información disponible en este punto.').openOn(map);
                }
            })
            .catch(error => console.error('Error al obtener los atributos:', error));
    });

    // Función para minimizar/desplegar la leyenda
    document.getElementById('toggle-legend').addEventListener('click', function() {
        var legend = document.getElementById('legend');
        legend.classList.toggle('minimized');
        this.textContent = legend.classList.contains('minimized') ? 'Desplegar' : 'Minimizar';
    });

    // Función para minimizar/desplegar el panel de atributos
    document.getElementById('toggle-attributes').addEventListener('click', function() {
        var attributesPanel = document.getElementById('attributes-panel');
        attributesPanel.classList.toggle('minimized');
        this.textContent = attributesPanel.classList.contains('minimized') ? 'Desplegar' : 'Minimizar';
    });

    // Inicializar capas y eventos
    setupWMSLayers();
    updateActiveLayers();
});
