"""Refresh the local map from official contours; Granville uses its town centre."""
import json
from pathlib import Path
from urllib.request import urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2026/geojson/departements-100m.geojson'
MAP = ROOT / 'site/assets/secteur-intervention.svg'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)

def project(lon, lat):
    # Same map extent and projection as the approved first version.
    return 175.77282420810965 * lon + 441.82760610427897, -267.93113612540856 * lat + 13368.141712140836

def ring_area(ring):
    return abs(sum(a[0]*b[1] - b[0]*a[1] for a, b in zip(ring, ring[1:])))

def refresh(features):
    root = ET.fromstring(MAP.read_text())
    lands = [el for el in root if el.get('class') == 'land']
    by_code = {f['properties']['code']: f for f in features}
    for code, el in zip(('14', '50'), lands):
        feature = by_code[code]
        polygons = feature['geometry']['coordinates']
        if feature['geometry']['type'] == 'Polygon':
            polygons = [polygons]
        # Keep the mainland silhouette at this scale. Avoid joining island rings.
        ring = max(polygons, key=lambda polygon: ring_area(polygon[0]))[0]
        points = [project(lon, lat) for lon, lat in ring]
        el.set('id', 'department-' + code)
        el.set('d', 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in points) + 'Z')

    # Official API Géo for the first three towns. For Granville, the commune's
    # geographic centre lies offshore; use the Cours Jonville town-centre point:
    # https://www.ville-granville.fr/locations/centre-ville/
    places = {
        'Périers': (-1.4136, 49.1929),
        'Valognes': (-1.4758, 49.5122),
        'Saint-Lô': (-1.0812, 49.1123),
        'Granville': (-1.5965029, 48.8379787),
    }
    pins = [el for el in root if el.tag == f'{{{NS}}}circle' and el.get('stroke') == '#23435d']
    for (name, (lon, lat)), pin in zip(places.items(), pins):
        x, y = project(lon, lat)
        pin.set('cx', f'{x:.2f}'); pin.set('cy', f'{y:.2f}')
        pin.set('data-city', name)
        pin.set('data-longitude', str(lon)); pin.set('data-latitude', str(lat))
    texts = {el.text: el for el in root if el.get('class') == 'place'}
    for name, (lon, lat) in places.items():
        x, y = project(lon, lat)
        texts[name].set('x', f'{x - 14 if name == "Granville" else x + 13:.2f}')
        texts[name].set('y', f'{y + 5 if name == "Granville" else y + (3 if name != "Périers" else -9):.2f}')
    start = project(*places['Périers'])
    routes = [el for el in root if el.get('class') == 'route']
    for name, route in zip(('Valognes', 'Saint-Lô', 'Granville'), routes):
        x, y = project(*places[name])
        control_x = (start[0] + x) / 2 + 18
        control_y = (start[1] + y) / 2
        route.set('d', f'M{start[0]:.2f} {start[1]:.2f} Q{control_x:.2f} {control_y:.2f} {x:.2f} {y:.2f}')
    MAP.write_text(ET.tostring(root, encoding='unicode') + '\n')
    print('Map refreshed: 100 m mainland contours; Granville at Cours Jonville.')

if __name__ == '__main__':
    with urlopen(SOURCE, timeout=30) as response:
        refresh(json.load(response)['features'])
