type AddressMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type AddressMapProps = {
  center: AddressMapCoordinate;
  pin: AddressMapCoordinate;
  onPinChange: (coordinate: AddressMapCoordinate) => void;
};

type MapMessage =
  | { type: 'ready' }
  | { type: 'pinChange'; latitude: number; longitude: number };

const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function createMapHtml(center: AddressMapCoordinate, pin: AddressMapCoordinate) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: #e8f3f8; }
      #error {
        display: none;
        position: absolute;
        inset: 0;
        z-index: 10;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        color: #075783;
        background: #e8f3f8;
        font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
        text-align: center;
      }
      .maplibregl-ctrl-attrib { font-size: 9px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="error" role="status">Map unavailable. Go back to try again or enter the address manually.</div>
    <script>
      function sendToApp(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else if (window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
      }

      function showMapError() {
        document.getElementById('error').style.display = 'flex';
      }
    </script>
    <script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js" onerror="showMapError()"></script>
    <script>
      if (window.parent !== window) {
        window.addEventListener('message', function (event) {
          const position = event.data;
          if (event.source !== window.parent || position?.type !== 'addressMapPosition') return;
          const coordinates = [position.centerLng, position.centerLat, position.pinLng, position.pinLat];
          if (coordinates.every(Number.isFinite)) window.setAddressMapPosition?.(...coordinates);
        });
      }

      try {
        if (!window.maplibregl) throw new Error('MapLibre GL JS did not load');

        const map = new maplibregl.Map({
          container: 'map',
          style: '${OPENFREEMAP_LIBERTY_STYLE}',
          center: [${center.longitude}, ${center.latitude}],
          zoom: 15,
          attributionControl: true,
          dragRotate: false,
          pitchWithRotate: false
        });

        map.touchZoomRotate.disableRotation();
        if (window.ResizeObserver) new ResizeObserver(() => map.resize()).observe(document.getElementById('map'));

        const marker = new maplibregl.Marker({ color: '#087eb9', draggable: true })
          .setLngLat([${pin.longitude}, ${pin.latitude}])
          .addTo(map);

        function publishPin(coordinate) {
          sendToApp({
            type: 'pinChange',
            latitude: coordinate.lat,
            longitude: coordinate.lng
          });
        }

        map.on('click', function (event) {
          marker.setLngLat(event.lngLat);
          publishPin(event.lngLat);
        });

        marker.on('dragend', function () {
          publishPin(marker.getLngLat());
        });

        const loadTimeout = setTimeout(showMapError, 12000);
        map.on('load', function () {
          clearTimeout(loadTimeout);
          document.getElementById('error').style.display = 'none';
          map.resize();
          sendToApp({ type: 'ready' });
        });

        let lastCenter = [${center.longitude}, ${center.latitude}];
        window.setAddressMapPosition = function (centerLng, centerLat, pinLng, pinLat) {
          const currentPin = marker.getLngLat();
          if (currentPin.lng !== pinLng || currentPin.lat !== pinLat) marker.setLngLat([pinLng, pinLat]);
          if (lastCenter[0] !== centerLng || lastCenter[1] !== centerLat) {
            lastCenter = [centerLng, centerLat];
            map.easeTo({ center: lastCenter, zoom: 15, duration: 350 });
          }
        };
      } catch (error) {
        showMapError();
      }
    </script>
  </body>
</html>`;
}

export function isMapMessage(value: unknown): value is MapMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const message = value as { type?: unknown; latitude?: unknown; longitude?: unknown };

  if (message.type === 'ready') return true;
  return message.type === 'pinChange'
    && typeof message.latitude === 'number'
    && Number.isFinite(message.latitude)
    && typeof message.longitude === 'number'
    && Number.isFinite(message.longitude);
}
